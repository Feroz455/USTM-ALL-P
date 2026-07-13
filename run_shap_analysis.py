from pathlib import Path
import json

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

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

GLOBAL_IMPORTANCE_FILE = (
    ROOT / "shap_global_feature_importance.csv"
)

SHAP_VALUES_FILE = (
    ROOT / "shap_test_values.csv"
)

LOCAL_EXPLANATION_FILE = (
    ROOT / "shap_local_explanation.csv"
)

LOCAL_METADATA_FILE = (
    ROOT / "shap_local_metadata.json"
)

GLOBAL_FIGURE_PNG = (
    ROOT / "figure4_shap_summary.png"
)

GLOBAL_FIGURE_PDF = (
    ROOT / "figure4_shap_summary.pdf"
)

BAR_FIGURE_PNG = (
    ROOT / "shap_global_bar_plot.png"
)

BAR_FIGURE_PDF = (
    ROOT / "shap_global_bar_plot.pdf"
)

LOCAL_FIGURE_PNG = (
    ROOT / "shap_local_waterfall.png"
)

LOCAL_FIGURE_PDF = (
    ROOT / "shap_local_waterfall.pdf"
)


def main():
    print("=" * 72)
    print("USTM-ALL-P SHAP EXPLAINABILITY ANALYSIS")
    print("=" * 72)

    # --------------------------------------------------------
    # Load and validate the dataset
    # --------------------------------------------------------
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {INPUT_FILE}"
        )

    data = pd.read_csv(INPUT_FILE)

    target = "future_anc_7d"
    group_column = "patient_id"

    required_columns = {
        target,
        group_column,
        "maintenance_day",
        "current_anc",
    }

    missing_required = (
        required_columns.difference(data.columns)
    )

    if missing_required:
        raise ValueError(
            "Required columns are missing: "
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
    # Reproduce the same patient-level split
    # --------------------------------------------------------
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_indices, test_indices = next(
        splitter.split(
            X,
            y,
            groups=groups,
        )
    )

    train_patients = set(
        groups.iloc[train_indices]
    )

    test_patients = set(
        groups.iloc[test_indices]
    )

    overlap = train_patients.intersection(
        test_patients
    )

    if overlap:
        raise RuntimeError(
            f"Patient leakage detected: {sorted(overlap)}"
        )

    print(f"Training patients: {len(train_patients)}")
    print(f"Testing patients: {len(test_patients)}")
    print(f"Patient overlap: {len(overlap)}")
    print(f"Training observations: {len(train_indices)}")
    print(f"Testing observations: {len(test_indices)}")

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
            "future_anc_7d",
        ]
    ].copy()

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

    random_forest = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    print("\nFitting preprocessing pipeline...")

    X_train_transformed = (
        preprocessing.fit_transform(X_train)
    )

    X_test_transformed = (
        preprocessing.transform(X_test)
    )

    transformed_feature_names = (
        preprocessing.get_feature_names_out()
    )

    print(
        "Transformed feature count: "
        f"{len(transformed_feature_names)}"
    )

    print("Training Random Forest...")

    random_forest.fit(
        X_train_transformed,
        y_train,
    )

    predictions = random_forest.predict(
        X_test_transformed
    )

    print("Random Forest training completed.")

    # --------------------------------------------------------
    # Calculate SHAP values
    # --------------------------------------------------------
    print("\nCalculating SHAP values...")

    explainer = shap.TreeExplainer(
        random_forest
    )

    raw_shap_values = explainer.shap_values(
        X_test_transformed
    )

    shap_values = np.asarray(
        raw_shap_values
    )

    # Handle unusual output orientation if needed.
    if (
        shap_values.ndim == 3
        and shap_values.shape[-1] == 1
    ):
        shap_values = shap_values[:, :, 0]

    if shap_values.ndim != 2:
        raise RuntimeError(
            "Unexpected SHAP array shape: "
            f"{shap_values.shape}"
        )

    if (
        shap_values.shape[1]
        != len(transformed_feature_names)
    ):
        raise RuntimeError(
            "SHAP feature count does not match "
            "the transformed feature count."
        )

    print(
        f"SHAP matrix shape: {shap_values.shape}"
    )

    # --------------------------------------------------------
    # Global mean absolute SHAP importance
    # --------------------------------------------------------
    mean_absolute_shap = np.mean(
        np.abs(shap_values),
        axis=0,
    )

    global_importance = pd.DataFrame(
        {
            "feature": transformed_feature_names,
            "mean_absolute_shap": mean_absolute_shap,
        }
    ).sort_values(
        by="mean_absolute_shap",
        ascending=False,
    ).reset_index(drop=True)

    global_importance["rank"] = np.arange(
        1,
        len(global_importance) + 1,
    )

    global_importance = global_importance[
        [
            "rank",
            "feature",
            "mean_absolute_shap",
        ]
    ]

    global_importance.to_csv(
        GLOBAL_IMPORTANCE_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Save test-set SHAP values
    # --------------------------------------------------------
    shap_value_table = pd.DataFrame(
        shap_values,
        columns=[
            f"shap_{feature}"
            for feature in transformed_feature_names
        ],
    )

    shap_test_output = pd.concat(
        [
            test_metadata,
            pd.DataFrame(
                {
                    "predicted_future_anc": predictions,
                }
            ),
            shap_value_table,
        ],
        axis=1,
    )

    shap_test_output.to_csv(
        SHAP_VALUES_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Figure 4: global SHAP beeswarm summary
    # --------------------------------------------------------
    plt.figure()

    shap.summary_plot(
        shap_values,
        X_test_transformed,
        feature_names=transformed_feature_names,
        max_display=10,
        show=False,
    )

    plt.tight_layout()

    plt.savefig(
        GLOBAL_FIGURE_PNG,
        dpi=600,
        bbox_inches="tight",
    )

    plt.savefig(
        GLOBAL_FIGURE_PDF,
        bbox_inches="tight",
    )

    plt.close()

    # --------------------------------------------------------
    # Global SHAP bar plot
    # --------------------------------------------------------
    plt.figure()

    shap.summary_plot(
        shap_values,
        X_test_transformed,
        feature_names=transformed_feature_names,
        plot_type="bar",
        max_display=10,
        show=False,
    )

    plt.tight_layout()

    plt.savefig(
        BAR_FIGURE_PNG,
        dpi=600,
        bbox_inches="tight",
    )

    plt.savefig(
        BAR_FIGURE_PDF,
        bbox_inches="tight",
    )

    plt.close()

    # --------------------------------------------------------
    # Select representative local explanation
    # --------------------------------------------------------
    median_prediction = float(
        np.median(predictions)
    )

    local_position = int(
        np.argmin(
            np.abs(
                predictions
                - median_prediction
            )
        )
    )

    local_metadata = test_metadata.iloc[
        local_position
    ].to_dict()

    local_metadata[
        "predicted_future_anc"
    ] = float(
        predictions[local_position]
    )

    local_metadata[
        "base_value"
    ] = float(
        np.asarray(
            explainer.expected_value
        ).reshape(-1)[0]
    )

    local_metadata[
        "selection_reason"
    ] = (
        "Test observation closest to the "
        "median Random Forest prediction"
    )

    # --------------------------------------------------------
    # Save local SHAP ranking
    # --------------------------------------------------------
    local_explanation = pd.DataFrame(
        {
            "feature": transformed_feature_names,
            "feature_value": (
                X_test_transformed[
                    local_position
                ]
            ),
            "shap_value": (
                shap_values[
                    local_position
                ]
            ),
        }
    )

    local_explanation[
        "absolute_shap_value"
    ] = np.abs(
        local_explanation["shap_value"]
    )

    local_explanation = (
        local_explanation
        .sort_values(
            by="absolute_shap_value",
            ascending=False,
        )
        .reset_index(drop=True)
    )

    local_explanation["rank"] = np.arange(
        1,
        len(local_explanation) + 1,
    )

    local_explanation = local_explanation[
        [
            "rank",
            "feature",
            "feature_value",
            "shap_value",
            "absolute_shap_value",
        ]
    ]

    local_explanation.to_csv(
        LOCAL_EXPLANATION_FILE,
        index=False,
    )

    with open(
        LOCAL_METADATA_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            local_metadata,
            file,
            indent=2,
            default=float,
        )

    # --------------------------------------------------------
    # Local waterfall plot
    # --------------------------------------------------------
    explanation_object = shap.Explanation(
        values=shap_values[local_position],
        base_values=local_metadata["base_value"],
        data=X_test_transformed[local_position],
        feature_names=transformed_feature_names,
    )

    plt.figure()

    shap.plots.waterfall(
        explanation_object,
        max_display=10,
        show=False,
    )

    plt.tight_layout()

    plt.savefig(
        LOCAL_FIGURE_PNG,
        dpi=600,
        bbox_inches="tight",
    )

    plt.savefig(
        LOCAL_FIGURE_PDF,
        bbox_inches="tight",
    )

    plt.close()

    # --------------------------------------------------------
    # Verification
    # --------------------------------------------------------
    reconstructed_prediction = (
        local_metadata["base_value"]
        + shap_values[
            local_position
        ].sum()
    )

    reconstruction_difference = abs(
        reconstructed_prediction
        - predictions[local_position]
    )

    print("\n" + "=" * 72)
    print("GLOBAL SHAP RESULTS")
    print("=" * 72)

    print(
        global_importance
        .head(10)
        .to_string(index=False)
    )

    print("\n" + "=" * 72)
    print("LOCAL SHAP EXAMPLE")
    print("=" * 72)

    print(
        f"Patient: "
        f"{local_metadata['patient_id']}"
    )

    print(
        "Maintenance day: "
        f"{local_metadata['maintenance_day']}"
    )

    print(
        "Current ANC: "
        f"{local_metadata['current_anc']:.6f} G/L"
    )

    print(
        "Actual future ANC: "
        f"{local_metadata['future_anc_7d']:.6f} G/L"
    )

    print(
        "Predicted future ANC: "
        f"{local_metadata['predicted_future_anc']:.6f} G/L"
    )

    print(
        f"SHAP base value: "
        f"{local_metadata['base_value']:.6f} G/L"
    )

    print(
        "SHAP reconstructed prediction: "
        f"{reconstructed_prediction:.6f} G/L"
    )

    print(
        "Reconstruction difference: "
        f"{reconstruction_difference:.12f}"
    )

    print("\nTop local features:")

    print(
        local_explanation
        .head(10)
        .to_string(index=False)
    )

    print("\nOutput files:")
    print(
        f"Global SHAP ranking: "
        f"{GLOBAL_IMPORTANCE_FILE}"
    )
    print(
        f"All test SHAP values: "
        f"{SHAP_VALUES_FILE}"
    )
    print(
        f"Local SHAP ranking: "
        f"{LOCAL_EXPLANATION_FILE}"
    )
    print(
        f"Local metadata: "
        f"{LOCAL_METADATA_FILE}"
    )
    print(
        f"Global summary PNG: "
        f"{GLOBAL_FIGURE_PNG}"
    )
    print(
        f"Global summary PDF: "
        f"{GLOBAL_FIGURE_PDF}"
    )
    print(
        f"Global bar plot: "
        f"{BAR_FIGURE_PDF}"
    )
    print(
        f"Local waterfall: "
        f"{LOCAL_FIGURE_PDF}"
    )


if __name__ == "__main__":
    main()