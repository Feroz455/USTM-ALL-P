from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ------------------------------------------------------------
# File paths
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parent

INPUT_FILE = ROOT / "longitudinal_training_data.csv"
OUTPUT_FILE = ROOT / "digital_twin_scenario_predictions.csv"
SUMMARY_FILE = ROOT / "digital_twin_scenario_summary.csv"
EXAMPLE_FILE = ROOT / "digital_twin_example_patient.csv"


# ------------------------------------------------------------
# Scenario definitions
# ------------------------------------------------------------
SCENARIOS = {
    "Continue current dose": {
        "six_mp_multiplier": 1.00,
        "mtx_multiplier": 1.00,
    },
    "Reduce 6MP by 20%": {
        "six_mp_multiplier": 0.80,
        "mtx_multiplier": 1.00,
    },
    "Reduce MTX by 20%": {
        "six_mp_multiplier": 1.00,
        "mtx_multiplier": 0.80,
    },
    "Temporary dose hold": {
        "six_mp_multiplier": 0.00,
        "mtx_multiplier": 0.00,
    },
}


def main():
    # --------------------------------------------------------
    # Load and validate data
    # --------------------------------------------------------
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input dataset was not found: {INPUT_FILE}"
        )

    data = pd.read_csv(INPUT_FILE)

    target = "future_anc_7d"
    group_column = "patient_id"

    required_columns = {
        target,
        group_column,
        "maintenance_day",
        "current_anc",
        "dose_6mp_mg",
        "dose_mtx_mg",
    }

    missing_required = required_columns.difference(data.columns)

    if missing_required:
        raise ValueError(
            "Missing required columns: "
            f"{sorted(missing_required)}"
        )

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

    feature_columns = [
        column
        for column in feature_columns
        if column in data.columns
    ]

    X = data[feature_columns].copy()
    y = data[target].copy()
    groups = data[group_column].copy()

    # --------------------------------------------------------
    # Reproduce exactly the same patient-level split
    # --------------------------------------------------------
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_indices, test_indices = next(
        splitter.split(X, y, groups=groups)
    )

    train_patients = set(groups.iloc[train_indices])
    test_patients = set(groups.iloc[test_indices])

    overlap = train_patients.intersection(test_patients)

    if overlap:
        raise RuntimeError(
            f"Patient leakage detected: {sorted(overlap)}"
        )

    X_train = X.iloc[train_indices].copy()
    X_test = X.iloc[test_indices].copy()

    y_train = y.iloc[train_indices].copy()
    y_test = y.iloc[test_indices].copy()

    test_metadata = data.iloc[test_indices][
        [
            "patient_id",
            "maintenance_day",
            "maintenance_week",
            "current_anc",
            "current_wbc",
            "dose_6mp_mg",
            "dose_mtx_mg",
        ]
    ].copy()

    # Reset indices so metadata and scenario predictions align.
    X_test = X_test.reset_index(drop=True)
    y_test = y_test.reset_index(drop=True)
    test_metadata = test_metadata.reset_index(drop=True)

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

    # --------------------------------------------------------
    # Train model
    # --------------------------------------------------------
    print("=" * 70)
    print("DIGITAL TWIN SCENARIO SIMULATION")
    print("=" * 70)

    print(f"Training patients: {len(train_patients)}")
    print(f"Testing patients: {len(test_patients)}")
    print(f"Testing observations: {len(X_test)}")
    print(f"Patient overlap: {len(overlap)}")

    print("\nTraining Random Forest...")
    pipeline.fit(X_train, y_train)
    print("Training completed.")

    # --------------------------------------------------------
    # Apply scenarios
    # --------------------------------------------------------
    all_scenario_records = []
    prediction_arrays = {}

    for scenario_name, settings in SCENARIOS.items():
        scenario_features = X_test.copy()

        original_6mp = scenario_features[
            "dose_6mp_mg"
        ].to_numpy()

        original_mtx = scenario_features[
            "dose_mtx_mg"
        ].to_numpy()

        scenario_features["dose_6mp_mg"] = (
            scenario_features["dose_6mp_mg"]
            * settings["six_mp_multiplier"]
        )

        scenario_features["dose_mtx_mg"] = (
            scenario_features["dose_mtx_mg"]
            * settings["mtx_multiplier"]
        )

        predictions = pipeline.predict(
            scenario_features
        )

        prediction_arrays[scenario_name] = predictions

        for row_number in range(len(scenario_features)):
            all_scenario_records.append({
                "patient_id": test_metadata.loc[
                    row_number, "patient_id"
                ],
                "maintenance_day": test_metadata.loc[
                    row_number, "maintenance_day"
                ],
                "maintenance_week": test_metadata.loc[
                    row_number, "maintenance_week"
                ],
                "scenario": scenario_name,
                "current_anc": test_metadata.loc[
                    row_number, "current_anc"
                ],
                "current_wbc": test_metadata.loc[
                    row_number, "current_wbc"
                ],
                "actual_future_anc": y_test.iloc[
                    row_number
                ],
                "original_6mp_mg": original_6mp[
                    row_number
                ],
                "scenario_6mp_mg": scenario_features.loc[
                    row_number, "dose_6mp_mg"
                ],
                "original_mtx_mg": original_mtx[
                    row_number
                ],
                "scenario_mtx_mg": scenario_features.loc[
                    row_number, "dose_mtx_mg"
                ],
                "predicted_future_anc": predictions[
                    row_number
                ],
            })

        print(
            f"{scenario_name}: "
            f"{len(predictions)} predictions generated"
        )

    scenario_results = pd.DataFrame(
        all_scenario_records
    )

    # --------------------------------------------------------
    # Calculate change relative to continuation
    # --------------------------------------------------------
    continue_predictions = prediction_arrays[
        "Continue current dose"
    ]

    continue_lookup = {
        (
            test_metadata.loc[index, "patient_id"],
            test_metadata.loc[index, "maintenance_day"],
        ): continue_predictions[index]
        for index in range(len(test_metadata))
    }

    scenario_results[
        "continue_dose_prediction"
    ] = scenario_results.apply(
        lambda row: continue_lookup[
            (
                row["patient_id"],
                row["maintenance_day"],
            )
        ],
        axis=1,
    )

    scenario_results[
        "anc_change_vs_continue"
    ] = (
        scenario_results["predicted_future_anc"]
        - scenario_results["continue_dose_prediction"]
    )

    scenario_results.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Cohort-level scenario summary
    # --------------------------------------------------------
    summary = (
        scenario_results
        .groupby("scenario", sort=False)
        .agg(
            predictions_checked=(
                "predicted_future_anc",
                "count",
            ),
            mean_predicted_anc=(
                "predicted_future_anc",
                "mean",
            ),
            std_predicted_anc=(
                "predicted_future_anc",
                "std",
            ),
            minimum_predicted_anc=(
                "predicted_future_anc",
                "min",
            ),
            maximum_predicted_anc=(
                "predicted_future_anc",
                "max",
            ),
            mean_change_vs_continue=(
                "anc_change_vs_continue",
                "mean",
            ),
        )
        .reset_index()
    )

    summary.to_csv(
        SUMMARY_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Select one example observation for Table IV
    # --------------------------------------------------------
    # Select the test observation closest to the median
    # continuation prediction for a representative example.
    continue_rows = scenario_results[
        scenario_results["scenario"]
        == "Continue current dose"
    ].copy()

    median_prediction = continue_rows[
        "predicted_future_anc"
    ].median()

    example_index = (
        continue_rows["predicted_future_anc"]
        - median_prediction
    ).abs().idxmin()

    example_patient = continue_rows.loc[
        example_index,
        "patient_id",
    ]

    example_day = continue_rows.loc[
        example_index,
        "maintenance_day",
    ]

    example_output = scenario_results[
        (
            scenario_results["patient_id"]
            == example_patient
        )
        & (
            scenario_results["maintenance_day"]
            == example_day
        )
    ].copy()

    example_output.to_csv(
        EXAMPLE_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Print output
    # --------------------------------------------------------
    print("\n" + "=" * 70)
    print("SCENARIO SUMMARY")
    print("=" * 70)

    display_summary = summary.copy()

    numeric_columns = [
        "mean_predicted_anc",
        "std_predicted_anc",
        "minimum_predicted_anc",
        "maximum_predicted_anc",
        "mean_change_vs_continue",
    ]

    display_summary[numeric_columns] = (
        display_summary[numeric_columns]
        .round(6)
    )

    print(display_summary.to_string(index=False))

    print("\n" + "=" * 70)
    print("EXAMPLE PATIENT OBSERVATION")
    print("=" * 70)

    print(f"Patient: {example_patient}")
    print(f"Maintenance day: {example_day}")

    print(
        example_output[
            [
                "scenario",
                "scenario_6mp_mg",
                "scenario_mtx_mg",
                "predicted_future_anc",
                "anc_change_vs_continue",
            ]
        ].to_string(index=False)
    )

    print("\nOutput files:")
    print(f"All predictions: {OUTPUT_FILE}")
    print(f"Scenario summary: {SUMMARY_FILE}")
    print(f"Example patient: {EXAMPLE_FILE}")

    print(
        "\nImportant: These are model-based synthetic "
        "scenario outputs, not clinical dosing recommendations."
    )


if __name__ == "__main__":
    main()