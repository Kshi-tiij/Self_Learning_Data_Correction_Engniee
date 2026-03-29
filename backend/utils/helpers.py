# FILE LOCATION: backend/utils/helpers.py
# Purpose: Utility functions and helper methods

import os
import csv
import json
import logging
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Tuple, Union

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataHelper:
    """Helper functions for data operations"""
    
    @staticmethod
    def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
        """Safely divide with default value if denominator is zero"""
        return numerator / denominator if denominator != 0 else default
    
    @staticmethod
    def normalize_values(arr: np.ndarray) -> np.ndarray:
        """Normalize array to [0, 1] range"""
        min_val = np.nanmin(arr)
        max_val = np.nanmax(arr)
        if max_val == min_val:
            return np.ones_like(arr) * 0.5
        return (arr - min_val) / (max_val - min_val)
    
    @staticmethod
    def clip_values(arr: np.ndarray, min_val: float = 0.0, max_val: float = 1.0) -> np.ndarray:
        """Clip array values to specified range"""
        return np.clip(arr, min_val, max_val)
    
    @staticmethod
    def compute_percentile(arr: np.ndarray, percentile: float) -> float:
        """Compute percentile value"""
        return np.percentile(arr, percentile)
    
    @staticmethod
    def identify_outliers_iqr(arr: np.ndarray, multiplier: float = 1.5) -> np.ndarray:
        """Identify outliers using IQR method"""
        q1 = np.percentile(arr, 25)
        q3 = np.percentile(arr, 75)
        iqr = q3 - q1
        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr
        return (arr < lower_bound) | (arr > upper_bound)
    
    @staticmethod
    def handle_missing_values(df: pd.DataFrame, method: str = 'mean', threshold: float = 0.5) -> pd.DataFrame:
        """Handle missing values in dataframe"""
        # Drop columns with too many missing values
        df = df.dropna(axis=1, thresh=len(df) * (1 - threshold))
        
        # Handle remaining missing values
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        categorical_columns = df.select_dtypes(include=['object']).columns
        
        if method == 'mean':
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
            df[categorical_columns] = df[categorical_columns].fillna(df[categorical_columns].mode().iloc[0])
        elif method == 'median':
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
            df[categorical_columns] = df[categorical_columns].fillna(df[categorical_columns].mode().iloc[0])
        elif method == 'forward_fill':
            df = df.fillna(method='ffill').fillna(method='bfill')
        
        return df


class FileHelper:
    """Helper functions for file operations"""
    
    @staticmethod
    def read_csv(filepath: str, **kwargs) -> pd.DataFrame:
        """Read CSV file safely"""
        try:
            df = pd.read_csv(filepath, **kwargs)
            logger.info(f"Successfully read CSV: {filepath}")
            return df
        except Exception as e:
            logger.error(f"Error reading CSV {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def write_csv(df: pd.DataFrame, filepath: str, **kwargs) -> None:
        """Write CSV file safely"""
        try:
            filepath = Path(filepath)
            filepath.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(filepath, **kwargs)
            logger.info(f"Successfully wrote CSV: {filepath}")
        except Exception as e:
            logger.error(f"Error writing CSV {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def append_csv(df: pd.DataFrame, filepath: str) -> None:
        """Append dataframe to CSV file"""
        try:
            filepath = Path(filepath)
            filepath.parent.mkdir(parents=True, exist_ok=True)
            
            if filepath.exists():
                existing_df = pd.read_csv(filepath)
                df = pd.concat([existing_df, df], ignore_index=True)
            
            df.to_csv(filepath, index=False)
            logger.info(f"Successfully appended to CSV: {filepath}")
        except Exception as e:
            logger.error(f"Error appending to CSV {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def save_json(data: Dict, filepath: str) -> None:
        """Save dictionary to JSON file"""
        try:
            filepath = Path(filepath)
            filepath.parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.info(f"Successfully saved JSON: {filepath}")
        except Exception as e:
            logger.error(f"Error saving JSON {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def load_json(filepath: str) -> Dict:
        """Load JSON file"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            logger.info(f"Successfully loaded JSON: {filepath}")
            return data
        except Exception as e:
            logger.error(f"Error loading JSON {filepath}: {str(e)}")
            raise


class SignalHelper:
    """Helper functions for signal operations"""
    
    @staticmethod
    def aggregate_signals(signal_dict: Dict[str, float], weights: Dict[str, float] = None) -> float:
        """Aggregate multiple signals into single corruption probability"""
        if weights is None:
            weights = {key: 1.0 / len(signal_dict) for key in signal_dict}
        
        total_weight = sum(weights.values())
        weighted_sum = sum(signal_dict.get(key, 0) * weights.get(key, 0) for key in signal_dict)
        
        return weighted_sum / total_weight if total_weight > 0 else 0.5
    
    @staticmethod
    def compute_signal_variance(signal_history: List[Dict[str, float]]) -> Dict[str, float]:
        """Compute variance of signals over time"""
        if not signal_history:
            return {}
        
        signal_names = signal_history[0].keys()
        variances = {}
        
        for signal_name in signal_names:
            values = [s.get(signal_name, 0) for s in signal_history]
            variances[signal_name] = float(np.var(values))
        
        return variances
    
    @staticmethod
    def detect_signal_anomaly(signal_value: float, historical_signals: List[float], 
                            threshold: float = 2.0) -> bool:
        """Detect if signal is anomalous compared to history"""
        if len(historical_signals) < 2:
            return False
        
        mean = np.mean(historical_signals)
        std = np.std(historical_signals)
        
        if std == 0:
            return False
        
        z_score = abs((signal_value - mean) / std)
        return z_score > threshold


class MetricsHelper:
    """Helper functions for metrics computation"""
    
    @staticmethod
    def compute_calibration_score(predictions: np.ndarray, probabilities: np.ndarray, 
                                 y_true: np.ndarray, n_bins: int = 10) -> float:
        """Compute calibration score (Expected Calibration Error)"""
        bin_sums = np.zeros(n_bins)
        bin_true = np.zeros(n_bins)
        bin_total = np.zeros(n_bins)
        
        for prob, true_label in zip(probabilities, y_true):
            bin_idx = int(prob * n_bins) if prob < 1.0 else n_bins - 1
            bin_sums[bin_idx] += prob
            bin_true[bin_idx] += true_label
            bin_total[bin_idx] += 1
        
        expected_calibration_error = 0.0
        for i in range(n_bins):
            if bin_total[i] > 0:
                bin_prob = bin_sums[i] / bin_total[i]
                bin_acc = bin_true[i] / bin_total[i]
                expected_calibration_error += abs(bin_prob - bin_acc) * (bin_total[i] / len(y_true))
        
        # Return as 0-1 where 1 is perfect calibration
        return 1.0 - expected_calibration_error
    
    @staticmethod
    def compute_feature_importance_stability(importance_history: List[np.ndarray]) -> float:
        """Compute stability of feature importance over time"""
        if len(importance_history) < 2:
            return 1.0
        
        # Compute correlation between consecutive importances
        correlations = []
        for i in range(len(importance_history) - 1):
            corr = np.corrcoef(importance_history[i], importance_history[i + 1])[0, 1]
            if not np.isnan(corr):
                correlations.append(corr)
        
        return np.mean(correlations) if correlations else 1.0


class LoggingHelper:
    """Helper functions for logging"""
    
    @staticmethod
    def log_event(event_type: str, details: Dict[str, Any], log_dir: Path = None) -> None:
        """Log event to audit trail"""
        if log_dir is None:
            from backend.config import LOGS_DIR
            log_dir = LOGS_DIR
        
        event_log = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            **details
        }
        
        log_file = log_dir / 'audit_log.csv'
        
        try:
            if log_file.exists():
                df = pd.read_csv(log_file)
                df = pd.concat([df, pd.DataFrame([event_log])], ignore_index=True)
            else:
                df = pd.DataFrame([event_log])
            
            df.to_csv(log_file, index=False)
        except Exception as e:
            logger.error(f"Error logging event: {str(e)}")
    
    @staticmethod
    def log_feedback_record(feedback_dict: Dict[str, Any], log_dir: Path = None) -> None:
        """Log feedback record to memory log"""
        if log_dir is None:
            from backend.config import LOGS_DIR
            log_dir = LOGS_DIR
        
        feedback_record = {
            'timestamp': datetime.now().isoformat(),
            **feedback_dict
        }
        
        log_file = log_dir / 'memory_log.csv'
        
        try:
            if log_file.exists():
                df = pd.read_csv(log_file)
                df = pd.concat([df, pd.DataFrame([feedback_record])], ignore_index=True)
            else:
                df = pd.DataFrame([feedback_record])
            
            df.to_csv(log_file, index=False)
        except Exception as e:
            logger.error(f"Error logging feedback: {str(e)}")


class ValidationHelper:
    """Helper functions for validation"""
    
    @staticmethod
    def validate_csv(df: pd.DataFrame) -> Tuple[bool, str]:
        """Validate CSV dataframe"""
        if df.empty:
            return False, "CSV is empty"
        
        if len(df) < 10:
            return False, "CSV has less than 10 rows"
        
        if df.shape[1] < 2:
            return False, "CSV has less than 2 columns"
        
        return True, "CSV is valid"
    
    @staticmethod
    def validate_target_column(df: pd.DataFrame, target_col: str) -> Tuple[bool, str]:
        """Validate target column"""
        if target_col not in df.columns:
            return False, f"Target column '{target_col}' not found"
        
        if df[target_col].isnull().sum() > len(df) * 0.1:  # More than 10% missing
            return False, f"Target column has too many missing values"
        
        return True, "Target column is valid"
    
    @staticmethod
    def validate_features(df: pd.DataFrame, feature_cols: List[str]) -> Tuple[bool, str]:
        """Validate feature columns"""
        missing_cols = [col for col in feature_cols if col not in df.columns]
        if missing_cols:
            return False, f"Missing columns: {missing_cols}"
        
        return True, "Features are valid"


# Export all helpers
__all__ = [
    'DataHelper',
    'FileHelper',
    'SignalHelper',
    'MetricsHelper',
    'LoggingHelper',
    'ValidationHelper'
]