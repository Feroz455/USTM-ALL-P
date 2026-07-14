# USTM-ALL-P

A research prototype implementing the USTM-ALL framework for trustworthy, PK/PD-constrained, explainable digital twin decision support in Childhood Acute Lymphoblastic Leukemia (ALL).

## Requirements

- Python 3.12+
- Git

## Clone Repository

```bash
git clone https://github.com/Feroz455/USTM-ALL-P.git
cd USTM-ALL-P
```

## Create Virtual Environment

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## Install Dependencies

```bash
pip install -r requirements.txt
```

## Run Backend

```bash
cd backend
python app.py
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```text
USTM-ALL-P/
├── backend/
├── frontend/
├── docs/
├── scripts/
└── docker/
```

## Notes

This repository is intended for research and experimental purposes only and is not intended for clinical use.
