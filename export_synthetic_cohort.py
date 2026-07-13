from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd

from backend.app.modules.gan_v2.dummy_data import generate_dummy_patient


N_PATIENTS = 1000
RANDOM_SEED = 42


def main():
    rng = np.random.default_rng(RANDOM_SEED)
    records = []

    for patient_number in range(1, N_PATIENTS + 1):
        patient = generate_dummy_patient(rng=rng)
        record = asdict(patient)

        # Use a clear, sequential, anonymous patient identifier.
        record["patient_id"] = f"USTM_{patient_number:04d}"
        records.append(record)

    cohort = pd.DataFrame(records)

    # Save in the repository root.
    output_path = Path("synthetic_all_patients.csv")
    cohort.to_csv(output_path, index=False)

    print("=" * 60)
    print("SYNTHETIC COHORT GENERATED SUCCESSFULLY")
    print("=" * 60)
    print(f"Number of patients: {len(cohort)}")
    print(f"Number of variables: {len(cohort.columns)}")
    print(f"Dataset shape: {cohort.shape}")
    print(f"Saved to: {output_path.resolve()}")

    print("\nColumns:")
    for column in cohort.columns:
        print(f"  - {column}")

    print("\nFirst five records:")
    print(cohort.head().to_string())

    print("\nNumerical summary:")
    print(cohort.describe().transpose().to_string())

    print("\nMissing values:")
    print(cohort.isna().sum().to_string())


if __name__ == "__main__":
    main()