from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ------------------------------------------------------------
# File paths
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parent

INPUT_FILE = ROOT / "longitudinal_training_data.csv"
PREDICTIONS_FILE = ROOT / "random_forest_predictions.csv"
IMPORTANCE_FILE = ROOT / "random_forest_feature_importance.csv"
METRICS_FILE = ROOT / "random_forest_metrics.csv"


def main():
    # --------------------------------------------------------
    # Load and validate dataset
    # --------------------------------------------------------
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset was not found: {INPUT_FILE}"
        )

    data = pd.read_csv(INPUT_FILE)

    target = "future_anc_7d"
    group_column = "patient_id"

    required_columns = {
        target,
        group_column,
        "current_anc",
        "maintenance_day",
    }

    missing_required = required_columns.difference(data.columns)

    if missing_required:
        raise ValueError(
            "The dataset is missing required columns: "
            f"{sorted(missing_required)}"
        )

    # Features available at prediction time only.
    # Future variables are intentionally excluded.
    feature_columns = [
        "age",
        "sex",
        "weight_kg",
        "height_cm",
        "bsa",
        "tpmt",
        "vitamin_d",
        "diet_score",
        "exercise_score",
        "infection",
        "baseline_inflammation",
        "maintenance_week",
        "current_wbc",
        "current_anc",
        "current_vipn",
        "previous_anc",
        "anc_slope_7d",
        "dose_6mp_mg",
        "dose_mtx_mg",
        "dose_vcr_mg",
    ]

    # Keep only features that genuinely exist in the dataset.
    feature_columns = [
        column
        for column in feature_columns
        if column in data.columns
    ]

    if not feature_columns:
        raise ValueError(
            "No valid model features were found in the dataset."
        )

    X = data[feature_columns].copy()
    y = data[target].copy()
    groups = data[group_column].copy()

    # --------------------------------------------------------
    # Patient-level train/test split
    # --------------------------------------------------------
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_indices, test_indices = next(
        splitter.split(X, y, groups=groups)
    )

    # Explicit leakage check.
    train_patients = set(groups.iloc[train_indices])
    test_patients = set(groups.iloc[test_indices])

    overlap = train_patients.intersection(test_patients)

    if overlap:
        raise RuntimeError(
            f"Patient leakage detected: {sorted(overlap)}"
        )

    print(
        "Patient overlap between train and test: "
        f"{len(overlap)}"
    )

    X_train = X.iloc[train_indices].copy()
    X_test = X.iloc[test_indices].copy()

    y_train = y.iloc[train_indices].copy()
    y_test = y.iloc[test_indices].copy()

    test_metadata = data.iloc[test_indices][
        [
            "patient_id",
            "maintenance_day",
            "current_anc",
        ]
    ].copy()

    # --------------------------------------------------------
    # Preprocessing
    # --------------------------------------------------------
    categorical_features = [
        column
        for column in ["sex"]
        if column in feature_columns
    ]

    numerical_features = [
        column
        for column in feature_columns
        if column not in categorical_features
    ]

    numerical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="most_frequent"
                ),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
            ),
        ]
    )

    preprocessing = ColumnTransformer(
        transformers=[
            (
                "numerical",
                numerical_pipeline,
                numerical_features,
            ),
            (
                "categorical",
                categorical_pipeline,
                categorical_features,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )

    # --------------------------------------------------------
    # Random Forest model
    # --------------------------------------------------------
    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            ("model", model),
        ]
    )

    print("\nTraining Random Forest...")
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    # --------------------------------------------------------
    # Random Forest performance
    # --------------------------------------------------------
    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions,
        )
    )

    r2 = r2_score(
        y_test,
        predictions,
    )

    # --------------------------------------------------------
    # Persistence baseline
    # future ANC = current ANC
    # --------------------------------------------------------
    persistence_predictions = (
        X_test["current_anc"].to_numpy()
    )

    baseline_mae = mean_absolute_error(
        y_test,
        persistence_predictions,
    )

    baseline_rmse = np.sqrt(
        mean_squared_error(
            y_test,
            persistence_predictions,
        )
    )

    baseline_r2 = r2_score(
        y_test,
        persistence_predictions,
    )

    # --------------------------------------------------------
    # Display results
    # --------------------------------------------------------
    print("\n" + "=" * 65)
    print("RANDOM FOREST RESULTS")
    print("=" * 65)

    print(f"Total records: {len(data)}")
    print(f"Total patients: {groups.nunique()}")
    print(f"Number of features: {len(feature_columns)}")

    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")

    print(f"Training patients: {len(train_patients)}")
    print(f"Testing patients: {len(test_patients)}")
    print(f"Patient overlap: {len(overlap)}")

    print("\nRandom Forest:")
    print(f"MAE  = {mae:.6f}")
    print(f"RMSE = {rmse:.6f}")
    print(f"R²   = {r2:.6f}")

    print("\nPersistence baseline:")
    print(f"MAE  = {baseline_mae:.6f}")
    print(f"RMSE = {baseline_rmse:.6f}")
    print(f"R²   = {baseline_r2:.6f}")

    mae_improvement = (
        (baseline_mae - mae) / baseline_mae * 100
        if baseline_mae > 0
        else np.nan
    )

    rmse_improvement = (
        (baseline_rmse - rmse) / baseline_rmse * 100
        if baseline_rmse > 0
        else np.nan
    )

    print("\nImprovement over persistence:")
    print(f"MAE improvement  = {mae_improvement:.2f}%")
    print(f"RMSE improvement = {rmse_improvement:.2f}%")

    # --------------------------------------------------------
    # Save test-set predictions
    # --------------------------------------------------------
    predictions_output = test_metadata.copy()

    predictions_output["actual_future_anc"] = (
        y_test.to_numpy()
    )

    predictions_output["predicted_future_anc"] = (
        predictions
    )

    predictions_output["persistence_prediction"] = (
        persistence_predictions
    )

    predictions_output["random_forest_error"] = (
        predictions_output["actual_future_anc"]
        - predictions_output["predicted_future_anc"]
    )

    predictions_output["absolute_error"] = np.abs(
        predictions_output["random_forest_error"]
    )

    predictions_output[
        "persistence_absolute_error"
    ] = np.abs(
        predictions_output["actual_future_anc"]
        - predictions_output["persistence_prediction"]
    )

    predictions_output.to_csv(
        PREDICTIONS_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Save feature importance
    # --------------------------------------------------------
    transformed_names = (
        pipeline
        .named_steps["preprocessing"]
        .get_feature_names_out()
    )

    feature_importances = (
        pipeline
        .named_steps["model"]
        .feature_importances_
    )

    importance_output = pd.DataFrame(
        {
            "feature": transformed_names,
            "importance": feature_importances,
        }
    ).sort_values(
        by="importance",
        ascending=False,
    )

    importance_output["rank"] = np.arange(
        1,
        len(importance_output) + 1,
    )

    importance_output = importance_output[
        ["rank", "feature", "importance"]
    ]

    importance_output.to_csv(
        IMPORTANCE_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Save metrics
    # --------------------------------------------------------
    metrics_output = pd.DataFrame(
        [
            {
                "model": "Random Forest",
                "mae": mae,
                "rmse": rmse,
                "r2": r2,
                "training_records": len(X_train),
                "testing_records": len(X_test),
                "training_patients": len(train_patients),
                "testing_patients": len(test_patients),
            },
            {
                "model": "Persistence baseline",
                "mae": baseline_mae,
                "rmse": baseline_rmse,
                "r2": baseline_r2,
                "training_records": len(X_train),
                "testing_records": len(X_test),
                "training_patients": len(train_patients),
                "testing_patients": len(test_patients),
            },
        ]
    )

    metrics_output.to_csv(
        METRICS_FILE,
        index=False,
    )

    print("\nTop 10 features:")
    print(
        importance_output
        .head(10)
        .to_string(index=False)
    )

    print("\nOutput files:")
    print(f"Predictions: {PREDICTIONS_FILE}")
    print(f"Feature importance: {IMPORTANCE_FILE}")
    print(f"Metrics: {METRICS_FILE}")


if __name__ == "__main__":
    main()