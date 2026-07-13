from types import SimpleNamespace
from pathlib import Path

import pandas as pd

from full_drug_adapter import run_full_drug_simulation


def main():
    # Configuration for one synthetic pediatric ALL patient.
    # Values correspond approximately to the test patient generated earlier.
    config = SimpleNamespace(
        weight_kg=10.6,
        height_cm=91.5,
        tpmt=1.0,
        vitamin_d=35.7,
        diet=1.1927,
        exercise=1.0,
        wbc0=3.28,
        anc0=1.04,

        # Maintenance-relevant treatment components.
        active_drugs=[
            "6mp",
            "mtx",
            "vcr",
        ],

        # Treatment doses.
        dose_6mp_mg=50.0,
        dose_mtx_mg=20.0,
        dose_vcr_mg=1.2,
        dose_dnr_mg_m2=25.0,

        # PEG-ASP settings; inactive in this test.
        peg_dose_per_m2=2500.0,
        peg_dose_days=[4, 36, 57, 91],

        # Other model dose parameters.
        dose_ster_mg_m2=40.0,
        dose_arac_mg_m2=75.0,
        dose_cpm_mg_m2=1000.0,
        dose_6tg_mg_m2=60.0,
        dose_cop_mg=60.0,
        dose_nov_mg_kg=10.0,

        # Use the standard treatment phases.
        custom_phases=[],
        t_end=250.0,
    )

    print("Starting full-drug ODE simulation...")

    result = run_full_drug_simulation(config)

    if not result.get("success", False):
        print("Simulation failed.")
        print("Error:", result.get("error"))
        return

    print("Simulation completed successfully.")

    summary = result["summary"]
    timeseries = result["timeseries"]

    print("\nSummary")
    print("-" * 50)
    print(f"BSA: {summary.get('bsa')}")
    print(f"WBC minimum: {summary.get('wbc_min')}")
    print(f"WBC minimum day: {summary.get('wbc_min_day')}")
    print(f"ANC minimum: {summary.get('anc_min')}")
    print(f"ANC minimum day: {summary.get('anc_min_day')}")
    print(f"WBC in maintenance target: "
          f"{summary.get('wbc_in_target_pct')}%")
    print(f"ANC in maintenance target: "
          f"{summary.get('anc_in_target_pct')}%")

    # Build a tabular longitudinal dataset.
    time_series_df = pd.DataFrame({
        "day": timeseries["t"],
        "wbc": timeseries["wbc"],
        "anc": timeseries["anc"],
        "vipn": timeseries["vipn"],
    })

    output_path = Path("full_drug_test_timeseries.csv")
    time_series_df.to_csv(output_path, index=False)

    print("\nTime-series information")
    print("-" * 50)
    print(f"Shape: {time_series_df.shape}")
    print(f"Columns: {time_series_df.columns.tolist()}")
    print(f"Day range: {time_series_df['day'].min()} "
          f"to {time_series_df['day'].max()}")
    print(f"Missing values: {time_series_df.isna().sum().sum()}")

    print("\nFirst five observations:")
    print(time_series_df.head().to_string(index=False))

    print("\nLast five observations:")
    print(time_series_df.tail().to_string(index=False))

    print(f"\nSaved to: {output_path.resolve()}")


if __name__ == "__main__":
    main()