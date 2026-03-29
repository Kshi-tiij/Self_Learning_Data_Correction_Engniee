# FILE LOCATION 3: backend/monitoring/metrics.py
# Purpose: Performance metrics and monitoring
# ========================================================================

import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import numpy as np

class MetricsMonitor:
    """Monitor model performance metrics"""
    
    def __init__(self):
        self.metric_history = []
    
    def update_metrics(self, y_true: np.ndarray, y_pred: np.ndarray,
                      y_proba: np.ndarray = None, metric_name: str = 'default') -> Dict[str, float]:
        """
        Update and record metrics
        
        Returns:
            Dictionary of computed metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'metric_name': metric_name,
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'precision': float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, average='weighted', zero_division=0)),
            'f1': float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
        }
        
        self.metric_history.append(metrics)
        return metrics
    
    def get_metric_trend(self, window_size: int = 10) -> Dict[str, List[float]]:
        """Get recent metric trend"""
        if not self.metric_history:
            return {}
        
        recent = self.metric_history[-window_size:]
        
        return {
            'accuracy': [m['accuracy'] for m in recent],
            'precision': [m['precision'] for m in recent],
            'recall': [m['recall'] for m in recent],
            'f1': [m['f1'] for m in recent]
        }
    
    def compute_data_quality_score(self, noise_rate: float, drift_detected: bool,
                                  calibration_score: float) -> float:
        """
        Compute overall data quality score
        
        Quality Score = 1 - (noise_weight * noise_rate + 
                            drift_weight * drift_penalty + 
                            calibration_weight * calibration_penalty)
        """
        noise_penalty = min(1.0, noise_rate)
        drift_penalty = 0.3 if drift_detected else 0.0
        calibration_penalty = 1.0 - calibration_score
        
        quality_score = 1.0 - (
            0.5 * noise_penalty +
            0.3 * drift_penalty +
            0.2 * calibration_penalty
        )
        
        return float(np.clip(quality_score, 0, 1))
    
    def get_quality_label(self, quality_score: float) -> str:
        """Get quality label based on score"""
        if quality_score >= 0.8:
            return 'green'
        elif quality_score >= 0.5:
            return 'yellow'
        else:
            return 'red'

