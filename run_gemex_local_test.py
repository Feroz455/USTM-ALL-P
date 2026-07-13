from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd

from gemex import Explainer, GemexConfig

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ============================================================
# Warning control
# ============================================================

# GEMEX repeatedly evaluates the scikit-learn model. Some versions
# of scikit-learn emit the same Joblib configuration warning for
# each evaluation. This warning does not indicate a failed model
# prediction, so it is suppressed to keep the terminal readable.
warnings.filterwarnings(
    "ignore",
    message=(
        ".*sklearn\\.utils\\.parallel\\.delayed.*"
    ),
    category=UserWarning,
)

warnings.filterwarnings(
    "ignore",
    category=UserWarning,
    module="sklearn.utils.parallel",
)


# ============================================================
# Paths
# ============================================================

ROOT = Path(__file__).resolve().parent

INPUT_FILE = (
    ROOT / "longitudinal_training_data.csv"
)

SUMMARY_FILE = (
    ROOT / "gemex_local_summary.txt"
)

METADATA_FILE = (
    ROOT / "gemex_local_metadata.json"
)

FEATURE_SCORE_FILE = (
    ROOT / "gemex_local_feature_scores.csv"
)

CONFIGURATION_FILE = (
    ROOT / "gemex_local_configuration.json"
)


# ============================================================
# Experiment settings
# ============================================================

RANDOM_SEED = 42

TARGET_PATIENT = "USTM_0371"
TARGET_DAY = 203

EXPECTED_PREVIOUS_PREDICTION = 1.679522

# GEMEX diagnostic configuration
N_GEODESIC_STEPS = 10
N_REFERENCE_SAMPLES = 20

FIM_EPSILON = 0.05
FIM_EPSILON_AUTO = False

INTERACTION_ORDER = 1

COMPUTE_FAS = False
COMPUTE_BTD = False

# Diagnostic threshold only.
# This separates approximately machine-precision output from
# potentially informative raw GSF scores. It is not a clinical
# threshold and should not be presented as one.
GSF_NUMERICAL_THRESHOLD = 1.0e-10


def convert_to_serializable(value):
    """
    Convert NumPy and other common objects into JSON-compatible
    Python values.
    """
    if isinstance(value, np.ndarray):
        return value.tolist()

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    if isinstance(value, dict):
        return {
            str(key): convert_to_serializable(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            convert_to_serializable(item)
            for item in value
        ]

    if value is None:
        return None

    if isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    return str(value)


def safe_result_dictionary(result):
    """
    Export the GEMEX result dictionary without allowing an
    unsupported value to terminate the diagnostic script.
    """
    if not hasattr(result, "to_dict"):
        return {
            "export_status": (
                "No to_dict method available"
            )
        }

    try:
        raw_dictionary = result.to_dict()

        return convert_to_serializable(
            raw_dictionary
        )

    except Exception as error:
        return {
            "export_status": "failed",
            "error_type": type(error).__name__,
            "error_message": str(error),
        }


def make_preprocessing(
    numerical_features,
    categorical_features,
):
    """
    Build the same preprocessing structure used in the
    Random Forest and TreeSHAP experiments.
    """
    numerical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="median"
                ),
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

    return preprocessing


def main():
    print("=" * 72)
    print("USTM-ALL-P GEMEX REGRESSION DIAGNOSTIC")
    print("=" * 72)

    # --------------------------------------------------------
    # Validate and load data
    # --------------------------------------------------------
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {INPUT_FILE}"
        )

    data = pd.read_csv(INPUT_FILE)

    target_column = "future_anc_7d"
    group_column = "patient_id"

    required_columns = {
        target_column,
        group_column,
        "maintenance_day",
        "maintenance_week",
        "current_anc",
    }

    missing_columns = (
        required_columns.difference(
            data.columns
        )
    )

    if missing_columns:
        raise ValueError(
            "Dataset is missing required columns: "
            f"{sorted(missing_columns)}"
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

    print(
        f"Available model features: "
        f"{len(feature_columns)}"
    )

    X = data[feature_columns].copy()
    y = data[target_column].copy()
    groups = data[group_column].copy()

    # --------------------------------------------------------
    # Reproduce original patient-level split
    # --------------------------------------------------------
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=RANDOM_SEED,
    )

    train_indices, test_indices = next(
        splitter.split(
            X,
            y,
            groups=groups,
        )
    )

    X_train = X.iloc[
        train_indices
    ].copy()

    y_train = y.iloc[
        train_indices
    ].copy()

    X_test = X.iloc[
        test_indices
    ].copy()

    y_test = y.iloc[
        test_indices
    ].copy()

    groups_train = groups.iloc[
        train_indices
    ].copy()

    groups_test = groups.iloc[
        test_indices
    ].copy()

    train_patients = set(
        groups_train.unique()
    )

    test_patients = set(
        groups_test.unique()
    )

    patient_overlap = (
        train_patients.intersection(
            test_patients
        )
    )

    if patient_overlap:
        raise RuntimeError(
            "Patient leakage detected: "
            f"{sorted(patient_overlap)}"
        )

    test_metadata = data.iloc[
        test_indices
    ][
        [
            "patient_id",
            "maintenance_day",
            "maintenance_week",
            "current_anc",
            "future_anc_7d",
        ]
    ].copy()

    X_test = X_test.reset_index(
        drop=True
    )

    y_test = y_test.reset_index(
        drop=True
    )

    test_metadata = (
        test_metadata.reset_index(
            drop=True
        )
    )

    print(
        f"Training patients: "
        f"{len(train_patients)}"
    )

    print(
        f"Testing patients: "
        f"{len(test_patients)}"
    )

    print(
        f"Patient overlap: "
        f"{len(patient_overlap)}"
    )

    print(
        f"Training observations: "
        f"{len(X_train)}"
    )

    print(
        f"Testing observations: "
        f"{len(X_test)}"
    )

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

    preprocessing = make_preprocessing(
        numerical_features,
        categorical_features,
    )

    X_train_transformed = (
        preprocessing.fit_transform(
            X_train
        )
    )

    X_test_transformed = (
        preprocessing.transform(
            X_test
        )
    )

    transformed_feature_names = list(
        preprocessing.get_feature_names_out()
    )

    X_train_transformed = np.asarray(
        X_train_transformed,
        dtype=float,
    )

    X_test_transformed = np.asarray(
        X_test_transformed,
        dtype=float,
    )

    print(
        f"Transformed features: "
        f"{len(transformed_feature_names)}"
    )

    print(
        "Training matrix shape: "
        f"{X_train_transformed.shape}"
    )

    print(
        "Testing matrix shape: "
        f"{X_test_transformed.shape}"
    )

    if not np.isfinite(
        X_train_transformed
    ).all():
        raise RuntimeError(
            "Training matrix contains "
            "NaN or infinite values."
        )

    if not np.isfinite(
        X_test_transformed
    ).all():
        raise RuntimeError(
            "Testing matrix contains "
            "NaN or infinite values."
        )

    # --------------------------------------------------------
    # Train Random Forest
    # --------------------------------------------------------
    # n_jobs=1 is intentional for GEMEX. GEMEX repeatedly
    # evaluates the estimator, and using n_jobs=-1 inside those
    # evaluations can create nested Joblib parallelism.
    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=1,
    )

    print("\nTraining Random Forest...")

    model.fit(
        X_train_transformed,
        y_train,
    )

    test_predictions = model.predict(
        X_test_transformed
    )

    print(
        "Random Forest training completed."
    )

    # --------------------------------------------------------
    # Select representative observation
    # --------------------------------------------------------
    matching_positions = (
        test_metadata.index[
            (
                test_metadata[
                    "patient_id"
                ].astype(str)
                == TARGET_PATIENT
            )
            & (
                test_metadata[
                    "maintenance_day"
                ]
                == TARGET_DAY
            )
        ].tolist()
    )

    if matching_positions:
        local_position = int(
            matching_positions[0]
        )

        selection_reason = (
            "Requested representative "
            "observation"
        )

    else:
        median_prediction = float(
            np.median(
                test_predictions
            )
        )

        local_position = int(
            np.argmin(
                np.abs(
                    test_predictions
                    - median_prediction
                )
            )
        )

        selection_reason = (
            "Fallback observation closest "
            "to median test prediction"
        )

    selected_patient = str(
        test_metadata.loc[
            local_position,
            "patient_id",
        ]
    )

    selected_day = int(
        test_metadata.loc[
            local_position,
            "maintenance_day",
        ]
    )

    current_anc = float(
        test_metadata.loc[
            local_position,
            "current_anc",
        ]
    )

    actual_future_anc = float(
        y_test.iloc[
            local_position
        ]
    )

    predicted_future_anc = float(
        test_predictions[
            local_position
        ]
    )

    prediction_difference = abs(
        predicted_future_anc
        - EXPECTED_PREVIOUS_PREDICTION
    )

    x_instance = np.asarray(
        X_test_transformed[
            local_position
        ],
        dtype=float,
    )

    print("\n" + "=" * 72)
    print("SELECTED OBSERVATION")
    print("=" * 72)

    print(
        f"Patient: {selected_patient}"
    )

    print(
        f"Maintenance day: "
        f"{selected_day}"
    )

    print(
        f"Selection: {selection_reason}"
    )

    print(
        f"Current ANC: "
        f"{current_anc:.6f} G/L"
    )

    print(
        f"Actual future ANC: "
        f"{actual_future_anc:.6f} G/L"
    )

    print(
        f"Predicted future ANC: "
        f"{predicted_future_anc:.6f} G/L"
    )

    print(
        "Difference from previous experiment: "
        f"{prediction_difference:.12f} G/L"
    )

    print(
        f"Instance shape: "
        f"{x_instance.shape}"
    )

    # --------------------------------------------------------
    # Configure GEMEX
    # --------------------------------------------------------
    config = GemexConfig(
        n_geodesic_steps=(
            N_GEODESIC_STEPS
        ),
        n_reference_samples=(
            N_REFERENCE_SAMPLES
        ),
        fim_epsilon=FIM_EPSILON,
        fim_epsilon_auto=(
            FIM_EPSILON_AUTO
        ),
        fim_local_avg=True,
        fim_local_sigma=0.1,
        fim_local_n=16,
        interaction_order=(
            INTERACTION_ORDER
        ),
        gsf_normalise=False,
        random_state=RANDOM_SEED,
        verbose=True,
    )

    explainer = Explainer(
        model=model,
        data_type="tabular",
        feature_names=(
            transformed_feature_names
        ),
        class_names=None,
        config=config,
        task="regression",
        compute_fas=COMPUTE_FAS,
        compute_btd=COMPUTE_BTD,
    )

    # --------------------------------------------------------
    # Regression interface checks
    # --------------------------------------------------------
    direct_prediction = (
        model.predict(
            x_instance.reshape(
                1,
                -1,
            )
        )
    )

    stored_task = getattr(
        explainer,
        "task",
        "unavailable",
    )

    gemex_model_type = getattr(
        explainer,
        "model_type",
        "unavailable",
    )

    print("\n" + "=" * 72)
    print("REGRESSION INTERFACE CHECK")
    print("=" * 72)

    print(
        "Direct model prediction shape:",
        direct_prediction.shape,
    )

    print(
        "Direct model prediction:",
        direct_prediction,
    )

    print(
        "Model estimator type:",
        getattr(
            model,
            "_estimator_type",
            "unavailable",
        ),
    )

    print(
        "Requested GEMEX task:",
        "regression",
    )

    print(
        "Stored GEMEX task:",
        stored_task,
    )

    print(
        "GEMEX model type:",
        gemex_model_type,
    )

    print(
        "Configured FIM epsilon:",
        config.fim_epsilon,
    )

    print(
        "Automatic FIM epsilon:",
        config.fim_epsilon_auto,
    )

    print(
        "Geodesic steps:",
        config.n_geodesic_steps,
    )

    print(
        "Reference samples:",
        config.n_reference_samples,
    )

    print(
        "Interaction order:",
        config.interaction_order,
    )

    # --------------------------------------------------------
    # Calculate GEMEX explanation
    # --------------------------------------------------------
    print("\n" + "=" * 72)
    print("CALCULATING GEMEX EXPLANATION")
    print("=" * 72)

    result = explainer.explain(
        x_instance,
        X_reference=(
            X_train_transformed
        ),
        target_class=None,
    )

    print(
        "\nGEMEX calculation completed."
    )

    # --------------------------------------------------------
    # GEMEX summary
    # --------------------------------------------------------
    print("\n" + "=" * 72)
    print("GEMEX SUMMARY")
    print("=" * 72)

    try:
        summary = result.summary()
    except Exception as error:
        summary = (
            "Summary unavailable: "
            f"{type(error).__name__}: "
            f"{error}"
        )

    print(summary)

    try:
        top_features = (
            result.top_features(5)
        )
    except Exception as error:
        top_features = (
            "Top features unavailable: "
            f"{type(error).__name__}: "
            f"{error}"
        )

    print("\nTop five GEMEX features:")
    print(top_features)

    try:
        top_interactions = (
            result.top_interactions(3)
        )
    except Exception as error:
        top_interactions = (
            "Interactions unavailable: "
            f"{type(error).__name__}: "
            f"{error}"
        )

    print(
        "\nTop three GEMEX interactions:"
    )

    print(top_interactions)

    # --------------------------------------------------------
    # Inspect result object
    # --------------------------------------------------------
    public_attributes = [
        name
        for name in dir(result)
        if not name.startswith("_")
    ]

    print("\n" + "=" * 72)
    print("PUBLIC GEMEX RESULT ATTRIBUTES")
    print("=" * 72)

    for attribute_name in (
        public_attributes
    ):
        print(f"  - {attribute_name}")

    result_dictionary = (
        safe_result_dictionary(result)
    )

    print("\n" + "=" * 72)
    print(
        "COMPLETE GEMEX RESULT DICTIONARY"
    )
    print("=" * 72)

    print(
        json.dumps(
            result_dictionary,
            indent=2,
            ensure_ascii=False,
        )
    )

    # --------------------------------------------------------
    # Extract and validate GSF scores
    # --------------------------------------------------------
    if not hasattr(
        result,
        "gsf_scores",
    ):
        raise RuntimeError(
            "The GEMEX result does not "
            "contain gsf_scores."
        )

    gsf_scores = np.asarray(
        result.gsf_scores,
        dtype=float,
    ).reshape(-1)

    if len(gsf_scores) != len(
        transformed_feature_names
    ):
        raise RuntimeError(
            "GEMEX GSF score count does "
            "not match the feature count. "
            f"Scores: {len(gsf_scores)}, "
            "features: "
            f"{len(transformed_feature_names)}"
        )

    if not np.isfinite(
        gsf_scores
    ).all():
        raise RuntimeError(
            "GEMEX GSF scores contain "
            "NaN or infinite values."
        )

    absolute_gsf_scores = np.abs(
        gsf_scores
    )

    maximum_absolute_gsf = float(
        absolute_gsf_scores.max()
    )

    mean_absolute_gsf = float(
        absolute_gsf_scores.mean()
    )

    nonzero_gsf_count = int(
        np.sum(
            absolute_gsf_scores
            > GSF_NUMERICAL_THRESHOLD
        )
    )

    fim_quality = str(
        getattr(
            result,
            "fim_quality",
            "unavailable",
        )
    )

    manifold_curvature = float(
        getattr(
            result,
            "manifold_curvature",
            np.nan,
        )
    )

    gemex_reported_prediction = getattr(
        result,
        "prediction",
        None,
    )

    # GEMEX should retain regression mode and produce scores
    # materially above numerical-noise scale.
    task_is_regression = (
        str(stored_task).lower()
        == "regression"
    )

    fim_is_not_poor = (
        fim_quality.lower()
        not in {
            "poor",
            "unavailable",
            "none",
        }
    )

    gsf_scores_are_nontrivial = (
        maximum_absolute_gsf
        > GSF_NUMERICAL_THRESHOLD
        and nonzero_gsf_count > 0
    )

    gemex_numerically_informative = bool(
        task_is_regression
        and fim_is_not_poor
        and gsf_scores_are_nontrivial
    )

    print("\n" + "=" * 72)
    print("GEMEX NUMERICAL VALIDITY CHECK")
    print("=" * 72)

    print(
        "Maximum absolute GSF score:",
        f"{maximum_absolute_gsf:.12e}",
    )

    print(
        "Mean absolute GSF score:",
        f"{mean_absolute_gsf:.12e}",
    )

    print(
        "GSF scores above threshold:",
        (
            f"{nonzero_gsf_count}/"
            f"{len(gsf_scores)}"
        ),
    )

    print(
        "Diagnostic threshold:",
        f"{GSF_NUMERICAL_THRESHOLD:.1e}",
    )

    print(
        "FIM quality:",
        fim_quality,
    )

    print(
        "Manifold curvature:",
        manifold_curvature,
    )

    print(
        "GEMEX reported prediction:",
        gemex_reported_prediction,
    )

    print(
        "Stored task is regression:",
        task_is_regression,
    )

    print(
        "FIM quality acceptable:",
        fim_is_not_poor,
    )

    print(
        "GSF scores nontrivial:",
        gsf_scores_are_nontrivial,
    )

    print(
        "Numerically informative:",
        gemex_numerically_informative,
    )

    # --------------------------------------------------------
    # Save feature score table
    # --------------------------------------------------------
    feature_scores = pd.DataFrame(
        {
            "feature": (
                transformed_feature_names
            ),
            "gemex_gsf_score": (
                gsf_scores
            ),
            "absolute_gemex_gsf": (
                absolute_gsf_scores
            ),
        }
    )

    feature_scores = (
        feature_scores.sort_values(
            by="absolute_gemex_gsf",
            ascending=False,
        )
        .reset_index(drop=True)
    )

    feature_scores["gemex_rank"] = (
        np.arange(
            1,
            len(feature_scores) + 1,
        )
    )

    feature_scores = feature_scores[
        [
            "gemex_rank",
            "feature",
            "gemex_gsf_score",
            "absolute_gemex_gsf",
        ]
    ]

    feature_scores.to_csv(
        FEATURE_SCORE_FILE,
        index=False,
    )

    print("\nTop GEMEX feature-score rows:")

    print(
        feature_scores.head(10).to_string(
            index=False
        )
    )

    # --------------------------------------------------------
    # Save configuration separately
    # --------------------------------------------------------
    configuration_record = {
        "gemex_version": "1.2.2",
        "n_geodesic_steps": (
            N_GEODESIC_STEPS
        ),
        "n_reference_samples": (
            N_REFERENCE_SAMPLES
        ),
        "fim_epsilon": FIM_EPSILON,
        "fim_epsilon_auto": (
            FIM_EPSILON_AUTO
        ),
        "fim_local_avg": True,
        "fim_local_sigma": 0.1,
        "fim_local_n": 16,
        "interaction_order": (
            INTERACTION_ORDER
        ),
        "gsf_normalise": False,
        "random_state": RANDOM_SEED,
        "task": "regression",
        "compute_fas": COMPUTE_FAS,
        "compute_btd": COMPUTE_BTD,
        "random_forest_n_jobs": 1,
        "gsf_numerical_threshold": (
            GSF_NUMERICAL_THRESHOLD
        ),
    }

    CONFIGURATION_FILE.write_text(
        json.dumps(
            configuration_record,
            indent=2,
        ),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Save comprehensive metadata
    # --------------------------------------------------------
    metadata = {
        "gemex_version": "1.2.2",
        "patient_id": selected_patient,
        "maintenance_day": (
            selected_day
        ),
        "selection_reason": (
            selection_reason
        ),
        "current_anc": current_anc,
        "actual_future_anc": (
            actual_future_anc
        ),
        "random_forest_prediction": (
            predicted_future_anc
        ),
        "direct_model_prediction": (
            float(
                direct_prediction[0]
            )
        ),
        "expected_previous_prediction": (
            EXPECTED_PREVIOUS_PREDICTION
        ),
        "prediction_difference": (
            prediction_difference
        ),
        "training_patients": (
            len(train_patients)
        ),
        "testing_patients": (
            len(test_patients)
        ),
        "patient_overlap": (
            len(patient_overlap)
        ),
        "training_observations": (
            len(X_train_transformed)
        ),
        "testing_observations": (
            len(X_test_transformed)
        ),
        "transformed_feature_count": (
            len(
                transformed_feature_names
            )
        ),
        "transformed_feature_names": (
            transformed_feature_names
        ),
        "model_estimator_type": (
            getattr(
                model,
                "_estimator_type",
                "unavailable",
            )
        ),
        "stored_gemex_task": (
            str(stored_task)
        ),
        "gemex_model_type": (
            str(gemex_model_type)
        ),
        "gemex_reported_prediction": (
            convert_to_serializable(
                gemex_reported_prediction
            )
        ),
        "fim_quality": fim_quality,
        "manifold_curvature": (
            manifold_curvature
        ),
        "maximum_absolute_gsf": (
            maximum_absolute_gsf
        ),
        "mean_absolute_gsf": (
            mean_absolute_gsf
        ),
        "nonzero_gsf_count": (
            nonzero_gsf_count
        ),
        "gsf_numerical_threshold": (
            GSF_NUMERICAL_THRESHOLD
        ),
        "task_is_regression": (
            task_is_regression
        ),
        "fim_is_not_poor": (
            fim_is_not_poor
        ),
        "gsf_scores_are_nontrivial": (
            gsf_scores_are_nontrivial
        ),
        "gemex_numerically_informative": (
            gemex_numerically_informative
        ),
        "gemex_configuration": (
            configuration_record
        ),
        "gemex_summary": str(summary),
        "top_five_features": str(
            top_features
        ),
        "top_three_interactions": str(
            top_interactions
        ),
        "result_dictionary": (
            result_dictionary
        ),
        "public_result_attributes": (
            public_attributes
        ),
    }

    METADATA_FILE.write_text(
        json.dumps(
            metadata,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Save human-readable summary
    # --------------------------------------------------------
    summary_lines = [
        "USTM-ALL-P GEMEX REGRESSION DIAGNOSTIC",
        "=" * 72,
        "",
        "SELECTED OBSERVATION",
        (
            f"Patient: "
            f"{selected_patient}"
        ),
        (
            f"Maintenance day: "
            f"{selected_day}"
        ),
        (
            f"Current ANC: "
            f"{current_anc:.6f} G/L"
        ),
        (
            f"Actual future ANC: "
            f"{actual_future_anc:.6f} G/L"
        ),
        (
            f"Random Forest prediction: "
            f"{predicted_future_anc:.6f} G/L"
        ),
        (
            "Direct model prediction: "
            f"{float(direct_prediction[0]):.6f} G/L"
        ),
        (
            "Difference from prior result: "
            f"{prediction_difference:.12f} G/L"
        ),
        "",
        "REGRESSION INTERFACE",
        (
            "Model estimator type: "
            f"{getattr(model, '_estimator_type', 'unavailable')}"
        ),
        (
            "Stored GEMEX task: "
            f"{stored_task}"
        ),
        (
            "GEMEX model type: "
            f"{gemex_model_type}"
        ),
        (
            "GEMEX reported prediction: "
            f"{gemex_reported_prediction}"
        ),
        "",
        "GEMEX SUMMARY",
        str(summary),
        "",
        "NUMERICAL VALIDITY",
        (
            "Maximum absolute GSF: "
            f"{maximum_absolute_gsf:.12e}"
        ),
        (
            "Mean absolute GSF: "
            f"{mean_absolute_gsf:.12e}"
        ),
        (
            "GSF scores above threshold: "
            f"{nonzero_gsf_count}/"
            f"{len(gsf_scores)}"
        ),
        (
            f"FIM quality: "
            f"{fim_quality}"
        ),
        (
            "Manifold curvature: "
            f"{manifold_curvature}"
        ),
        (
            "Numerically informative: "
            f"{gemex_numerically_informative}"
        ),
        "",
        "TOP FIVE FEATURES",
        str(top_features),
        "",
        "TOP THREE INTERACTIONS",
        str(top_interactions),
        "",
        "INTERPRETATION",
    ]

    if gemex_numerically_informative:
        summary_lines.extend(
            [
                (
                    "The diagnostic conditions were "
                    "satisfied. The result may be "
                    "considered for further batch "
                    "validation, but should not yet "
                    "be added to the manuscript."
                )
            ]
        )
    else:
        summary_lines.extend(
            [
                (
                    "The GEMEX explanation failed "
                    "one or more numerical-validity "
                    "conditions."
                ),
                (
                    "Do not use the GEMEX ranking "
                    "or visualization in the paper."
                ),
                (
                    "Inspect task handling, FIM "
                    "quality, raw scores, and the "
                    "result dictionary."
                ),
            ]
        )

    SUMMARY_FILE.write_text(
        "\n".join(summary_lines),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Final status
    # --------------------------------------------------------
    print("\n" + "=" * 72)
    print("OUTPUT FILES")
    print("=" * 72)

    print(
        f"Summary: "
        f"{SUMMARY_FILE}"
    )

    print(
        f"Metadata: "
        f"{METADATA_FILE}"
    )

    print(
        f"Feature scores: "
        f"{FEATURE_SCORE_FILE}"
    )

    print(
        f"Configuration: "
        f"{CONFIGURATION_FILE}"
    )

    print("\n" + "=" * 72)
    print("FINAL DIAGNOSTIC STATUS")
    print("=" * 72)

    if gemex_numerically_informative:
        print(
            "PASS: GEMEX produced a potentially "
            "informative local explanation."
        )

        print(
            "Next step: verify the continuous "
            "regression output and run a small "
            "multi-observation stability test."
        )

    else:
        print(
            "FAIL: GEMEX output is not currently "
            "suitable for quantitative reporting."
        )

        print(
            "Do not add GEMEX scores or rankings "
            "to the manuscript."
        )


if __name__ == "__main__":
    main()