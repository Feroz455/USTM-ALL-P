# USTM-ALL-P

## A Unified Six-Domain Theoretical Model and Prototype Implementation for Trustworthy, PK/PD-Constrained, Explainable Digital Twin Decision Support in Childhood Acute Lymphoblastic Leukemia

---

## Overview

USTM-ALL-P (Unified Six-Domain Theoretical Model for Acute Lymphoblastic Leukemia – Prototype) is a research-oriented decision support framework designed for childhood Acute Lymphoblastic Leukemia (ALL).

The project introduces a novel six-domain architecture that integrates synthetic patient generation, machine learning, digital twin simulation, pharmacokinetic/pharmacodynamic (PK/PD) knowledge, uncertainty estimation, and explainable artificial intelligence (XAI) into a unified decision-support workflow.

The purpose of this work is to explore how trustworthy and explainable AI systems can support future research in pediatric leukemia through simulation-driven predictions and digital-twin-based scenario analysis.

---

## Research Motivation

Childhood ALL treatment requires continuous monitoring of hematological indicators such as Absolute Neutrophil Count (ANC) and White Blood Cell (WBC) counts during maintenance therapy. While advances have been made in digital twins, synthetic patient generation, PK/PD modeling, drug repositioning, and explainable AI, these technologies are often investigated independently.

USTM-ALL-P aims to bridge this gap by providing an integrated framework that combines these domains into a single research pipeline capable of:

- Generating synthetic patient populations
- Simulating disease and treatment dynamics
- Predicting future patient states
- Evaluating alternative treatment scenarios
- Quantifying prediction uncertainty
- Explaining model decisions
- Supporting trustworthy AI research in healthcare

---

## Key Contributions

### 1. USTM-ALL Framework

A novel six-domain theoretical framework connecting:

- Synthetic Patient Generation
- Deep Learning
- Drug Repurposing
- Digital Twin Simulation
- PK/PD Modeling
- Explainable Artificial Intelligence

### 2. USTM-ALL-P Prototype

A proof-of-concept implementation demonstrating the practical integration of the framework's core components.

### 3. Digital Twin-Based Decision Support

Simulation of multiple treatment scenarios to estimate future clinical outcomes under alternative therapeutic conditions.

### 4. PK/PD-Constrained Predictions

Incorporation of biologically informed feasibility constraints to verify prediction consistency.

### 5. Explainable AI Integration

Transparent prediction explanations using SHAP-based interpretation methods.

### 6. Uncertainty-Aware Predictions

Conformal prediction methods that provide confidence intervals alongside model predictions.

---

## System Architecture

```text
┌───────────────────────┐
│ Synthetic Patients    │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Deep Learning Models  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Digital Twin Engine   │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ PK/PD Constraints     │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Uncertainty Analysis  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Explainable AI (SHAP) │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Decision Support      │
└───────────────────────┘
```

---

## Prototype Pipeline

The current prototype includes:

### Synthetic Cohort Generation

- 1,000 synthetic pediatric ALL patients
- Demographic and clinical variable generation
- Treatment-related attributes
- PK/PD variability parameters

### ODE-Based Simulation

Generation of longitudinal treatment trajectories using mechanistic disease and treatment models.

### Predictive Modeling

- Random Forest Regression
- Seven-day ahead ANC prediction
- Patient-level train-test separation

### Digital Twin Scenarios

Evaluation of treatment alternatives:

- Continue current treatment
- 20% reduction in 6MP dosage
- 20% reduction in MTX dosage
- Temporary treatment hold

### Feasibility Verification

Post-prediction verification against biologically plausible ranges derived from simulation data.

### Explainability

- Global feature importance
- Local prediction explanations
- SHAP-based model transparency

### Uncertainty Quantification

- Patient-grouped conformal prediction
- Prediction interval generation
- Coverage analysis

---

## Current Results

The proof-of-concept implementation achieved:

- MAE: 0.0137 G/L
- RMSE: 0.0185 G/L
- R² Score: 0.9893
- Conformal Coverage: 89.29%
- Scenario Evaluations: 560 predictions

These results demonstrate internal consistency within a synthetic simulation environment and should not be interpreted as evidence of clinical effectiveness.

---

## Relationship to the STING Project

USTM-ALL-P is an independent research contribution developed within the broader research ecosystem of the TÜBİTAK 1001 Project:

**STING: Development of a Drug Repositioning Decision Support System for Childhood Acute Leukemia Using Digital Twin-Oriented Deep Learning**

While the project utilizes concepts, methodologies, and certain infrastructure elements originating from STING, USTM-ALL-P represents a distinct research contribution introducing:

- A new theoretical framework (USTM-ALL)
- A six-domain integration architecture
- Trustworthy AI mechanisms
- PK/PD-constrained decision support
- Conformal uncertainty estimation
- Integrated explainability-driven decision workflows

Therefore, this repository should be viewed as an extension and independent research implementation rather than a direct copy of the STING repository.

---

## Future Directions

Planned research extensions include:

- Real patient data validation
- Graph Neural Network (GNN) integration
- Drug repositioning implementation
- Advanced digital twin personalization
- Dynamic PK/PD optimization
- Causal explainability methods
- Reinforcement learning-based treatment planning
- Clinical expert evaluation studies

---

## Research Use Only

⚠️ **Important Notice**

This repository is intended exclusively for research and educational purposes.

The system:

- Has not been clinically validated
- Uses synthetic patient data
- Is not approved for healthcare use
- Must not be used for diagnosis
- Must not be used for treatment planning
- Must not be used for clinical decision-making

All outputs are experimental and should be interpreted within a research context only.

---

## Citation

If you use this repository in academic work, please cite:

```bibtex
@article{mahmud2026ustmallp,
  title={USTM-ALL-P: A Unified Six-Domain Theoretical Model and Prototype Implementation for Trustworthy, PK/PD-Constrained, Explainable Digital Twin Decision Support in Childhood Acute Lymphoblastic Leukemia},
  author={Mahmud, Mohammad Firoz and Kose, Utku},
  year={2026}
}
```

---

## Author

**Mohammad Firoz Mahmud**

Institute of Information and Communication Technology (IICT)

Bangladesh University of Engineering and Technology (BUET)

Researcher, TÜBİTAK STING Project

GitHub: https://github.com/Feroz455

---

## Supervisor

**Prof. Dr. Utku Köse**

Department of Computer Engineering

Süleyman Demirel University

Isparta, Türkiye

---

## Acknowledgments

This work was conducted within the scope of:

**TÜBİTAK 1001 Project No. 123E383**

**"Development of a Drug Repositioning Decision Support System for Childhood Acute Leukemia Using Digital Twin-Oriented Deep Learning (STING)"**

We gratefully acknowledge the support of TÜBİTAK and the STING research team.

---

## License

This repository is released for academic and research purposes.

Please ensure proper attribution when using any part of this work and respect the licenses of all third-party dependencies and referenced projects.
