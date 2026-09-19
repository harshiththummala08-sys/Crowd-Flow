# CrowdFlow ML Workflow

This folder contains the real machine-learning workflow for the CrowdFlow prototype. The dashboard remains a clean simulation demo, while this ML layer gives the project the training code, metrics, graphs, and prediction artifacts needed for the hackathon presentation.

## Dataset

The notebook downloads the UCI Metro Interstate Traffic Volume dataset:

`https://archive.ics.uci.edu/static/public/492/metro+interstate+traffic+volume.zip`

It contains hourly traffic volume, weather, holiday, and timestamp features. The training code also includes a deterministic fallback dataset so the Colab notebook can still run during a demo if the public dataset host is unavailable.

## Pipeline

1. **Data cleaning**
   - Parse timestamps.
   - Remove duplicated/bad rows.
   - Normalize numeric values.
   - Convert temperature from Kelvin to Celsius.
   - Clip invalid rain, snow, cloud, and traffic values.

2. **Preprocessing**
   - Median-impute numeric features.
   - Most-frequent-impute categorical features.
   - Scale numeric features with `StandardScaler`.
   - Encode categorical features with `OneHotEncoder`.

3. **Feature engineering**
   - Hour, day, month, weekend, holiday, and rush-hour features.
   - Cyclic encodings: hour/day/month sine and cosine.
   - Weather severity flag.
   - Traffic lag features: 1h, 2h, 3h, 6h, 12h, 24h.
   - Rolling traffic mean/std features.

4. **Prediction tasks**
   - Regression: predict next-hour traffic volume.
   - Classification: predict whether next-hour traffic is congested.

5. **Algorithms**
   - Linear Regression baseline.
   - SGD Regressor and SGD Classifier to show gradient-descent learning.
   - Logistic Regression for congestion classification.
   - Random Forest for non-linear feature interactions.
   - Gradient Boosting for boosted decision-tree performance.

6. **Metrics**
   - Regression: MAE, RMSE, R2, MAPE.
   - Classification: accuracy, precision, recall, F1 score, ROC-AUC, PR-AUC, confusion matrix.
   - Cross-validation: `TimeSeriesSplit` for traffic-volume regression and `StratifiedKFold` for congestion classification.

## Run Locally

From the repository root:

```bash
python -m pip install -r backend/requirements.txt
python ml/traffic_ml_pipeline.py
```

The trained artifacts are written to `artifacts/ml/`:

- `traffic_volume_regressor.joblib`
- `congestion_classifier.joblib`
- `feature_columns.json`
- `metrics.json`

These generated artifacts are intentionally not required for the frontend prototype. They are for model development, Colab, and presentation material.

## Open In Colab

Use this notebook:

`notebooks/CrowdFlow_ML_Model_Training.ipynb`

After pushing to GitHub, it can be opened with:

`https://colab.research.google.com/github/harshiththummala08-sys/Crowd-Flow/blob/main/notebooks/CrowdFlow_ML_Model_Training.ipynb`
