"""Example prediction script for trained CrowdFlow ML artifacts."""

from __future__ import annotations

import json
from pathlib import Path

try:
    from traffic_ml_pipeline import clean_traffic_data, engineer_features, load_artifacts, load_dataset, predict_next_hour
except ImportError:
    from ml.traffic_ml_pipeline import clean_traffic_data, engineer_features, load_artifacts, load_dataset, predict_next_hour


def main() -> None:
    artifact_dir = Path("artifacts/ml")
    if not artifact_dir.exists():
        raise SystemExit("Train first with: python ml/traffic_ml_pipeline.py")

    bundle = load_artifacts(artifact_dir)
    raw = load_dataset("data/raw")
    model_df = engineer_features(clean_traffic_data(raw))
    latest_row = model_df[bundle.feature_columns].tail(1)
    prediction = predict_next_hour(bundle, latest_row)
    print(json.dumps(prediction, indent=2))


if __name__ == "__main__":
    main()
