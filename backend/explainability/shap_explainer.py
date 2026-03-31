# FILE LOCATION: backend/explainability/shap_explainer.py
# Purpose: SHAP explainability and model interpretation

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Tuple, Any, Optional

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    shap = None
    SHAP_AVAILABLE = False
    
from sklearn.preprocessing import StandardScaler
import warnings

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

class SHAPExplainer:
    """SHAP-based model explainability"""
    
    def __init__(self, model, X_train: np.ndarray, feature_names: List[str] = None,
                 model_type: str = 'classification'):
        self.model = model
        self.X_train = X_train
        self.feature_names = feature_names or [f"feature_{i}" for i in range(X_train.shape[1])]
        self.model_type = model_type
        self.explainer = None
        self.shap_values = None
        self.fitted = False
        
        self._initialize_explainer()
    
    def _initialize_explainer(self) -> None:
        """Initialize SHAP explainer based on model type"""
        if not SHAP_AVAILABLE:
            logger.warning("SHAP library is not installed. SHAPExplainer won't be functional.")
            self.fitted = False
            return
            
        try:
            # Use TreeExplainer for tree-based models
            if hasattr(self.model, 'feature_importances_'):
                self.explainer = shap.TreeExplainer(self.model)
                logger.info("Using TreeExplainer for SHAP")
            else:
                # Use KernelExplainer for other models
                self.explainer = shap.KernelExplainer(
                    self.model.predict if self.model_type == 'regression' else self.model.predict_proba,
                    shap.sample(self.X_train, min(100, len(self.X_train)))
                )
                logger.info("Using KernelExplainer for SHAP")
            
            self.fitted = True
        except Exception as e:
            logger.warning(f"Error initializing SHAP explainer: {str(e)}")
            self.fitted = False
    
    def explain_sample(self, X_sample: np.ndarray, sample_idx: int = 0) -> Dict[str, Any]:
        """
        Get SHAP explanation for a single sample
        
        Args:
            X_sample: Feature matrix (can be batch)
            sample_idx: Index of sample to explain
        
        Returns:
            Dictionary with SHAP values and feature importances
        """
        if not self.fitted:
            raise ValueError("SHAP explainer not initialized")
        
        try:
            # Compute SHAP values
            shap_values = self.explainer.shap_values(X_sample)
            
            # Handle classification (multiple outputs)
            if self.model_type == 'classification' and isinstance(shap_values, list):
                shap_values = shap_values[0]
            
            if len(shap_values.shape) == 1:
                shap_values = shap_values.reshape(1, -1)
            
            sample_shap = shap_values[sample_idx]
            
            # Get feature contributions
            feature_contributions = {
                self.feature_names[i]: float(sample_shap[i])
                for i in range(len(self.feature_names))
            }
            
            # Sort by absolute impact
            sorted_features = sorted(
                feature_contributions.items(),
                key=lambda x: abs(x[1]),
                reverse=True
            )
            
            explanation = {
                'sample_features': dict(zip(self.feature_names, X_sample[sample_idx].tolist())),
                'feature_contributions': dict(sorted_features[:5]),  # Top 5
                'all_contributions': feature_contributions,
                'shap_base_value': float(self.explainer.expected_value) if hasattr(self.explainer, 'expected_value') else 0.5
            }
            
            return explanation
        
        except Exception as e:
            logger.error(f"Error generating SHAP explanation: {str(e)}")
            return {}
    
    def get_global_feature_importance(self) -> Dict[str, float]:
        """Get global feature importance from SHAP"""
        try:
            # Compute SHAP values for training data sample
            sample_size = min(200, len(self.X_train))
            X_sample = self.X_train[:sample_size]
            shap_values = self.explainer.shap_values(X_sample)
            
            # Handle classification
            if self.model_type == 'classification' and isinstance(shap_values, list):
                shap_values = np.abs(shap_values[0]).mean(axis=0)
            else:
                shap_values = np.abs(shap_values).mean(axis=0)
            
            importances = {
                self.feature_names[i]: float(shap_values[i])
                for i in range(len(self.feature_names))
            }
            
            # Normalize
            total = sum(importances.values())
            if total > 0:
                importances = {k: v/total for k, v in importances.items()}
            
            return dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))
        
        except Exception as e:
            logger.error(f"Error computing global importance: {str(e)}")
            return {}


class ModelInterpreter:
    """General model interpretation without SHAP"""
    
    def __init__(self, model, feature_names: List[str] = None):
        self.model = model
        self.feature_names = feature_names or [f"feature_{i}" for i in range(100)]
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from model if available"""
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            
            importance_dict = {
                self.feature_names[i]: float(importances[i])
                for i in range(min(len(importances), len(self.feature_names)))
            }
            
            return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
        
        elif hasattr(self.model, 'coef_'):
            coef = np.abs(self.model.coef_).flatten()
            
            importance_dict = {
                self.feature_names[i]: float(coef[i])
                for i in range(min(len(coef), len(self.feature_names)))
            }
            
            # Normalize
            total = sum(importance_dict.values())
            if total > 0:
                importance_dict = {k: v/total for k, v in importance_dict.items()}
            
            return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
        
        else:
            logger.warning("Model does not support feature importance extraction")
            return {}
    
    def get_prediction_confidence(self, predictions: np.ndarray, probabilities: np.ndarray = None) -> Dict[str, Any]:
        """Analyze prediction confidence"""
        if probabilities is None:
            return {'mean_confidence': 0.5, 'confidence_distribution': {}}
        
        max_proba = np.max(probabilities, axis=1)
        
        return {
            'mean_confidence': float(np.mean(max_proba)),
            'min_confidence': float(np.min(max_proba)),
            'max_confidence': float(np.max(max_proba)),
            'std_confidence': float(np.std(max_proba)),
            'low_confidence_count': int(np.sum(max_proba < 0.5)),
            'high_confidence_count': int(np.sum(max_proba >= 0.9))
        }


class ExplainabilityReporter:
    """Generate explainability reports"""
    
    @staticmethod
    def generate_sample_report(sample_idx: int, features: Dict[str, Any], 
                              prediction: Any, signals: Dict[str, float],
                              meta_score: float, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive report for a sample"""
        
        report = {
            'sample_id': int(sample_idx),
            'features': features,
            'prediction': str(prediction),
            'signals': signals,
            'corruption_probability': float(meta_score),
            'explanation': explanation,
            'recommendation': 'review' if meta_score > 0.5 else 'approve'
        }
        
        return report
    
    @staticmethod
    def generate_batch_report(X: np.ndarray, predictions: np.ndarray, 
                             corruption_proba: np.ndarray,
                             feature_names: List[str] = None,
                             threshold: float = 0.5) -> pd.DataFrame:
        """Generate report for batch of samples"""
        
        n_samples = len(predictions)
        
        report_data = {
            'sample_id': range(n_samples),
            'prediction': predictions,
            'corruption_probability': corruption_proba,
            'needs_review': (corruption_proba > threshold).astype(int),
            'confidence': 1.0 - np.abs(corruption_proba - 0.5) * 2
        }
        
        return pd.DataFrame(report_data)
    
    @staticmethod
    def generate_model_report(feature_importance: Dict[str, float],
                             metrics: Dict[str, float],
                             signals_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall model report"""
        
        return {
            'top_features': dict(list(feature_importance.items())[:5]),
            'performance_metrics': metrics,
            'signal_summary': signals_summary,
            'model_health': 'good' if metrics.get('f1', metrics.get('r2', 0)) > 0.7 else 'needs_attention'
        }


# Export classes
__all__ = [
    'SHAPExplainer',
    'ModelInterpreter',
    'ExplainabilityReporter'
]