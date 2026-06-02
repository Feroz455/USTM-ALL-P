"""
scripts/save_tokenizers.py
--------------------------
One-time helper: load your trained model + re-fit tokenizers from the
original data files, then save them as pickles alongside the .h5 model.

Run this ONCE from the project root:
    python scripts/save_tokenizers.py \
        --ligands  backend/data/ligands.txt \
        --proteins backend/data/proteins.txt \
        --affinity backend/data/Y.tab \
        --model    backend/models/bilstm_l2_bilstm_l2.h5

After this, the FastAPI backend can load model + tokenizers at startup
without any manual steps.
"""

import argparse
import json
import os
import pickle
import sys

import numpy as np
import pandas as pd


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ligands",  required=True)
    parser.add_argument("--proteins", required=True)
    parser.add_argument("--affinity", required=True)
    parser.add_argument("--model",    required=True)
    args = parser.parse_args()

    model_dir = os.path.dirname(args.model)

    # ── Load raw data ──────────────────────────────────────────────────────
    print("Loading ligands...")
    with open(args.ligands) as f:
        lig_dict = json.load(f)
    ligands = list(lig_dict.values())

    print("Loading proteins...")
    with open(args.proteins) as f:
        prot_dict = json.load(f)
    proteins = [v.replace("\n","").replace("\r","").strip() for v in prot_dict.values()]

    print("Loading affinity matrix...")
    Y_df = pd.read_csv(args.affinity, sep="\t")
    Y = Y_df.iloc[:, 1:].to_numpy(dtype=float)

    masked = np.ma.masked_invalid(Y)
    mean_val = float(np.ma.mean(masked))
    if not np.isfinite(mean_val):
        mean_val = 0.0
    Y[np.isnan(Y)] = mean_val
    Y[np.isinf(Y)] = mean_val

    # ── Fit tokenizers (char-level, exactly NB-4) ─────────────────────────
    print("Fitting ligand tokenizer...")
    from tensorflow.keras.preprocessing.text import Tokenizer
    from sklearn.preprocessing import StandardScaler

    lig_tok = Tokenizer(char_level=True)
    lig_tok.fit_on_texts(ligands)

    print("Fitting protein tokenizer...")
    prot_tok = Tokenizer(char_level=True)
    prot_tok.fit_on_texts(proteins)

    print("Fitting scaler...")
    scaler = StandardScaler()
    scaler.fit(Y.flatten().reshape(-1, 1))

    # ── Save ──────────────────────────────────────────────────────────────
    for obj, fname in [
        (lig_tok,  "ligand_tokenizer.pkl"),
        (prot_tok, "protein_tokenizer.pkl"),
        (scaler,   "scaler.pkl"),
    ]:
        out = os.path.join(model_dir, fname)
        with open(out, "wb") as f:
            pickle.dump(obj, f)
        print(f"Saved: {out}")

    # ── Verify model loads ────────────────────────────────────────────────
    print("Verifying model load...")
    import tensorflow as tf
    model = tf.keras.models.load_model(args.model)
    model.summary()
    print("\nAll tokenizers saved successfully.")
    print(f"Ligand vocab size : {len(lig_tok.word_index)}")
    print(f"Protein vocab size: {len(prot_tok.word_index)}")


if __name__ == "__main__":
    main()
