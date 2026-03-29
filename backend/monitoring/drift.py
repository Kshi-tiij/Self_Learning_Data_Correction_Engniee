# FILE LOCATION: backend/monitoring/drift.py
# Purpose: Drift detection and monitoring

import numpy as np
import pandas as pd
import logging
from typing import Dict, Tuple, List, Any
from scipy.stats import ks_2samp, entropy
import warnings

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

class DriftDetector:
    """Detect data and prediction drift"""
    
    def __init__(self, reference_X: np.ndarray = None, reference_y: np.ndarray = None):
        self.reference_X = reference_X
        self.reference_y = reference_y
        self.drift_history = []
    
    def compute_psi(self, expected: np.ndarray, actual: np.ndarray, 
                   buckets: int = 10) -> float:
        """
        Compute Population Stability Index (PSI)
        
        Args:
            expected: Baseline distribution
            actual: Current distribution
            buckets: Number of buckets for binning
        
        Returns:
            PSI value (0 = no drift, >0.25 = significant drift)
        """
        # Handle edge cases
        if len(expected) == 0 or len(actual) == 0:
            return 0.0
        
        # Remove NaN and inf
        expected_clean = expected[np.isfinite(expected)]
        actual_clean = actual[np.isfinite(actual)]
        
        if len(expected_clean) == 0 or len(actual_clean) == 0:
            return 0.0
        
        # Create buckets based on expected distribution
        min_val = np.min(expected_clean)
        max_val = np.max(expected_clean)
        bin_edges = np.linspace(min_val, max_val, buckets + 1)
        
        # Compute expected and actual proportions
        expected_counts = np.histogram(expected_clean, bins=bin_edges)[0] + 1e-10  # Avoid log(0)
        actual_counts = np.histogram(actual_clean, bins=bin_edges)[0] + 1e-10
        
        expected_prop = expected_counts / np.sum(expected_counts)
        actual_prop = actual_counts / np.sum(actual_counts)
        
        # Compute PSI
        psi = np.sum((actual_prop - expected_prop) * np.log(actual_prop / expected_prop))
        
        return float(psi)
    
    def compute_ks_statistic(self, expected: np.ndarray, actual: np.ndarray) -> Tuple[float, float]:
        """
        Compute Kolmogorov-Smirnov statistic
        
        Args:
            expected: Baseline distribution
            actual: Current distribution
        
        Returns:
            (KS statistic, p-value)
        """
        # Remove NaN and inf
        expected_clean = expected[np.isfinite(expected)]
        actual_clean = actual[np.isfinite(actual)]
        
        if len(expected_clean) == 0 or len(actual_clean) == 0:
            return 0.0, 1.0
        
        ks_stat, p_value = ks_2samp(expected_clean, actual_clean)
        
        return float(ks_stat), float(p_value)
    
    def detect_feature_drift(self, X_new: np.ndarray, feature_idx: int = 0,
                            psi_threshold: float = 0.25,
                            ks_threshold: float = 0.15) -> Dict[str, Any]:
        """
        Detect drift in a specific feature
        
        Args:
            X_new: New data
            feature_idx: Feature index
            psi_threshold: PSI threshold for drift detection
            ks_threshold: KS threshold for drift detection
        
        Returns:
            Drift detection result
        """
        if self.reference_X is None:
            raise ValueError("No reference data provided")
        
        X_ref_feature = self.reference_X[:, feature_idx]
        X_new_feature = X_new[:, feature_idx]
        
        # Compute PSI
        psi = self.compute_psi(X_ref_feature, X_new_feature)
        psi_drift = psi > psi_threshold
        
        # Compute KS statistic
        ks_stat, ks_pvalue = self.compute_ks_statistic(X_ref_feature, X_new_feature)
        ks_drift = ks_stat > ks_threshold
        
        result = {
            'feature_index': feature_idx,
            'psi': psi,
            'psi_threshold': psi_threshold,
            'psi_drift': bool(psi_drift),
            'ks_statistic': ks_stat,
            'ks_pvalue': ks_pvalue,
            'ks_threshold': ks_threshold,
            'ks_drift': bool(ks_drift),
            'drift_detected': bool(psi_drift or ks_drift)
        }
        
        return result
    
    def detect_all_feature_drift(self, X_new: np.ndarray,
                                psi_threshold: float = 0.25,
                                ks_threshold: float = 0.15) -> Dict[int, Dict[str, Any]]:
        """Detect drift in all features"""
        drift_results = {}
        
        for feature_idx in range(X_new.shape[1]):
            result = self.detect_feature_drift(X_new, feature_idx, psi_threshold, ks_threshold)
            drift_results[feature_idx] = result
        
        return drift_results
    
    def detect_label_drift(self, y_new: np.ndarray,
                          psi_threshold: float = 0.25) -> Dict[str, Any]:
        """
        Detect drift in target variable
        
        Args:
            y_new: New target values
            psi_threshold: PSI threshold
        
        Returns:
            Label drift detection result
        """
        if self.reference_y is None:
            raise ValueError("No reference labels provided")
        
        psi = self.compute_psi(self.reference_y, y_new)
        drift_detected = psi > psi_threshold
        
        result = {
            'psi': psi,
            'threshold': psi_threshold,
            'drift_detected': bool(drift_detected),
            'drift_type': 'label_drift'
        }
        
        return result
    
    def detect_prediction_drift(self, y_pred_ref: np.ndarray, y_pred_new: np.ndarray,
                               ks_threshold: float = 0.15) -> Dict[str, Any]:
        """
        Detect drift in model predictions
        
        Args:
            y_pred_ref: Reference predictions
            y_pred_new: New predictions
            ks_threshold: KS threshold
        
        Returns:
            Prediction drift detection result
        """
        ks_stat, ks_pvalue = self.compute_ks_statistic(y_pred_ref, y_pred_new)
        drift_detected = ks_stat > ks_threshold
        
        result = {
            'ks_statistic': ks_stat,
            'ks_pvalue': ks_pvalue,
            'threshold': ks_threshold,
            'drift_detected': bool(drift_detected),
            'drift_type': 'prediction_drift'
        }
        
        return result
    
    def categorize_drift(self, feature_drift: Dict, label_drift: Dict = None,
                        prediction_drift: Dict = None) -> str:
        """
        Categorize type of drift detected
        
        Returns:
            One of: 'no_drift', 'feature_drift', 'label_drift', 'concept_drift'
        """
        feature_drifts = sum(1 for f in feature_drift.values() if f.get('drift_detected'))
        
        if feature_drifts == 0:
            return 'no_drift'
        
        if label_drift and label_drift.get('drift_detected'):
            return 'concept_drift'
        
        if prediction_drift and prediction_drift.get('drift_detected'):
            return 'concept_drift'
        
        return 'feature_drift'
    
    def get_drift_summary(self, X_new: np.ndarray, y_new: np.ndarray = None) -> Dict[str, Any]:
        """Get comprehensive drift summary"""
        feature_drift = self.detect_all_feature_drift(X_new)
        label_drift = self.detect_label_drift(y_new) if y_new is not None else None
        
        drift_count = sum(1 for f in feature_drift.values() if f.get('drift_detected'))
        
        summary = {
            'total_features': X_new.shape[1],
            'drifted_features': drift_count,
            'feature_drift_details': feature_drift,
            'label_drift': label_drift,
            'drift_severity': 'high' if drift_count > X_new.shape[1] * 0.5 else 'medium' if drift_count > 0 else 'low'
        }
        
        return summary


class ConceptDriftMonitor:
    """Monitor concept drift over time"""
    
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.performance_history = []
        self.drift_score_history = []
    
    def update_performance(self, accuracy: float, timestamp = None) -> None:
        """Update performance metric"""
        self.performance_history.append({
            'timestamp': timestamp,
            'accuracy': accuracy
        })
        
        # Keep only recent history
        if len(self.performance_history) > self.window_size * 2:
            self.performance_history = self.performance_history[-self.window_size:]
    
    def compute_drift_score(self) -> float:
        """
        Compute concept drift score based on performance degradation
        
        Returns:
            Drift score [0, 1] where 1 = high drift
        """
        if len(self.performance_history) < 10:
            return 0.0
        
        recent = [p['accuracy'] for p in self.performance_history[-self.window_size:]]
        older = [p['accuracy'] for p in self.performance_history[:-self.window_size//2]]
        
        if older:
            degradation = np.mean(older) - np.mean(recent)
            drift_score = min(1.0, max(0.0, degradation / np.std(older) if np.std(older) > 0 else 0))
        else:
            drift_score = 0.0
        
        self.drift_score_history.append(drift_score)
        return float(drift_score)
    
    def should_retrain(self, drift_threshold: float = 0.3) -> bool:
        """Determine if model should be retrained"""
        if not self.drift_score_history:
            return False
        
        recent_drift = np.mean(self.drift_score_history[-5:])
        return recent_drift > drift_threshold


# Export classes
__all__ = [
    'DriftDetector',
    'ConceptDriftMonitor'
]