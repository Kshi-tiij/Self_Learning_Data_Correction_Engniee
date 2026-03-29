# FILE LOCATION: backend/models/factory.py
# Purpose: Model factory for creating classification and regression models

import logging
from typing import Any, Dict
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor

from backend.config import MODEL_PARAMS, RANDOM_STATE

logger = logging.getLogger(__name__)

class ModelFactory:
    """Factory for creating and managing ML models"""
    
    # Classification models
    CLASSIFICATION_MODELS = {
        'logistic_regression': LogisticRegression,
        'random_forest': RandomForestClassifier,
        'xgboost': XGBClassifier,
        'lightgbm': LGBMClassifier,
        'mlp': MLPClassifier
    }
    
    # Regression models
    REGRESSION_MODELS = {
        'linear_regression': LinearRegression,
        'random_forest': RandomForestRegressor,
        'xgboost': XGBRegressor,
        'lightgbm': LGBMRegressor,
        'mlp': MLPRegressor
    }
    
    @classmethod
    def create_classification_model(cls, model_name: str, **kwargs) -> Any:
        """
        Create a classification model
        
        Args:
            model_name: One of ['logistic_regression', 'random_forest', 'xgboost', 'lightgbm', 'mlp']
            **kwargs: Additional parameters to override defaults
        
        Returns:
            Initialized model instance
        """
        model_name = model_name.lower().strip()
        
        if model_name not in cls.CLASSIFICATION_MODELS:
            raise ValueError(f"Unknown classification model: {model_name}")
        
        # Get default parameters
        params = MODEL_PARAMS.get(model_name, {}).copy()
        
        # Override with user parameters
        params.update(kwargs)
        
        # Create model
        model_class = cls.CLASSIFICATION_MODELS[model_name]
        model = model_class(**params)
        
        logger.info(f"Created classification model: {model_name}")
        logger.debug(f"Model parameters: {params}")
        
        return model
    
    @classmethod
    def create_regression_model(cls, model_name: str, **kwargs) -> Any:
        """
        Create a regression model
        
        Args:
            model_name: One of ['linear_regression', 'random_forest', 'xgboost', 'lightgbm', 'mlp']
            **kwargs: Additional parameters to override defaults
        
        Returns:
            Initialized model instance
        """
        model_name = model_name.lower().strip()
        
        if model_name not in cls.REGRESSION_MODELS:
            raise ValueError(f"Unknown regression model: {model_name}")
        
        # Get default parameters
        params = MODEL_PARAMS.get(model_name, {}).copy()
        
        # Override with user parameters
        params.update(kwargs)
        
        # Create model
        model_class = cls.REGRESSION_MODELS[model_name]
        model = model_class(**params)
        
        logger.info(f"Created regression model: {model_name}")
        logger.debug(f"Model parameters: {params}")
        
        return model
    
    @classmethod
    def create_model(cls, problem_type: str, model_name: str, **kwargs) -> Any:
        """
        Create a model based on problem type
        
        Args:
            problem_type: 'classification' or 'regression'
            model_name: Name of the model
            **kwargs: Additional parameters
        
        Returns:
            Initialized model instance
        """
        if problem_type == 'classification':
            return cls.create_classification_model(model_name, **kwargs)
        elif problem_type == 'regression':
            return cls.create_regression_model(model_name, **kwargs)
        else:
            raise ValueError(f"Unknown problem type: {problem_type}")
    
    @classmethod
    def get_available_models(cls, problem_type: str) -> list:
        """Get list of available models for problem type"""
        if problem_type == 'classification':
            return list(cls.CLASSIFICATION_MODELS.keys())
        elif problem_type == 'regression':
            return list(cls.REGRESSION_MODELS.keys())
        else:
            return []
    
    @classmethod
    def get_default_model(cls, problem_type: str) -> str:
        """Get default model for problem type"""
        if problem_type == 'classification':
            return 'random_forest'
        elif problem_type == 'regression':
            return 'random_forest'
        else:
            raise ValueError(f"Unknown problem type: {problem_type}")


class EnsembleFactory:
    """Factory for creating ensemble models"""
    
    @staticmethod
    def create_classifier_ensemble(models: list) -> 'EnsembleClassifier':
        """Create ensemble of classifiers"""
        return EnsembleClassifier(models)
    
    @staticmethod
    def create_regressor_ensemble(models: list) -> 'EnsembleRegressor':
        """Create ensemble of regressors"""
        return EnsembleRegressor(models)


class EnsembleClassifier:
    """Ensemble of classification models"""
    
    def __init__(self, models: list):
        self.models = models
        self.weights = [1.0 / len(models)] * len(models)
    
    def fit(self, X, y):
        """Fit all models"""
        for model in self.models:
            model.fit(X, y)
        return self
    
    def predict(self, X) -> np.ndarray:
        """Average predictions from all models"""
        predictions = []
        for model in self.models:
            predictions.append(model.predict(X))
        return np.round(np.mean(predictions, axis=0)).astype(int)
    
    def predict_proba(self, X) -> np.ndarray:
        """Average probability predictions from all models"""
        proba_predictions = []
        for model in self.models:
            if hasattr(model, 'predict_proba'):
                proba_predictions.append(model.predict_proba(X))
            else:
                # Convert predictions to probabilities
                pred = model.predict(X)
                proba = np.zeros((len(pred), 2))
                proba[:, pred] = 1.0
                proba_predictions.append(proba)
        
        return np.mean(proba_predictions, axis=0)
    
    def get_disagreement_score(self, X) -> np.ndarray:
        """Compute disagreement between models"""
        predictions = []
        for model in self.models:
            predictions.append(model.predict(X))
        
        predictions = np.array(predictions)
        # Disagreement = proportion of models that disagree with majority
        majority_pred = np.round(np.mean(predictions, axis=0))
        disagreement = np.mean(predictions != majority_pred.reshape(1, -1), axis=0)
        
        return disagreement


class EnsembleRegressor:
    """Ensemble of regression models"""
    
    def __init__(self, models: list):
        self.models = models
        self.weights = [1.0 / len(models)] * len(models)
    
    def fit(self, X, y):
        """Fit all models"""
        for model in self.models:
            model.fit(X, y)
        return self
    
    def predict(self, X) -> np.ndarray:
        """Average predictions from all models"""
        predictions = []
        for model in self.models:
            predictions.append(model.predict(X))
        return np.mean(predictions, axis=0)
    
    def get_disagreement_score(self, X) -> np.ndarray:
        """Compute disagreement between models (std of predictions)"""
        predictions = []
        for model in self.models:
            predictions.append(model.predict(X))
        
        predictions = np.array(predictions)
        # Disagreement = std of predictions across models
        disagreement = np.std(predictions, axis=0)
        
        return disagreement


# Export classes
__all__ = [
    'ModelFactory',
    'EnsembleFactory',
    'EnsembleClassifier',
    'EnsembleRegressor'
]