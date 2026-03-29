# FILE LOCATION: backend/pipeline/trainer.py
# Purpose: Model training, signal generation, and meta-model creation

import numpy as np
import pandas as pd
import logging
from typing import Tuple, Dict, List, Any
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.linear_model import LogisticRegression
import warnings

from backend.models.factory import ModelFactory
from backend.utils.helpers import MetricsHelper

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

class SignalGenerator:
    """Generate multi-signal intelligence for corruption detection"""
    
    def __init__(self, problem_type: str = 'classification'):
        self.problem_type = problem_type
        self.iso_forest = None
        self.centroid = None
        self.fitted = False
    
    def fit(self, X: np.ndarray) -> None:
        """Fit signal generators"""
        self.iso_forest = IsolationForest(contamination=0.1, random_state=42)
        self.iso_forest.fit(X)
        
        self.centroid = np.mean(X, axis=0)
        self.fitted = True
        
        logger.info("Signal generators fitted")
    
    def generate_classification_signals(self, X: np.ndarray, y: np.ndarray, 
                                        y_pred: np.ndarray, y_proba: np.ndarray) -> pd.DataFrame:
        """Generate signals for classification"""
        if not self.fitted:
            raise ValueError("Signal generators not fitted")
        
        n_samples = len(X)
        signals = pd.DataFrame(index=range(n_samples))
        
        # Signal 1: Confidence (max probability)
        signals['confidence'] = np.max(y_proba, axis=1)
        
        # Signal 2: Entropy (label uncertainty)
        epsilon = 1e-10
        signals['entropy'] = -np.sum(y_proba * np.log(y_proba + epsilon), axis=1)
        signals['entropy'] = signals['entropy'] / np.log(y_proba.shape[1])  # Normalize
        
        # Signal 3: Mismatch (prediction != true label)
        signals['mismatch_flag'] = (y_pred != y).astype(int)
        
        # Signal 4: Isolation Forest Anomaly Score
        signals['isolation_score'] = self.iso_forest.score_samples(X)
        signals['isolation_score'] = (signals['isolation_score'] - signals['isolation_score'].min()) / \
                                    (signals['isolation_score'].max() - signals['isolation_score'].min() + 1e-10)
        
        # Signal 5: Distance to Centroid
        distances = np.linalg.norm(X - self.centroid, axis=1)
        signals['centroid_distance'] = distances
        signals['centroid_distance'] = (signals['centroid_distance'] - signals['centroid_distance'].min()) / \
                                       (signals['centroid_distance'].max() - signals['centroid_distance'].min() + 1e-10)
        
        # Signal 6: Ensemble Disagreement (simulated)
        # For now, use confidence variation
        signals['ensemble_disagreement'] = np.abs(signals['confidence'] - 0.5) / 0.5
        
        return signals
    
    def generate_regression_signals(self, X: np.ndarray, y: np.ndarray, y_pred: np.ndarray) -> pd.DataFrame:
        """Generate signals for regression"""
        if not self.fitted:
            raise ValueError("Signal generators not fitted")
        
        n_samples = len(X)
        signals = pd.DataFrame(index=range(n_samples))
        
        # Calculate residuals
        residuals = np.abs(y - y_pred)
        
        # Signal 1: Residual Magnitude (normalized)
        signals['residual_magnitude'] = residuals
        signals['residual_magnitude'] = (signals['residual_magnitude'] - signals['residual_magnitude'].min()) / \
                                       (signals['residual_magnitude'].max() - signals['residual_magnitude'].min() + 1e-10)
        
        # Signal 2: Residual Z-score
        residual_mean = np.mean(residuals)
        residual_std = np.std(residuals)
        signals['residual_zscore'] = np.abs((residuals - residual_mean) / (residual_std + 1e-10))
        signals['residual_zscore'] = np.clip(signals['residual_zscore'] / 3.0, 0, 1)
        
        # Signal 3: Isolation Forest Anomaly Score
        signals['anomaly_score'] = self.iso_forest.score_samples(X)
        signals['anomaly_score'] = (signals['anomaly_score'] - signals['anomaly_score'].min()) / \
                                  (signals['anomaly_score'].max() - signals['anomaly_score'].min() + 1e-10)
        
        # Signal 4: Distance to Centroid
        distances = np.linalg.norm(X - self.centroid, axis=1)
        signals['cluster_distance'] = distances
        signals['cluster_distance'] = (signals['cluster_distance'] - signals['cluster_distance'].min()) / \
                                     (signals['cluster_distance'].max() - signals['cluster_distance'].min() + 1e-10)
        
        return signals
    
    def generate_signals(self, X: np.ndarray, y: np.ndarray, y_pred: np.ndarray, 
                        y_proba: np.ndarray = None) -> pd.DataFrame:
        """Generate appropriate signals based on problem type"""
        if self.problem_type == 'classification':
            return self.generate_classification_signals(X, y, y_pred, y_proba)
        else:
            return self.generate_regression_signals(X, y, y_pred)


class ModelTrainer:
    """Train primary and meta models"""
    
    def __init__(self, problem_type: str = 'classification', model_type: str = 'random_forest'):
        self.problem_type = problem_type
        self.model_type = model_type
        self.primary_model = None
        self.meta_model = None
        self.signal_generator = SignalGenerator(problem_type)
        self.training_history = []
    
    def train_primary_model(self, X: np.ndarray, y: np.ndarray, **kwargs) -> None:
        """Train the primary model"""
        logger.info(f"Training primary {self.problem_type} model: {self.model_type}")
        
        try:
            self.primary_model = ModelFactory.create_model(
                self.problem_type, 
                self.model_type,
                **kwargs
            )
            self.primary_model.fit(X, y)
            
            # Fit signal generator
            self.signal_generator.fit(X)
            
            logger.info("Primary model trained successfully")
        except Exception as e:
            logger.error(f"Error training primary model: {str(e)}")
            raise
    
    def get_primary_predictions(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Get predictions from primary model"""
        if self.primary_model is None:
            raise ValueError("Primary model not trained")
        
        y_pred = self.primary_model.predict(X)
        
        if self.problem_type == 'classification':
            y_proba = self.primary_model.predict_proba(X)
        else:
            y_proba = np.column_stack([y_pred, np.zeros_like(y_pred)])
        
        return y_pred, y_proba
    
    def generate_signals(self, X: np.ndarray, y: np.ndarray, y_pred: np.ndarray,
                        y_proba: np.ndarray = None) -> pd.DataFrame:
        """Generate corruption detection signals"""
        return self.signal_generator.generate_signals(X, y, y_pred, y_proba)
    
    def train_meta_model(self, X: np.ndarray, y: np.ndarray, signals: pd.DataFrame,
                        corruption_labels: np.ndarray = None) -> None:
        """Train meta-model to predict corruption probability"""
        if self.primary_model is None:
            raise ValueError("Primary model must be trained first")
        
        logger.info("Training meta-model for corruption detection")
        
        # If no corruption labels provided, use prediction mismatch
        if corruption_labels is None:
            y_pred, y_proba = self.get_primary_predictions(X)
            corruption_labels = (y_pred != y).astype(int)
            logger.info(f"Using prediction mismatch as corruption signal: {np.sum(corruption_labels)} samples")
        
        # Train meta-model on signals
        self.meta_model = LogisticRegression(max_iter=1000, random_state=42)
        self.meta_model.fit(signals, corruption_labels)
        
        logger.info("Meta-model trained successfully")
    
    def predict_corruption_probability(self, signals: pd.DataFrame) -> np.ndarray:
        """Predict corruption probability using meta-model"""
        if self.meta_model is None:
            raise ValueError("Meta-model not trained")
        
        corruption_prob = self.meta_model.predict_proba(signals)[:, 1]
        return corruption_prob
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate primary model performance"""
        if self.primary_model is None:
            raise ValueError("Primary model not trained")
        
        y_pred, _ = self.get_primary_predictions(X_test)
        
        metrics = {}
        
        if self.problem_type == 'classification':
            metrics['accuracy'] = accuracy_score(y_test, y_pred)
            metrics['precision'] = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['recall'] = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['f1'] = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            try:
                metrics['roc_auc'] = roc_auc_score(y_test, y_pred)
            except:
                metrics['roc_auc'] = 0.0
        else:
            mse = mean_squared_error(y_test, y_pred)
            metrics['mse'] = mse
            metrics['rmse'] = np.sqrt(mse)
            metrics['mae'] = mean_absolute_error(y_test, y_pred)
            metrics['r2'] = r2_score(y_test, y_pred)
        
        return metrics
    
    def get_feature_importance(self, feature_names: List[str] = None) -> Dict[str, float]:
        """Get feature importance from primary model"""
        if self.primary_model is None:
            raise ValueError("Primary model not trained")
        
        if not hasattr(self.primary_model, 'feature_importances_'):
            logger.warning("Model does not support feature importance")
            return {}
        
        importances = self.primary_model.feature_importances_
        
        if feature_names is None:
            feature_names = [f"feature_{i}" for i in range(len(importances))]
        
        importance_dict = dict(zip(feature_names, importances.tolist()))
        
        return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))


# Export classes
__all__ = [
    'SignalGenerator',
    'ModelTrainer'
]