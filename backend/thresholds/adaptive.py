# FILE LOCATION: backend/thresholds/adaptive.py
# Purpose: Adaptive threshold calculation (NO hardcoded thresholds)

import numpy as np
import pandas as pd
import logging
from typing import Dict, Tuple, List, Callable, Any
from scipy.optimize import minimize
from sklearn.metrics import f1_score

logger = logging.getLogger(__name__)

class AdaptiveThresholdEngine:
    """Adaptive thresholding without hardcoded values"""
    
    def __init__(self, mode: str = 'percentile'):
        """
        Args:
            mode: 'percentile', 'optimization', or 'cost_sensitive'
        """
        self.mode = mode.lower()
        self.threshold = 0.5
        self.threshold_history = []
        
        if self.mode not in ['percentile', 'optimization', 'cost_sensitive']:
            raise ValueError(f"Unknown threshold mode: {mode}")
        
        logger.info(f"Initialized adaptive threshold engine with mode: {self.mode}")
    
    def compute_percentile_threshold(self, scores: np.ndarray, percentile: float = 75.0) -> float:
        """
        Compute threshold based on percentile of score distribution
        
        Args:
            scores: Array of anomaly/corruption scores
            percentile: Percentile to use (0-100)
        
        Returns:
            Threshold value
        """
        threshold = np.percentile(scores, percentile)
        logger.info(f"Percentile-based threshold ({percentile}th): {threshold:.4f}")
        return threshold
    
    def compute_optimization_threshold(self, scores: np.ndarray, labels: np.ndarray,
                                       optimization_metric: str = 'f1') -> float:
        """
        Compute threshold by optimizing a metric (e.g., F1 score)
        
        Args:
            scores: Array of anomaly/corruption scores
            labels: True labels (1 = corrupted, 0 = clean)
            optimization_metric: 'f1', 'precision', 'recall', 'accuracy'
        
        Returns:
            Optimized threshold value
        """
        def objective(threshold):
            if 0 <= threshold <= 1:
                predictions = (scores >= threshold[0]).astype(int)
                
                if optimization_metric == 'f1':
                    score = -f1_score(labels, predictions, zero_division=0)
                elif optimization_metric == 'precision':
                    from sklearn.metrics import precision_score
                    score = -precision_score(labels, predictions, zero_division=0)
                elif optimization_metric == 'recall':
                    from sklearn.metrics import recall_score
                    score = -recall_score(labels, predictions, zero_division=0)
                elif optimization_metric == 'accuracy':
                    from sklearn.metrics import accuracy_score
                    score = -accuracy_score(labels, predictions)
                else:
                    score = -f1_score(labels, predictions, zero_division=0)
                
                return score
            else:
                return float('inf')
        
        # Initial guess
        x0 = np.array([0.5])
        
        # Optimize
        result = minimize(objective, x0, method='Nelder-Mead', 
                         options={'maxiter': 1000})
        
        threshold = np.clip(result.x[0], 0, 1)
        logger.info(f"Optimization-based threshold ({optimization_metric}): {threshold:.4f}")
        
        return threshold
    
    def compute_cost_sensitive_threshold(self, scores: np.ndarray, labels: np.ndarray,
                                        cost_false_positive: float = 1.0,
                                        cost_false_negative: float = 5.0) -> float:
        """
        Compute threshold minimizing cost-weighted errors
        
        Args:
            scores: Array of anomaly/corruption scores
            labels: True labels (1 = corrupted, 0 = clean)
            cost_false_positive: Cost of falsely flagging clean sample
            cost_false_negative: Cost of missing corrupted sample
        
        Returns:
            Cost-minimized threshold value
        """
        def cost_function(threshold):
            predictions = (scores >= threshold[0]).astype(int)
            
            fp = np.sum((predictions == 1) & (labels == 0))  # False positives
            fn = np.sum((predictions == 0) & (labels == 1))  # False negatives
            
            total_cost = fp * cost_false_positive + fn * cost_false_negative
            
            return total_cost
        
        # Initial guess
        x0 = np.array([0.5])
        
        # Optimize
        result = minimize(cost_function, x0, method='Nelder-Mead',
                         options={'maxiter': 1000})
        
        threshold = np.clip(result.x[0], 0, 1)
        logger.info(f"Cost-sensitive threshold (FP cost: {cost_false_positive}, FN cost: {cost_false_negative}): {threshold:.4f}")
        
        return threshold
    
    def compute_threshold(self, scores: np.ndarray, labels: np.ndarray = None,
                         percentile: float = 75.0, **kwargs) -> float:
        """
        Compute threshold based on selected mode
        
        Args:
            scores: Array of anomaly/corruption scores
            labels: True labels (required for optimization modes)
            percentile: Percentile to use (for percentile mode)
            **kwargs: Additional parameters for specific modes
        
        Returns:
            Computed threshold value
        """
        if self.mode == 'percentile':
            self.threshold = self.compute_percentile_threshold(scores, percentile)
        
        elif self.mode == 'optimization':
            if labels is None:
                raise ValueError("Labels required for optimization-based threshold")
            optimization_metric = kwargs.get('optimization_metric', 'f1')
            self.threshold = self.compute_optimization_threshold(scores, labels, optimization_metric)
        
        elif self.mode == 'cost_sensitive':
            if labels is None:
                raise ValueError("Labels required for cost-sensitive threshold")
            cost_fp = kwargs.get('cost_false_positive', 1.0)
            cost_fn = kwargs.get('cost_false_negative', 5.0)
            self.threshold = self.compute_cost_sensitive_threshold(scores, labels, cost_fp, cost_fn)
        
        self.threshold_history.append(self.threshold)
        return self.threshold
    
    def flag_anomalies(self, scores: np.ndarray, threshold: float = None) -> np.ndarray:
        """
        Flag anomalies based on threshold
        
        Args:
            scores: Array of anomaly scores
            threshold: Threshold to use (if None, uses computed threshold)
        
        Returns:
            Boolean array indicating anomalies
        """
        if threshold is None:
            threshold = self.threshold
        
        return (scores >= threshold).astype(int)
    
    def compute_adaptive_confidence_threshold(self, corruption_proba: np.ndarray,
                                            confidence_scores: np.ndarray) -> float:
        """
        Compute threshold combining corruption probability and confidence
        
        Args:
            corruption_proba: Predicted corruption probability
            confidence_scores: Model confidence scores
        
        Returns:
            Combined threshold value
        """
        # Higher corruption + lower confidence = higher combined score
        combined_score = corruption_proba * (1 - confidence_scores)
        
        # Use 75th percentile
        threshold = np.percentile(combined_score, 75)
        logger.info(f"Adaptive confidence threshold: {threshold:.4f}")
        
        return threshold
    
    def get_threshold_statistics(self) -> Dict[str, float]:
        """Get statistics about threshold history"""
        if not self.threshold_history:
            return {}
        
        history = np.array(self.threshold_history)
        
        return {
            'current_threshold': float(self.threshold),
            'mean_threshold': float(np.mean(history)),
            'std_threshold': float(np.std(history)),
            'min_threshold': float(np.min(history)),
            'max_threshold': float(np.max(history)),
            'n_updates': len(history)
        }


class MultiThresholdEngine:
    """Manage multiple thresholds for different purposes"""
    
    def __init__(self):
        self.thresholds = {
            'corruption': AdaptiveThresholdEngine('percentile'),
            'anomaly': AdaptiveThresholdEngine('percentile'),
            'confidence': AdaptiveThresholdEngine('percentile')
        }
    
    def compute_corruption_threshold(self, scores: np.ndarray, **kwargs) -> float:
        """Compute threshold for corruption detection"""
        return self.thresholds['corruption'].compute_threshold(scores, percentile=75, **kwargs)
    
    def compute_anomaly_threshold(self, scores: np.ndarray, **kwargs) -> float:
        """Compute threshold for anomaly detection"""
        return self.thresholds['anomaly'].compute_threshold(scores, percentile=80, **kwargs)
    
    def compute_confidence_threshold(self, scores: np.ndarray, **kwargs) -> float:
        """Compute threshold for confidence-based filtering"""
        return self.thresholds['confidence'].compute_threshold(scores, percentile=25, **kwargs)
    
    def get_all_thresholds(self) -> Dict[str, float]:
        """Get all current thresholds"""
        return {
            'corruption': self.thresholds['corruption'].threshold,
            'anomaly': self.thresholds['anomaly'].threshold,
            'confidence': self.thresholds['confidence'].threshold
        }


class ThresholdOptimizer:
    """Optimize thresholds based on feedback"""
    
    def __init__(self):
        self.feedback_history = []
        self.optimal_threshold = 0.5
    
    def add_feedback(self, score: float, is_corrupted: bool, review_decision: str) -> None:
        """
        Add human feedback for threshold optimization
        
        Args:
            score: Anomaly/corruption score
            is_corrupted: True if sample is actually corrupted
            review_decision: Human review decision ('approve', 'reject', 'unsure')
        """
        self.feedback_history.append({
            'score': score,
            'is_corrupted': is_corrupted,
            'review_decision': review_decision
        })
    
    def optimize_from_feedback(self) -> float:
        """Optimize threshold based on accumulated feedback"""
        if len(self.feedback_history) < 10:
            logger.warning("Not enough feedback to optimize threshold")
            return self.optimal_threshold
        
        df = pd.DataFrame(self.feedback_history)
        
        # Create labels from review decisions
        labels = df['is_corrupted'].values
        scores = df['score'].values
        
        # Use optimization-based threshold
        engine = AdaptiveThresholdEngine('optimization')
        self.optimal_threshold = engine.compute_optimization_threshold(scores, labels, 'f1')
        
        logger.info(f"Threshold optimized from {len(self.feedback_history)} feedback records")
        
        return self.optimal_threshold
    
    def get_feedback_statistics(self) -> Dict[str, Any]:
        """Get statistics about feedback"""
        if not self.feedback_history:
            return {}
        
        df = pd.DataFrame(self.feedback_history)
        
        return {
            'total_feedback': len(df),
            'approved_count': len(df[df['review_decision'] == 'approve']),
            'rejected_count': len(df[df['review_decision'] == 'reject']),
            'unsure_count': len(df[df['review_decision'] == 'unsure']),
            'corruption_rate': float(df['is_corrupted'].mean()),
            'mean_score': float(df['score'].mean()),
            'std_score': float(df['score'].std())
        }


# Export classes
__all__ = [
    'AdaptiveThresholdEngine',
    'MultiThresholdEngine',
    'ThresholdOptimizer'
]