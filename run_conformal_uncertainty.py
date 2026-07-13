from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parent

INPUT_FILE = ROOT / "longitudinal_training_data.csv"
OUTPUT_FILE = ROOT / "conformal_test_predictions.csv"
SUMMARY_FILE = ROOT / "conformal_uncertainty_summary.csv"

ALPHA = 0.10
N_FOLDS = 5
RANDOM_SEED = 42


def build_pipeline(numerical_features, categorical_features):
    numerical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
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
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    return Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            ("model", model),
        ]
    )


def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {INPUT_FILE}"
        )

    data = pd.read_csv(INPUT_FILE)

    target = "future_anc_7d"
    group_column = "patient_id"

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

    # Reproduce the existing 40-patient / 10-patient split.
    outer_split = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=RANDOM_SEED,
    )

    train_indices, test_indices = next(
        outer_split.split(X, y, groups=groups)
    )

    X_train = X.iloc[train_indices].copy()
    y_train = y.iloc[train_indices].copy()
    groups_train = groups.iloc[train_indices].copy()

    X_test = X.iloc[test_indices].copy()
    y_test = y.iloc[test_indices].copy()
    groups_test = groups.iloc[test_indices].copy()

    train_patients = set(groups_train)
    test_patients = set(groups_test)

    overlap = train_patients.intersection(test_patients)

    if overlap:
        raise RuntimeError(
            f"Patient leakage detected: {sorted(overlap)}"
        )

    print("=" * 72)
    print("CROSS-VALIDATED CONFORMAL UNCERTAINTY")
    print("=" * 72)
    print(f"Training patients: {len(train_patients)}")
    print(f"Testing patients: {len(test_patients)}")
    print(f"Patient overlap: {len(overlap)}")
    print(f"Nominal coverage: {(1 - ALPHA) * 100:.1f}%")

    # --------------------------------------------------------
    # Patient-grouped out-of-fold calibration residuals
    # --------------------------------------------------------
    group_folds = GroupKFold(n_splits=N_FOLDS)
    calibration_residuals = []

    print("\nGenerating grouped out-of-fold residuals...")

    for fold_number, (
        fold_train_positions,
        fold_calibration_positions,
    ) in enumerate(
        group_folds.split(
            X_train,
            y_train,
            groups=groups_train,
        ),
        start=1,
    ):
        fold_pipeline = build_pipeline(
            numerical_features,
            categorical_features,
        )

        X_fold_train = X_train.iloc[
            fold_train_positions
        ]
        y_fold_train = y_train.iloc[
            fold_train_positions
        ]

        X_fold_calibration = X_train.iloc[
            fold_calibration_positions
        ]
        y_fold_calibration = y_train.iloc[
            fold_calibration_positions
        ]

        fold_pipeline.fit(
            X_fold_train,
            y_fold_train,
        )

        fold_predictions = fold_pipeline.predict(
            X_fold_calibration
        )

        fold_residuals = np.abs(
            y_fold_calibration.to_numpy()
            - fold_predictions
        )

        calibration_residuals.extend(
            fold_residuals.tolist()
        )

        print(
            f"Fold {fold_number}: "
            f"{len(fold_calibration_positions)} "
            "calibration observations"
        )

    calibration_residuals = np.asarray(
        calibration_residuals,
        dtype=float,
    )

    if len(calibration_residuals) == 0:
        raise RuntimeError(
            "No calibration residuals were generated."
        )

    # Finite-sample conformal quantile.
    n_calibration = len(calibration_residuals)

    quantile_level = min(
        1.0,
        np.ceil(
            (n_calibration + 1)
            * (1.0 - ALPHA)
        ) / n_calibration,
    )

    conformal_quantile = float(
        np.quantile(
            calibration_residuals,
            quantile_level,
            method="higher",
        )
    )

    # --------------------------------------------------------
    # Final model fitted using all 40 training patients
    # --------------------------------------------------------
    final_pipeline = build_pipeline(
        numerical_features,
        categorical_features,
    )

    final_pipeline.fit(
        X_train,
        y_train,
    )

    test_predictions = final_pipeline.predict(
        X_test
    )

    lower_bounds = (
        test_predictions
        - conformal_quantile
    )

    upper_bounds = (
        test_predictions
        + conformal_quantile
    )

    # ANC cannot be negative.
    lower_bounds = np.maximum(
        lower_bounds,
        0.0,
    )

    actual_values = y_test.to_numpy()

    covered = (
        (actual_values >= lower_bounds)
        & (actual_values <= upper_bounds)
    )

    interval_widths = (
        upper_bounds - lower_bounds
    )

    empirical_coverage = float(
        covered.mean()
    )

    mean_interval_width = float(
        interval_widths.mean()
    )

    median_interval_width = float(
        np.median(interval_widths)
    )

    minimum_interval_width = float(
        interval_widths.min()
    )

    maximum_interval_width = float(
        interval_widths.max()
    )

    test_output = data.iloc[test_indices][
        [
            "patient_id",
            "maintenance_day",
            "maintenance_week",
            "current_anc",
            "future_anc_7d",
        ]
    ].copy()

    test_output["predicted_future_anc"] = (
        test_predictions
    )

    test_output["lower_90"] = lower_bounds
    test_output["upper_90"] = upper_bounds
    test_output["interval_width"] = interval_widths
    test_output["covered"] = covered

    test_output.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    summary = pd.DataFrame(
        [
            {
                "nominal_coverage": 1.0 - ALPHA,
                "empirical_coverage": empirical_coverage,
                "covered_observations": int(
                    covered.sum()
                ),
                "total_test_observations": len(
                    covered
                ),
                "calibration_observations": (
                    n_calibration
                ),
                "conformal_quantile": (
                    conformal_quantile
                ),
                "mean_interval_width": (
                    mean_interval_width
                ),
                "median_interval_width": (
                    median_interval_width
                ),
                "minimum_interval_width": (
                    minimum_interval_width
                ),
                "maximum_interval_width": (
                    maximum_interval_width
                ),
            }
        ]
    )

    summary.to_csv(
        SUMMARY_FILE,
        index=False,
    )

    print("\n" + "=" * 72)
    print("CONFORMAL UNCERTAINTY RESULTS")
    print("=" * 72)

    print(
        f"Calibration observations: "
        f"{n_calibration}"
    )

    print(
        f"Conformal residual quantile: "
        f"{conformal_quantile:.6f} G/L"
    )

    print(
        f"Nominal coverage: "
        f"{(1 - ALPHA) * 100:.2f}%"
    )

    print(
        f"Empirical test coverage: "
        f"{empirical_coverage * 100:.2f}%"
    )

    print(
        f"Covered test observations: "
        f"{int(covered.sum())}/{len(covered)}"
    )

    print(
        f"Mean interval width: "
        f"{mean_interval_width:.6f} G/L"
    )

    print(
        f"Median interval width: "
        f"{median_interval_width:.6f} G/L"
    )

    print(
        f"Minimum interval width: "
        f"{minimum_interval_width:.6f} G/L"
    )

    print(
        f"Maximum interval width: "
        f"{maximum_interval_width:.6f} G/L"
    )

    print("\nOutput files:")
    print(f"Test intervals: {OUTPUT_FILE}")
    print(f"Summary: {SUMMARY_FILE}")

    print(
        "\nImportant: These intervals are calibrated "
        "against synthetic ODE-derived outcomes and are "
        "not clinical confidence or safety intervals."
    )


if __name__ == "__main__":
    main()