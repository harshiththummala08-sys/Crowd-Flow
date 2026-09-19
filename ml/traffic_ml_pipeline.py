"""CrowdFlow ML training and prediction pipeline.

The prototype dashboard uses a deterministic simulator so it can run anywhere.
This module adds a real, reproducible ML workflow for presentation and Colab:

- download a public traffic dataset
- clean and preprocess records
- engineer temporal, weather, and lag features
- train regression and classification models
- report cross-validation and holdout metrics
- save prediction artifacts
"""

from __future__ import annotations

import json
import math
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.request import urlretrieve

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, SGDClassifier, SGDRegressor
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DATASET_URL = "https://archive.ics.uci.edu/static/public/492/metro+interstate+traffic+volume.zip"
DATASET_CSV = "Metro_Interstate_Traffic_Volume.csv"
DATASET_CSV_GZ = f"{DATASET_CSV}.gz"
RANDOM_STATE = 42


@dataclass(frozen=True)
class ModelBundle:
    regression_model: Pipeline
    classification_model: Pipeline
    feature_columns: list[str]
    congestion_threshold: float
    metrics: dict[str, Any]


def download_dataset(data_dir: str | Path = "data/raw") -> Path:
    """Download and extract the UCI Metro Interstate Traffic Volume dataset."""
    data_dir = Path(data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    csv_path = data_dir / DATASET_CSV
    csv_gz_path = data_dir / DATASET_CSV_GZ
    if csv_path.exists():
        return csv_path
    if csv_gz_path.exists():
        return csv_gz_path

    zip_path = data_dir / "metro_interstate_traffic_volume.zip"
    urlretrieve(DATASET_URL, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        if DATASET_CSV in names:
            archive.extract(DATASET_CSV, data_dir)
            return csv_path
        if DATASET_CSV_GZ in names:
            archive.extract(DATASET_CSV_GZ, data_dir)
            return csv_gz_path
        raise FileNotFoundError(f"Could not find {DATASET_CSV} or {DATASET_CSV_GZ} in downloaded zip")


def make_fallback_dataset(rows: int = 24 * 90) -> pd.DataFrame:
    """Create a deterministic traffic-like dataset when the download is unavailable."""
    rng = np.random.default_rng(RANDOM_STATE)
    date_time = pd.date_range("2025-01-01", periods=rows, freq="h")
    hour = date_time.hour.to_numpy()
    weekday = date_time.weekday.to_numpy()
    rush = (((hour >= 7) & (hour <= 9)) | ((hour >= 16) & (hour <= 18))).astype(float)
    weekend = (weekday >= 5).astype(float)
    weather_main = rng.choice(["Clear", "Clouds", "Rain", "Snow", "Mist"], size=rows, p=[0.45, 0.28, 0.12, 0.05, 0.10])
    weather_penalty = pd.Series(weather_main).map({"Clear": 0, "Clouds": 180, "Mist": 260, "Rain": 420, "Snow": 650}).to_numpy()
    seasonal = 350 * np.sin(2 * np.pi * date_time.dayofyear / 365)
    traffic_volume = 2100 + 1750 * rush - 550 * weekend - weather_penalty + seasonal + rng.normal(0, 260, rows)
    traffic_volume = np.clip(traffic_volume, 150, 7200).round().astype(int)
    return pd.DataFrame(
        {
            "holiday": "None",
            "temp": rng.normal(286, 9, rows),
            "rain_1h": np.where(weather_main == "Rain", rng.gamma(1.4, 1.2, rows), 0.0),
            "snow_1h": np.where(weather_main == "Snow", rng.gamma(1.2, 0.5, rows), 0.0),
            "clouds_all": rng.integers(0, 100, rows),
            "weather_main": weather_main,
            "weather_description": weather_main,
            "date_time": date_time,
            "traffic_volume": traffic_volume,
        }
    )


def load_dataset(data_dir: str | Path = "data/raw", fallback: bool = True) -> pd.DataFrame:
    try:
        csv_path = download_dataset(data_dir)
        return pd.read_csv(csv_path)
    except Exception:
        if not fallback:
            raise
        return make_fallback_dataset()


def clean_traffic_data(raw: pd.DataFrame) -> pd.DataFrame:
    """Normalize types, remove bad rows, and add clear base columns."""
    df = raw.copy()
    df["date_time"] = pd.to_datetime(df["date_time"], errors="coerce")
    df = df.dropna(subset=["date_time", "traffic_volume"]).drop_duplicates()
    df = df.sort_values("date_time").reset_index(drop=True)

    numeric_columns = ["temp", "rain_1h", "snow_1h", "clouds_all", "traffic_volume"]
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df["traffic_volume"] = df["traffic_volume"].clip(lower=0)
    df["temp_c"] = df["temp"] - 273.15
    df.loc[(df["temp_c"] < -60) | (df["temp_c"] > 60), "temp_c"] = np.nan
    df["rain_1h"] = df["rain_1h"].clip(lower=0, upper=df["rain_1h"].quantile(0.995))
    df["snow_1h"] = df["snow_1h"].clip(lower=0, upper=df["snow_1h"].quantile(0.995))
    df["clouds_all"] = df["clouds_all"].clip(lower=0, upper=100)
    df["holiday"] = df["holiday"].fillna("None").replace("", "None")
    df["weather_main"] = df["weather_main"].fillna("Unknown")
    df["weather_description"] = df["weather_description"].fillna("Unknown")
    return df


def engineer_features(clean: pd.DataFrame) -> pd.DataFrame:
    """Build time, cyclic, weather severity, lag, and rolling features."""
    df = clean.copy()
    dt = df["date_time"]
    df["hour"] = dt.dt.hour
    df["day_of_week"] = dt.dt.dayofweek
    df["month"] = dt.dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_rush_hour"] = df["hour"].isin([7, 8, 9, 16, 17, 18]).astype(int)
    df["is_holiday"] = (df["holiday"] != "None").astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["day_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    severe_weather = {"Thunderstorm", "Squall", "Tornado", "Snow", "Rain", "Drizzle", "Fog", "Mist"}
    df["weather_severity"] = df["weather_main"].isin(severe_weather).astype(int)

    for lag in [1, 2, 3, 6, 12, 24]:
        df[f"traffic_lag_{lag}h"] = df["traffic_volume"].shift(lag)
    df["traffic_roll_mean_3h"] = df["traffic_volume"].shift(1).rolling(3).mean()
    df["traffic_roll_mean_6h"] = df["traffic_volume"].shift(1).rolling(6).mean()
    df["traffic_roll_std_6h"] = df["traffic_volume"].shift(1).rolling(6).std()
    df["target_next_hour_volume"] = df["traffic_volume"].shift(-1)

    df = df.dropna(subset=["target_next_hour_volume", "traffic_lag_24h", "traffic_roll_std_6h"]).reset_index(drop=True)
    threshold = df["target_next_hour_volume"].quantile(0.75)
    df["target_congested_next_hour"] = (df["target_next_hour_volume"] >= threshold).astype(int)
    return df


def get_feature_columns(df: pd.DataFrame) -> tuple[list[str], list[str], list[str]]:
    numeric_features = [
        "temp_c",
        "rain_1h",
        "snow_1h",
        "clouds_all",
        "hour",
        "day_of_week",
        "month",
        "is_weekend",
        "is_rush_hour",
        "is_holiday",
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        "month_sin",
        "month_cos",
        "weather_severity",
        "traffic_lag_1h",
        "traffic_lag_2h",
        "traffic_lag_3h",
        "traffic_lag_6h",
        "traffic_lag_12h",
        "traffic_lag_24h",
        "traffic_roll_mean_3h",
        "traffic_roll_mean_6h",
        "traffic_roll_std_6h",
    ]
    categorical_features = ["holiday", "weather_main", "weather_description"]
    feature_columns = [column for column in numeric_features + categorical_features if column in df.columns]
    return feature_columns, numeric_features, categorical_features


def build_preprocessor(numeric_features: list[str], categorical_features: list[str]) -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=20)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_features),
            ("cat", categorical_pipeline, categorical_features),
        ]
    )


def train_test_split_time(df: pd.DataFrame, test_fraction: float = 0.2) -> tuple[pd.DataFrame, pd.DataFrame]:
    split_index = int(len(df) * (1 - test_fraction))
    return df.iloc[:split_index].copy(), df.iloc[split_index:].copy()


def _regression_metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(math.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
        "mape": float(mean_absolute_percentage_error(y_true, y_pred)),
    }


def _classification_metrics(y_true: pd.Series, y_pred: np.ndarray, y_score: np.ndarray) -> dict[str, Any]:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_score)),
        "pr_auc": float(average_precision_score(y_true, y_score)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": classification_report(y_true, y_pred, output_dict=True, zero_division=0),
    }


def fit_models(df: pd.DataFrame) -> ModelBundle:
    feature_columns, numeric_features, categorical_features = get_feature_columns(df)
    train_df, test_df = train_test_split_time(df)
    X_train = train_df[feature_columns]
    X_test = test_df[feature_columns]
    y_reg_train = train_df["target_next_hour_volume"]
    y_reg_test = test_df["target_next_hour_volume"]
    y_cls_train = train_df["target_congested_next_hour"]
    y_cls_test = test_df["target_congested_next_hour"]

    preprocessor = build_preprocessor(numeric_features, categorical_features)
    regression_candidates: dict[str, Pipeline] = {
        "linear_regression": Pipeline([("preprocess", preprocessor), ("model", LinearRegression())]),
        "sgd_regressor_gradient_descent": Pipeline(
            [("preprocess", preprocessor), ("model", SGDRegressor(max_iter=2500, tol=1e-3, random_state=RANDOM_STATE))]
        ),
        "random_forest_regressor": Pipeline(
            [("preprocess", preprocessor), ("model", RandomForestRegressor(n_estimators=180, max_depth=14, random_state=RANDOM_STATE, n_jobs=-1))]
        ),
        "gradient_boosting_regressor": Pipeline(
            [("preprocess", preprocessor), ("model", GradientBoostingRegressor(random_state=RANDOM_STATE))]
        ),
    }

    reg_results: dict[str, dict[str, float]] = {}
    best_reg_name = ""
    best_reg_score = float("inf")
    best_reg_model: Pipeline | None = None
    for name, model in regression_candidates.items():
        model.fit(X_train, y_reg_train)
        prediction = model.predict(X_test)
        scores = _regression_metrics(y_reg_test, prediction)
        reg_results[name] = scores
        if scores["rmse"] < best_reg_score:
            best_reg_score = scores["rmse"]
            best_reg_name = name
            best_reg_model = model

    classification_candidates: dict[str, Pipeline] = {
        "logistic_regression": Pipeline([("preprocess", preprocessor), ("model", LogisticRegression(max_iter=1200, random_state=RANDOM_STATE))]),
        "sgd_classifier_linear_gradient_descent": Pipeline(
            [("preprocess", preprocessor), ("model", SGDClassifier(loss="log_loss", max_iter=2500, tol=1e-3, random_state=RANDOM_STATE))]
        ),
        "random_forest_classifier": Pipeline(
            [("preprocess", preprocessor), ("model", RandomForestClassifier(n_estimators=220, max_depth=14, random_state=RANDOM_STATE, n_jobs=-1))]
        ),
        "gradient_boosting_classifier": Pipeline(
            [("preprocess", preprocessor), ("model", GradientBoostingClassifier(random_state=RANDOM_STATE))]
        ),
    }

    cls_results: dict[str, dict[str, Any]] = {}
    best_cls_name = ""
    best_cls_score = -1.0
    best_cls_model: Pipeline | None = None
    for name, model in classification_candidates.items():
        model.fit(X_train, y_cls_train)
        prediction = model.predict(X_test)
        if hasattr(model, "predict_proba"):
            score = model.predict_proba(X_test)[:, 1]
        else:
            score = model.decision_function(X_test)
        scores = _classification_metrics(y_cls_test, prediction, score)
        cls_results[name] = scores
        if scores["f1"] > best_cls_score:
            best_cls_score = scores["f1"]
            best_cls_name = name
            best_cls_model = model

    assert best_reg_model is not None
    assert best_cls_model is not None

    tscv = TimeSeriesSplit(n_splits=5)
    reg_cv = cross_validate(
        best_reg_model,
        df[feature_columns],
        df["target_next_hour_volume"],
        cv=tscv,
        scoring={"mae": "neg_mean_absolute_error", "r2": "r2"},
        n_jobs=-1,
    )
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cls_cv = cross_validate(
        best_cls_model,
        df[feature_columns],
        df["target_congested_next_hour"],
        cv=skf,
        scoring={"accuracy": "accuracy", "precision": "precision", "recall": "recall", "f1": "f1", "roc_auc": "roc_auc"},
        n_jobs=-1,
    )

    metrics = {
        "dataset_rows": int(len(df)),
        "feature_count": int(len(feature_columns)),
        "congestion_threshold": float(df["target_next_hour_volume"].quantile(0.75)),
        "best_regression_model": best_reg_name,
        "best_classification_model": best_cls_name,
        "regression_holdout": reg_results,
        "classification_holdout": cls_results,
        "cross_validation": {
            "regression_best_model": {
                "mae_mean": float(-reg_cv["test_mae"].mean()),
                "mae_std": float(reg_cv["test_mae"].std()),
                "r2_mean": float(reg_cv["test_r2"].mean()),
                "r2_std": float(reg_cv["test_r2"].std()),
            },
            "classification_best_model": {
                "accuracy_mean": float(cls_cv["test_accuracy"].mean()),
                "accuracy_std": float(cls_cv["test_accuracy"].std()),
                "precision_mean": float(cls_cv["test_precision"].mean()),
                "precision_std": float(cls_cv["test_precision"].std()),
                "recall_mean": float(cls_cv["test_recall"].mean()),
                "recall_std": float(cls_cv["test_recall"].std()),
                "f1_mean": float(cls_cv["test_f1"].mean()),
                "f1_std": float(cls_cv["test_f1"].std()),
                "roc_auc_mean": float(cls_cv["test_roc_auc"].mean()),
                "roc_auc_std": float(cls_cv["test_roc_auc"].std()),
            },
        },
    }
    return ModelBundle(
        regression_model=best_reg_model,
        classification_model=best_cls_model,
        feature_columns=feature_columns,
        congestion_threshold=metrics["congestion_threshold"],
        metrics=metrics,
    )


def save_artifacts(bundle: ModelBundle, output_dir: str | Path = "artifacts/ml") -> Path:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle.regression_model, output_dir / "traffic_volume_regressor.joblib")
    joblib.dump(bundle.classification_model, output_dir / "congestion_classifier.joblib")
    (output_dir / "feature_columns.json").write_text(json.dumps(bundle.feature_columns, indent=2), encoding="utf-8")
    (output_dir / "metrics.json").write_text(json.dumps(bundle.metrics, indent=2), encoding="utf-8")
    return output_dir


def load_artifacts(model_dir: str | Path = "artifacts/ml") -> ModelBundle:
    model_dir = Path(model_dir)
    regression_model = joblib.load(model_dir / "traffic_volume_regressor.joblib")
    classification_model = joblib.load(model_dir / "congestion_classifier.joblib")
    feature_columns = json.loads((model_dir / "feature_columns.json").read_text(encoding="utf-8"))
    metrics = json.loads((model_dir / "metrics.json").read_text(encoding="utf-8"))
    return ModelBundle(
        regression_model=regression_model,
        classification_model=classification_model,
        feature_columns=feature_columns,
        congestion_threshold=float(metrics["congestion_threshold"]),
        metrics=metrics,
    )


def predict_next_hour(bundle: ModelBundle, feature_row: pd.DataFrame | dict[str, Any]) -> dict[str, float | bool]:
    """Predict next-hour traffic volume and congestion for one engineered feature row."""
    if isinstance(feature_row, dict):
        frame = pd.DataFrame([feature_row])
    else:
        frame = feature_row.copy()
    frame = frame[bundle.feature_columns]
    volume = float(bundle.regression_model.predict(frame)[0])
    congestion_probability = float(bundle.classification_model.predict_proba(frame)[0, 1])
    return {
        "predicted_next_hour_volume": round(volume, 2),
        "congestion_probability": round(congestion_probability, 4),
        "is_congested": bool(congestion_probability >= 0.5),
    }


def train_from_raw(data_dir: str | Path = "data/raw", artifact_dir: str | Path = "artifacts/ml") -> ModelBundle:
    raw = load_dataset(data_dir)
    clean = clean_traffic_data(raw)
    features = engineer_features(clean)
    bundle = fit_models(features)
    save_artifacts(bundle, artifact_dir)
    return bundle


if __name__ == "__main__":
    bundle = train_from_raw()
    print(json.dumps(bundle.metrics, indent=2))
