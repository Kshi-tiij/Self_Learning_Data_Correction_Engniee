# SLDCE PRO

### Self-Learning Data Cleaning & Validation Engine

---

## Overview

SLDCE PRO is a data-centric machine learning system designed to identify, review, and correct noisy or incorrect labels in datasets.

The system focuses on improving data quality rather than modifying model architecture. By refining the dataset through human feedback, it enables more reliable model performance over time.

---

## Core Idea

Better data leads to better models.

The system follows this pipeline:

Train Model → Detect Suspicious Data → Human Review → Correct Labels → Retrain

---

## Features

### 1. Suspicious Data Detection

The system identifies potentially incorrect labels using multiple signals:

* Model confidence
* Prediction entropy
* Isolation Forest (anomaly detection)
* Ensemble disagreement
* Centroid distance

---

### 2. Human Review Interface

Users can review flagged samples and choose:

* Approve: label is correct
* Reject: label is incorrect (requires corrected value)
* Unsure: insufficient confidence to decide

---

### 3. Signal-Based Explainability

Each sample includes supporting signals such as:

* Confidence score
* Entropy (uncertainty)
* Anomaly score
* Feature-level information

---

### 4. Feedback Logging

User decisions are stored in:

memory_log.csv

This enables traceability and supports future retraining.

---

### 5. Monitoring Dashboard

The system provides:

* Model performance metrics (accuracy, precision, recall, F1)
* Data quality distribution
* Drift detection (PSI, KS)
* Feature importance visualization

---

## Architecture

Frontend (Streamlit)
↓
Backend (Flask API)
↓
ML Models (Scikit-learn)
↓
Data + Feedback Storage (CSV)

---

## Tech Stack

### Backend

* Flask
* Waitress
* Scikit-learn
* Pandas, NumPy

### Frontend

* Streamlit
* Plotly

---

## Setup Instructions

### 1. Clone Repository

```bash
git clone <repo-url>
cd sldce_pro
```

---

### 2. Create Virtual Environment

```bash
python -m venv venv
venv\Scripts\activate
```

---

### 3. Install Dependencies

```bash
pip install -r requirements
```

---

### 4. Run Backend

```bash
python -m backend.main
```

Backend runs at:
http://localhost:5000

---

### 5. Run Frontend

```bash
streamlit run frontend/app.py
```

Frontend runs at:
http://localhost:8501

---

## Project Structure

```text
sldce_pro/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── utils/
│   ├── config.py
│   └── main.py
│
├── frontend/
│   └── app.py
│
├── data/
├── saved_models/
├── logs/
├── memory_log.csv
└── requirements
```

---

## Workflow

1. Upload dataset (CSV)
2. System identifies feature types
3. Select target column
4. Train model
5. Detect suspicious samples
6. Review and provide feedback
7. Store feedback for future use

---

## Important Notes

* The system is data-centric, not model-centric
* Models do not learn directly from feedback
* Learning occurs through corrected labels and retraining
* Random Forest models are rebuilt during each training cycle

---

## Limitations

* No automatic retraining from feedback yet
* No incremental learning support
* No automated correction mechanism
* UI allows inconsistent inputs (e.g., approve with corrected value)

---

## Future Work

* Automatic retraining pipeline
* Incremental / online learning
* Confidence-based auto-correction
* Active learning (prioritize uncertain samples)
* Improved UI validation

---

## Author

Bibek Das
GitHub: https://github.com/dassbibek437
LinkedIn: https://www.linkedin.com/in/bibekdass/

---

## Summary

This project demonstrates a practical approach to improving machine learning performance by focusing on data quality rather than model complexity.

---
