# FILE LOCATION: backend/config.py
# Purpose: Central configuration for SLDCE PRO platform

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Project root
PROJECT_ROOT = Path(__file__).parent.parent

# Data paths
DATA_DIR = PROJECT_ROOT / 'data'
SAVED_MODELS_DIR = PROJECT_ROOT / 'saved_models'
LOGS_DIR = PROJECT_ROOT / 'logs'

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)
SAVED_MODELS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# API Configuration
API_HOST = os.getenv('API_HOST', '127.0.0.1')
API_PORT = int(os.getenv('API_PORT', 5000))
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# ML Configuration
MODEL_TYPE = os.getenv('MODEL_TYPE', 'random_forest')  # Default model
RANDOM_STATE = 42
TEST_SIZE = 0.2
VALIDATION_SIZE = 0.1

# Thresholding Configuration
THRESHOLD_MODE = os.getenv('THRESHOLD_MODE', 'percentile')  # percentile, optimization, cost_sensitive
THRESHOLD_PERCENTILE = float(os.getenv('THRESHOLD_PERCENTILE', 0.75))
ANOMALY_PERCENTILE = float(os.getenv('ANOMALY_PERCENTILE', 0.80))

# Meta-model Configuration
META_MODEL_TYPE = 'logistic_regression'  # Using LR for corruption probability

# Similarity Configuration
SIMILARITY_K = 5  # Top K similar samples
SIMILARITY_METRIC = 'euclidean'  # or 'cosine'
MIN_SIMILARITY_THRESHOLD = 0.5

# Drift Detection Configuration
PSI_THRESHOLD = 0.25
KS_THRESHOLD = 0.15
DRIFT_PERCENTILE = 0.95

# Data Quality Score Configuration
NOISE_WEIGHT = 0.5
DRIFT_WEIGHT = 0.3
CALIBRATION_WEIGHT = 0.2

# Active Learning Configuration
UNCERTAINTY_SAMPLES_PER_BATCH = 10
ACTIVE_LEARNING_ENABLED = True

# Monitoring Configuration
CALIBRATION_BINS = 10
PERFORMANCE_AVERAGING_WINDOW = 100

# RBAC Configuration
ALLOWED_ROLES = ['admin', 'reviewer', 'viewer']
ROLE_PERMISSIONS = {
    'admin': ['upload_data', 'train_model', 'approve_correction', 'manage_users', 'retrain', 'rollback'],
    'reviewer': ['view_data', 'review_corrections', 'provide_feedback'],
    'viewer': ['view_dashboards', 'view_reports']
}

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# Feature configuration
MAX_CATEGORICAL_UNIQUE = 20
MISSING_VALUE_THRESHOLD = 0.5  # If >50% missing, drop column

# Model Registry Configuration
MAX_VERSIONS_TO_KEEP = 10
AUTO_VERSIONING = True

# Cache Configuration
CACHE_ENABLED = True
CACHE_TTL = 3600  # 1 hour in seconds

# Signal Configuration
SIGNAL_NAMES = [
    'confidence',
    'entropy',
    'mismatch_flag',
    'isolation_score',
    'centroid_distance',
    'ensemble_disagreement'
]

# Classification-specific
CLASSIFICATION_SIGNALS = SIGNAL_NAMES
CLASSIFICATION_METRICS = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']

# Regression-specific
REGRESSION_SIGNALS = [
    'residual_magnitude',
    'residual_zscore',
    'anomaly_score',
    'cluster_distance'
]
REGRESSION_METRICS = ['r2', 'mse', 'rmse', 'mae', 'mape']

# Feedback Memory Log
MEMORY_LOG_FILE = LOGS_DIR / 'memory_log.csv'
AUDIT_LOG_FILE = LOGS_DIR / 'audit_log.csv'

# Model Parameters
MODEL_PARAMS = {
    'logistic_regression': {
        'C': 1.0,
        'solver': 'lbfgs',
        'max_iter': 1000,
        'random_state': RANDOM_STATE
    },
    'random_forest': {
        'n_estimators': 100,
        'max_depth': 10,
        'min_samples_split': 5,
        'min_samples_leaf': 2,
        'random_state': RANDOM_STATE,
        'n_jobs': -1
    },
    'xgboost': {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'random_state': RANDOM_STATE,
        'n_jobs': -1
    },
    'lightgbm': {
        'n_estimators': 100,
        'max_depth': 8,
        'learning_rate': 0.1,
        'random_state': RANDOM_STATE,
        'n_jobs': -1
    },
    'mlp': {
        'hidden_layer_sizes': (100, 50),
        'max_iter': 500,
        'learning_rate_init': 0.001,
        'random_state': RANDOM_STATE
    }
}

# Print config on startup
if __name__ == '__main__':
    print("=" * 60)
    print("SLDCE PRO - Configuration")
    print("=" * 60)
    print(f"Data Directory: {DATA_DIR}")
    print(f"Models Directory: {SAVED_MODELS_DIR}")
    print(f"Logs Directory: {LOGS_DIR}")
    print(f"API: {API_HOST}:{API_PORT}")
    print(f"Model Type: {MODEL_TYPE}")
    print(f"Threshold Mode: {THRESHOLD_MODE}")
    print("=" * 60)