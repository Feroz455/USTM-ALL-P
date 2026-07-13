from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit


# ------------------------------------------------------------
# File paths
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parent

LONGITUDINAL_FILE = (
    ROOT / "longitudinal_training_data.csv"
)

SCENARIO_FILE = (
    ROOT / "digital_twin_scenario_predictions.csv"
)

OUTPUT_FILE = (
    ROOT / "pkpd_feasibility_results.csv"
)

SUMMARY_FILE = (
    ROOT / "pkpd_feasibility_summary.csv"
)

SCENARIO_SUMMARY_FILE = (
    ROOT / "pkpd_feasibility_by_scenario.csv"
)

EXAMPLE_FILE = (
    ROOT / "pkpd_projection_example.csv"
)


# ------------------------------------------------------------
# Absolute mathematical bounds
# ------------------------------------------------------------
# ANC cannot be negative.
ABSOLUTE_ANC_MIN = 0.0

# This generous upper bound acts only as a numerical safeguard.
# The principal constraint comes from the training-simulation
# seven-day ANC-change envelope.
ABSOLUTE_ANC_MAX = 10.0


def main():
    print("=" * 72)
    print("USTM-ALL-P PK/PD FEASIBILITY CHECK")
    print("=" * 72)

    # --------------------------------------------------------
    # Validate files
    # --------------------------------------------------------
    if not LONGITUDINAL_FILE.exists():
        raise FileNotFoundError(
            f"Longitudinal file not found: "
            f"{LONGITUDINAL_FILE}"
        )

    if not SCENARIO_FILE.exists():
        raise FileNotFoundError(
            f"Scenario file not found: "
            f"{SCENARIO_FILE}"
        )

    longitudinal = pd.read_csv(
        LONGITUDINAL_FILE
    )

    scenarios = pd.read_csv(
        SCENARIO_FILE
    )

    required_longitudinal = {
        "patient_id",
        "current_anc",
        "future_anc_7d",
        "anc_change_7d",
    }

    missing_longitudinal = (
        required_longitudinal
        .difference(longitudinal.columns)
    )

    if missing_longitudinal:
        raise ValueError(
            "Longitudinal dataset is missing: "
            f"{sorted(missing_longitudinal)}"
        )

    required_scenario = {
        "patient_id",
        "maintenance_day",
        "scenario",
        "current_anc",
        "predicted_future_anc",
    }

    missing_scenario = (
        required_scenario
        .difference(scenarios.columns)
    )

    if missing_scenario:
        raise ValueError(
            "Scenario dataset is missing: "
            f"{sorted(missing_scenario)}"
        )

    # --------------------------------------------------------
    # Reproduce the original patient-level split
    # --------------------------------------------------------
    groups = longitudinal[
        "patient_id"
    ].copy()

    placeholder_x = longitudinal[
        ["current_anc"]
    ].copy()

    placeholder_y = longitudinal[
        "future_anc_7d"
    ].copy()

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_indices, test_indices = next(
        splitter.split(
            placeholder_x,
            placeholder_y,
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
            f"Patient leakage found: {sorted(overlap)}"
        )

    scenario_patients = set(
        scenarios["patient_id"].unique()
    )

    unexpected_patients = (
        scenario_patients
        .difference(test_patients)
    )

    if unexpected_patients:
        raise RuntimeError(
            "Scenario file contains patients outside "
            "the held-out test set: "
            f"{sorted(unexpected_patients)}"
        )

    print(f"Training patients: {len(train_patients)}")
    print(f"Testing patients: {len(test_patients)}")
    print(f"Patient overlap: {len(overlap)}")
    print(f"Scenario predictions: {len(scenarios)}")

    # --------------------------------------------------------
    # Construct simulation-derived feasibility envelope
    # using training patients only
    # --------------------------------------------------------
    training_data = longitudinal.iloc[
        train_indices
    ].copy()

    change_lower = float(
        training_data["anc_change_7d"].min()
    )

    change_upper = float(
        training_data["anc_change_7d"].max()
    )

    print("\nTraining-derived seven-day ANC-change envelope:")
    print(f"Lower change bound: {change_lower:.6f} G/L")
    print(f"Upper change bound: {change_upper:.6f} G/L")

    # --------------------------------------------------------
    # Calculate prediction-specific feasible intervals
    # --------------------------------------------------------
    results = scenarios.copy()

    results["predicted_anc_change_7d"] = (
        results["predicted_future_anc"]
        - results["current_anc"]
    )

    # Local feasible interval relative to current ANC.
    results["local_lower_bound"] = (
        results["current_anc"]
        + change_lower
    )

    results["local_upper_bound"] = (
        results["current_anc"]
        + change_upper
    )

    # Apply absolute mathematical limits.
    results["feasible_lower_bound"] = np.maximum(
        results["local_lower_bound"],
        ABSOLUTE_ANC_MIN,
    )

    results["feasible_upper_bound"] = np.minimum(
        results["local_upper_bound"],
        ABSOLUTE_ANC_MAX,
    )

    # Identify violation type.
    results["below_lower_bound"] = (
        results["predicted_future_anc"]
        < results["feasible_lower_bound"]
    )

    results["above_upper_bound"] = (
        results["predicted_future_anc"]
        > results["feasible_upper_bound"]
    )

    results["pkpd_feasible"] = ~(
        results["below_lower_bound"]
        | results["above_upper_bound"]
    )

    results["pkpd_flag"] = np.select(
        [
            results["below_lower_bound"],
            results["above_upper_bound"],
        ],
        [
            "Infeasible: below envelope",
            "Infeasible: above envelope",
        ],
        default="Feasible",
    )

    # --------------------------------------------------------
    # Projection to nearest feasible boundary
    # --------------------------------------------------------
    results["corrected_future_anc"] = np.clip(
        results["predicted_future_anc"],
        results["feasible_lower_bound"],
        results["feasible_upper_bound"],
    )

    results["correction_magnitude"] = np.abs(
        results["corrected_future_anc"]
        - results["predicted_future_anc"]
    )

    results["was_corrected"] = (
        results["correction_magnitude"]
        > 1.0e-12
    )

    # Confirm every corrected prediction is feasible.
    results["corrected_feasible"] = (
        (
            results["corrected_future_anc"]
            >= results["feasible_lower_bound"]
        )
        & (
            results["corrected_future_anc"]
            <= results["feasible_upper_bound"]
        )
    )

    if not results["corrected_feasible"].all():
        raise RuntimeError(
            "At least one projected prediction remains "
            "outside the feasibility envelope."
        )

    # --------------------------------------------------------
    # Overall statistics
    # --------------------------------------------------------
    total_predictions = len(results)

    infeasible_count = int(
        (~results["pkpd_feasible"]).sum()
    )

    corrected_count = int(
        results["was_corrected"].sum()
    )

    infeasible_percentage = (
        infeasible_count
        / total_predictions
        * 100.0
        if total_predictions > 0
        else 0.0
    )

    corrected_percentage = (
        corrected_count
        / total_predictions
        * 100.0
        if total_predictions > 0
        else 0.0
    )

    if corrected_count > 0:
        mean_correction_all = float(
            results.loc[
                results["was_corrected"],
                "correction_magnitude",
            ].mean()
        )

        maximum_correction = float(
            results["correction_magnitude"].max()
        )
    else:
        mean_correction_all = 0.0
        maximum_correction = 0.0

    below_count = int(
        results["below_lower_bound"].sum()
    )

    above_count = int(
        results["above_upper_bound"].sum()
    )

    summary = pd.DataFrame(
        [
            {
                "statistic": (
                    "Total predictions checked"
                ),
                "value": total_predictions,
            },
            {
                "statistic": (
                    "Infeasible predictions"
                ),
                "value": infeasible_count,
            },
            {
                "statistic": (
                    "Infeasible predictions (%)"
                ),
                "value": infeasible_percentage,
            },
            {
                "statistic": (
                    "Below-envelope predictions"
                ),
                "value": below_count,
            },
            {
                "statistic": (
                    "Above-envelope predictions"
                ),
                "value": above_count,
            },
            {
                "statistic": (
                    "Predictions corrected"
                ),
                "value": corrected_count,
            },
            {
                "statistic": (
                    "Predictions corrected (%)"
                ),
                "value": corrected_percentage,
            },
            {
                "statistic": (
                    "Mean correction magnitude "
                    "among corrected predictions"
                ),
                "value": mean_correction_all,
            },
            {
                "statistic": (
                    "Maximum correction magnitude"
                ),
                "value": maximum_correction,
            },
            {
                "statistic": (
                    "Training change lower bound"
                ),
                "value": change_lower,
            },
            {
                "statistic": (
                    "Training change upper bound"
                ),
                "value": change_upper,
            },
        ]
    )

    # --------------------------------------------------------
    # Scenario-specific statistics
    # --------------------------------------------------------
    scenario_summary = (
        results
        .groupby(
            "scenario",
            sort=False,
        )
        .agg(
            total_predictions=(
                "predicted_future_anc",
                "count",
            ),
            infeasible_predictions=(
                "pkpd_feasible",
                lambda values: int(
                    (~values).sum()
                ),
            ),
            corrected_predictions=(
                "was_corrected",
                "sum",
            ),
            mean_original_anc=(
                "predicted_future_anc",
                "mean",
            ),
            mean_corrected_anc=(
                "corrected_future_anc",
                "mean",
            ),
            mean_correction_magnitude=(
                "correction_magnitude",
                "mean",
            ),
            maximum_correction_magnitude=(
                "correction_magnitude",
                "max",
            ),
        )
        .reset_index()
    )

    scenario_summary[
        "infeasible_percentage"
    ] = (
        scenario_summary[
            "infeasible_predictions"
        ]
        / scenario_summary[
            "total_predictions"
        ]
        * 100.0
    )

    scenario_summary[
        "corrected_percentage"
    ] = (
        scenario_summary[
            "corrected_predictions"
        ]
        / scenario_summary[
            "total_predictions"
        ]
        * 100.0
    )

    # --------------------------------------------------------
    # Select example for Figure 3
    # --------------------------------------------------------
    infeasible_rows = results.loc[
        ~results["pkpd_feasible"]
    ].copy()

    if not infeasible_rows.empty:
        # Select the label of the row with the largest correction.
        example_label = infeasible_rows[
            "correction_magnitude"
        ].idxmax()

        example = results.loc[
            [example_label]
        ].copy()

        example_reason = (
            "largest correction among infeasible "
            "scenario predictions"
        )

    else:
        # If no violations occurred, choose the prediction
        # closest to the median using positional indexing.
        median_prediction = float(
            results["predicted_future_anc"].median()
        )

        distances = np.abs(
            results["predicted_future_anc"].to_numpy()
            - median_prediction
        )

        example_position = int(
            np.argmin(distances)
        )

        example = results.iloc[
            [example_position]
        ].copy()

        example_reason = (
            "representative feasible prediction; "
            "no projection was required"
        )

    example["example_selection_reason"] = (
        example_reason
    )




    # --------------------------------------------------------
    # Save outputs
    # --------------------------------------------------------
    results.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    summary.to_csv(
        SUMMARY_FILE,
        index=False,
    )

    scenario_summary.to_csv(
        SCENARIO_SUMMARY_FILE,
        index=False,
    )

    example.to_csv(
        EXAMPLE_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Print results
    # --------------------------------------------------------
    print("\n" + "=" * 72)
    print("OVERALL FEASIBILITY RESULTS")
    print("=" * 72)

    print(f"Total predictions checked: {total_predictions}")

    print(
        "Infeasible predictions: "
        f"{infeasible_count} "
        f"({infeasible_percentage:.2f}%)"
    )

    print(
        f"Below-envelope predictions: {below_count}"
    )

    print(
        f"Above-envelope predictions: {above_count}"
    )

    print(
        "Predictions corrected: "
        f"{corrected_count} "
        f"({corrected_percentage:.2f}%)"
    )

    print(
        "Mean correction magnitude among corrected "
        f"predictions: {mean_correction_all:.6f} G/L"
    )

    print(
        "Maximum correction magnitude: "
        f"{maximum_correction:.6f} G/L"
    )

    print("\n" + "=" * 72)
    print("FEASIBILITY RESULTS BY SCENARIO")
    print("=" * 72)

    printable_scenario_summary = (
        scenario_summary.copy()
    )

    numeric_columns = [
        "mean_original_anc",
        "mean_corrected_anc",
        "mean_correction_magnitude",
        "maximum_correction_magnitude",
        "infeasible_percentage",
        "corrected_percentage",
    ]

    printable_scenario_summary[
        numeric_columns
    ] = printable_scenario_summary[
        numeric_columns
    ].round(6)

    print(
        printable_scenario_summary.to_string(
            index=False
        )
    )

    print("\n" + "=" * 72)
    print("EXAMPLE PROJECTION RECORD")
    print("=" * 72)

    print(
        example[
            [
                "patient_id",
                "maintenance_day",
                "scenario",
                "current_anc",
                "predicted_future_anc",
                "feasible_lower_bound",
                "feasible_upper_bound",
                "pkpd_flag",
                "corrected_future_anc",
                "correction_magnitude",
                "example_selection_reason",
            ]
        ].to_string(index=False)
    )

    print("\nOutput files:")
    print(f"All checked predictions: {OUTPUT_FILE}")
    print(f"Overall summary: {SUMMARY_FILE}")
    print(
        "Scenario-level summary: "
        f"{SCENARIO_SUMMARY_FILE}"
    )
    print(f"Projection example: {EXAMPLE_FILE}")

    print(
        "\nImportant: This is a simulation-derived "
        "prototype feasibility envelope, not a "
        "clinically validated ANC rule."
    )


if __name__ == "__main__":
    main()