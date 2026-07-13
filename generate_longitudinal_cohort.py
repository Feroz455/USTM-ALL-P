from pathlib import Path
from types import SimpleNamespace
import sys
import time

import numpy as np
import pandas as pd


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

# Allow imports such as: from app.modules...
sys.path.insert(0, str(BACKEND_DIR))

from app.modules.ode.full_drug_adapter import run_full_drug_simulation


# ------------------------------------------------------------
# Experiment configuration
# ------------------------------------------------------------
INPUT_FILE = ROOT_DIR / "synthetic_all_patients.csv"
OUTPUT_FILE = ROOT_DIR / "longitudinal_training_data.csv"
FAILURE_FILE = ROOT_DIR / "longitudinal_simulation_failures.csv"

N_PATIENTS = 50
RANDOM_SEED = 42

MAINTENANCE_START_DAY = 140
MAINTENANCE_END_DAY = 243
FORECAST_HORIZON_DAYS = 7


def get_value(row, possible_names, default):
    """
    Return the first available non-missing column value.
    Supports slightly different column names in the synthetic CSV.
    """
    for name in possible_names:
        if name in row.index and pd.notna(row[name]):
            return row[name]
    return default


def nearest_row(timeseries, target_day):
    """Return the ODE observation nearest to the requested day."""
    index = (timeseries["day"] - target_day).abs().idxmin()
    return timeseries.loc[index]


def main():
    print("=" * 70)
    print("USTM-ALL-P LONGITUDINAL COHORT GENERATION")
    print("=" * 70)

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input dataset was not found:\n{INPUT_FILE}"
        )

    baseline = pd.read_csv(INPUT_FILE)

    print(f"Input dataset: {INPUT_FILE}")
    print(f"Available patients: {len(baseline)}")
    print(f"Patients requested: {N_PATIENTS}")

    if len(baseline) < N_PATIENTS:
        raise ValueError(
            f"Only {len(baseline)} patients are available, "
            f"but {N_PATIENTS} were requested."
        )

    # Fixed seed ensures reproducibility.
    rng = np.random.default_rng(RANDOM_SEED)

    # Randomly select patients without replacement.
    selected = baseline.sample(
        n=N_PATIENTS,
        replace=False,
        random_state=RANDOM_SEED,
    ).reset_index(drop=True)

    training_records = []
    failures = []

    start_time = time.time()

    for patient_index, row in selected.iterrows():
        patient_id = str(
            get_value(
                row,
                ["patient_id", "Patient_ID", "id"],
                f"PATIENT_{patient_index + 1:04d}",
            )
        )

        weight = float(
            get_value(row, ["weight", "weight_kg", "Weight_kg"], 30.0)
        )
        height = float(
            get_value(row, ["height", "height_cm", "Height_cm"], 135.0)
        )
        tpmt = float(
            get_value(row, ["tpmt", "TPMT"], 1.0)
        )
        vitamin_d = float(
            get_value(row, ["vitamin_d", "Vitamin_D"], 30.0)
        )
        diet = float(
            get_value(row, ["diet_score", "diet", "Diet"], 1.0)
        )
        exercise = float(
            get_value(
                row,
                ["exercise_score", "exercise", "Exercise"],
                0.5,
            )
        )
        baseline_wbc = float(
            get_value(
                row,
                ["baseline_wbc", "wbc0", "WBC"],
                4.5,
            )
        )
        baseline_anc = float(
            get_value(
                row,
                ["baseline_anc", "anc0", "ANC"],
                2.0,
            )
        )
        age = float(
            get_value(row, ["age", "Age"], np.nan)
        )
        sex = str(
            get_value(row, ["sex", "Sex"], "Unknown")
        )
        infection = int(
            get_value(row, ["infection", "Infection"], 0)
        )
        inflammation = float(
            get_value(
                row,
                ["baseline_inflammation", "inflammation"],
                np.nan,
            )
        )

        # Introduce reproducible synthetic dose variation.
        # These are research simulation inputs, not clinical recommendations.
        dose_6mp = float(rng.uniform(40.0, 60.0))
        dose_mtx = float(rng.uniform(16.0, 24.0))
        dose_vcr = float(rng.uniform(1.0, 1.5))

        config = SimpleNamespace(
            weight_kg=weight,
            height_cm=height,
            tpmt=tpmt,
            vitamin_d=vitamin_d,
            diet=diet,
            exercise=exercise,
            wbc0=baseline_wbc,
            anc0=baseline_anc,

            active_drugs=["6mp", "mtx", "vcr"],

            dose_6mp_mg=dose_6mp,
            dose_mtx_mg=dose_mtx,
            dose_vcr_mg=dose_vcr,
            dose_dnr_mg_m2=25.0,

            peg_dose_per_m2=2500.0,
            peg_dose_days=[4, 36, 57, 91],

            dose_ster_mg_m2=40.0,
            dose_arac_mg_m2=75.0,
            dose_cpm_mg_m2=1000.0,
            dose_6tg_mg_m2=60.0,
            dose_cop_mg=60.0,
            dose_nov_mg_kg=10.0,

            custom_phases=[],
            t_end=250.0,
        )

        print(
            f"[{patient_index + 1:02d}/{N_PATIENTS}] "
            f"Simulating {patient_id}...",
            end=" ",
            flush=True,
        )

        patient_start = time.time()
        result = run_full_drug_simulation(config)
        elapsed = time.time() - patient_start

        if not result.get("success", False):
            error_message = str(result.get("error", "Unknown error"))

            failures.append({
                "patient_id": patient_id,
                "error": error_message,
            })

            print(f"FAILED ({elapsed:.1f} seconds)")
            continue

        timeseries = result["timeseries"]

        trajectory = pd.DataFrame({
            "day": timeseries["t"],
            "wbc": timeseries["wbc"],
            "anc": timeseries["anc"],
            "vipn": timeseries["vipn"],
        })

        # Weekly maintenance prediction points:
        # 140 -> 147, 147 -> 154, ..., 231 -> 238.
        prediction_days = range(
            MAINTENANCE_START_DAY,
            MAINTENANCE_END_DAY - FORECAST_HORIZON_DAYS + 1,
            FORECAST_HORIZON_DAYS,
        )

        patient_record_count = 0
        previous_anc = None

        for current_day in prediction_days:
            future_day = current_day + FORECAST_HORIZON_DAYS

            current = nearest_row(trajectory, current_day)
            future = nearest_row(trajectory, future_day)

            if previous_anc is None:
                anc_slope_7d = 0.0
            else:
                anc_slope_7d = (
                    float(current["anc"]) - previous_anc
                ) / FORECAST_HORIZON_DAYS

            training_records.append({
                "patient_id": patient_id,
                "age": age,
                "sex": sex,
                "weight_kg": weight,
                "height_cm": height,
                "bsa": np.sqrt(weight * height / 3600.0),
                "tpmt": tpmt,
                "vitamin_d": vitamin_d,
                "diet_score": diet,
                "exercise_score": exercise,
                "infection": infection,
                "baseline_inflammation": inflammation,

                "maintenance_day": float(current["day"]),
                "maintenance_week": int(
                    ((float(current["day"]) - MAINTENANCE_START_DAY) / 7)
                    + 1
                ),

                "current_wbc": float(current["wbc"]),
                "current_anc": float(current["anc"]),
                "current_vipn": float(current["vipn"]),
                "previous_anc": (
                    float(previous_anc)
                    if previous_anc is not None
                    else float(current["anc"])
                ),
                "anc_slope_7d": float(anc_slope_7d),

                "dose_6mp_mg": dose_6mp,
                "dose_mtx_mg": dose_mtx,
                "dose_vcr_mg": dose_vcr,

                "target_day": float(future["day"]),
                "future_wbc_7d": float(future["wbc"]),
                "future_anc_7d": float(future["anc"]),
                "anc_change_7d": (
                    float(future["anc"]) -
                    float(current["anc"])
                ),
            })

            previous_anc = float(current["anc"])
            patient_record_count += 1

        print(
            f"OK: {patient_record_count} records "
            f"({elapsed:.1f} seconds)"
        )

    # --------------------------------------------------------
    # Save results
    # --------------------------------------------------------
    longitudinal_data = pd.DataFrame(training_records)
    longitudinal_data.to_csv(OUTPUT_FILE, index=False)

    if failures:
        pd.DataFrame(failures).to_csv(FAILURE_FILE, index=False)

    total_elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("LONGITUDINAL COHORT GENERATION COMPLETED")
    print("=" * 70)
    print(f"Successful patients: {N_PATIENTS - len(failures)}")
    print(f"Failed patients: {len(failures)}")
    print(f"Training records: {len(longitudinal_data)}")
    print(f"Variables: {len(longitudinal_data.columns)}")
    print(f"Missing values: {longitudinal_data.isna().sum().sum()}")
    print(f"Runtime: {total_elapsed / 60:.2f} minutes")
    print(f"Saved to: {OUTPUT_FILE}")

    if not longitudinal_data.empty:
        print("\nSeven-day ANC change summary:")
        print(
            longitudinal_data["anc_change_7d"]
            .describe()
            .to_string()
        )

        print("\nFuture ANC summary:")
        print(
            longitudinal_data["future_anc_7d"]
            .describe()
            .to_string()
        )

        print("\nFirst five records:")
        print(longitudinal_data.head().to_string(index=False))

        print("\nUnique patients:")
        print(longitudinal_data["patient_id"].nunique())

        duplicate_count = longitudinal_data.duplicated(
            subset=["patient_id", "maintenance_day"]
        ).sum()

        print(f"Duplicate patient-day records: {duplicate_count}")

    if failures:
        print(f"\nFailures saved to: {FAILURE_FILE}")


if __name__ == "__main__":
    main()