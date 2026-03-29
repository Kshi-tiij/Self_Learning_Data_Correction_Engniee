# FILE LOCATION: backend/pipeline/preprocessing.py
# Purpose: Data preprocessing, scaling, encoding

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.compose import make_column_selector
import logging
from typing import Tuple, Dict, List, Any


logger = logging.getLogger(__name__)

class DataPreprocessor:
    """Handles all data preprocessing operations"""
    
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.preprocessor = None
        self.label_encoder = None
        self.feature_columns = None
        self.target_column = None
        self.problem_type = None
        self.categorical_features = None
        self.numeric_features = None
        self.fitted = False
    
    def detect_problem_type(self, df: pd.DataFrame, target_col: str) -> str:
        """
        Auto-detect problem type (classification or regression)
        
        Rules:
        1. If dtype is object/string → classification
        2. If unique values <= 20 → classification
        3. If contains >, <, text → classification
        4. If numeric with many unique values → regression
        """
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found")
        
        target = df[target_col]
        
        # Rule 1: Check dtype
        if target.dtype == 'object':
            logger.info("Problem type: CLASSIFICATION (object dtype)")
            return 'classification'
        
        # Rule 2: Check unique values
        unique_count = target.nunique()
        if unique_count <= 20:
            logger.info(f"Problem type: CLASSIFICATION ({unique_count} unique values)")
            return 'classification'
        
        # Rule 3: Check for special characters
        if target.dtype == 'object':
            has_special = target.astype(str).str.contains('[><]', regex=True).any()
            if has_special:
                logger.info("Problem type: CLASSIFICATION (contains special operators)")
                return 'classification'
        
        # Rule 4: Default to regression for numeric with many unique values
        logger.info(f"Problem type: REGRESSION ({unique_count} unique numeric values)")
        return 'regression'
    
    def identify_feature_types(self, df: pd.DataFrame, target_col: str) -> Tuple[List[str], List[str]]:
        """Identify categorical and numeric feature columns"""
        # Exclude target column
        features_df = df.drop(columns=[target_col])
        
        numeric_features = features_df.select_dtypes(include=['int64', 'float64']).columns.tolist()
        categorical_features = features_df.select_dtypes(include=['object']).columns.tolist()
        
        # Columns with few unique values might be categorical even if numeric
        for col in numeric_features:
            if df[col].nunique() <= 10:
                categorical_features.append(col)
                numeric_features.remove(col)
        
        logger.info(f"Numeric features: {numeric_features}")
        logger.info(f"Categorical features: {categorical_features}")
        
        return numeric_features, categorical_features
    
    def fit_preprocessor(self, df: pd.DataFrame, target_col: str, 
                        numeric_features: List[str], categorical_features: List[str]) -> None:
        """Fit the preprocessing pipeline"""
        
        # Create transformer pipeline
        numeric_transformer = Pipeline(steps=[
            ('scaler', StandardScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        # Combine transformers
        self.preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ],
            remainder='drop'
        )
        
        # Get feature columns
        X = df.drop(columns=[target_col])
        self.preprocessor.fit(X)
        
        # Get feature names after transformation
        self.feature_columns = self._get_feature_names(numeric_features, categorical_features)
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features
        self.target_column = target_col
        self.fitted = True
        
        logger.info(f"Preprocessor fitted with {len(self.feature_columns)} features")
    
    def _get_feature_names(self, numeric_features: List[str], categorical_features: List[str]) -> List[str]:
        """Get feature names after transformation"""
        feature_names = numeric_features.copy()
        
        # Add one-hot encoded categorical features
        for cat_feature in categorical_features:
            try:
                # Get categories from the fitted encoder
                encoder = self.preprocessor.named_transformers_['cat'].named_steps['onehot']
                categories = encoder.categories_[categorical_features.index(cat_feature)]
                for category in categories:
                    feature_names.append(f"{cat_feature}_{category}")
            except:
                pass
        
        return feature_names
    
    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transform data using fitted preprocessor"""
        if not self.fitted:
            raise ValueError("Preprocessor not fitted. Call fit_preprocessor first.")
        
        X = df.drop(columns=[self.target_column], errors='ignore')
        X_transformed = self.preprocessor.transform(X)
        
        return X_transformed
    
    def fit_transform(self, df: pd.DataFrame, target_col: str) -> Tuple[np.ndarray, np.ndarray]:
        """Fit preprocessor and transform data"""
        numeric_features, categorical_features = self.identify_feature_types(df, target_col)
        self.fit_preprocessor(df, target_col, numeric_features, categorical_features)
        
        X_transformed = self.transform(df)
        y = df[target_col].values
        
        return X_transformed, y
    
    def encode_target(self, y: np.ndarray, problem_type: str = 'classification') -> Tuple[np.ndarray, LabelEncoder]:
        """Encode target variable for classification"""
        if problem_type == 'classification':
            self.label_encoder = LabelEncoder()
            y_encoded = self.label_encoder.fit_transform(y)
            logger.info(f"Target encoded with {len(self.label_encoder.classes_)} classes: {self.label_encoder.classes_}")
            return y_encoded, self.label_encoder
        else:
            return y, None
    
    def decode_target(self, y_encoded: np.ndarray) -> np.ndarray:
        """Decode target variable from classification encoding"""
        if self.label_encoder is None:
            return y_encoded
        
        return self.label_encoder.inverse_transform(y_encoded.astype(int))
    
    def get_feature_info(self) -> Dict[str, Any]:
        """Get information about features"""
        return {
            'feature_columns': self.feature_columns,
            'numeric_features': self.numeric_features,
            'categorical_features': self.categorical_features,
            'target_column': self.target_column,
            'problem_type': self.problem_type,
            'num_features': len(self.feature_columns) if self.feature_columns else 0,
            'label_classes': self.label_encoder.classes_.tolist() if self.label_encoder else None
        }


class NoiseInjector:
    """Inject noise into labels for development/testing"""
    
    @staticmethod
    def inject_noise(y: np.ndarray, noise_rate: float = 0.1, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
        """
        Inject random noise into labels
        
        Args:
            y: Target variable
            noise_rate: Fraction of labels to corrupt (0-1)
            random_state: Random seed
        
        Returns:
            noisy_y: Labels with injected noise
            noise_mask: Boolean array indicating corrupted samples
        """
        np.random.seed(random_state)
        
        n_samples = len(y)
        n_noise = int(n_samples * noise_rate)
        
        # Randomly select indices to corrupt
        noise_indices = np.random.choice(n_samples, size=n_noise, replace=False)
        noise_mask = np.zeros(n_samples, dtype=bool)
        noise_mask[noise_indices] = True
        
        noisy_y = y.copy()
        
        # Corrupt selected samples
        for idx in noise_indices:
            if len(np.unique(y)) > 1:  # Multi-class
                possible_values = np.unique(y)
                # Replace with different value
                different_values = possible_values[possible_values != y[idx]]
                if len(different_values) > 0:
                    noisy_y[idx] = np.random.choice(different_values)
        
        n_corrupted = np.sum(noise_mask)
        logger.info(f"Injected noise into {n_corrupted} samples ({100*noise_rate:.1f}%)")
        
        return noisy_y, noise_mask


class FeatureScaler:
    """Wrapper for feature scaling operations"""
    
    @staticmethod
    def scale_features(X: np.ndarray, fit: bool = True, scaler: StandardScaler = None) -> Tuple[np.ndarray, StandardScaler]:
        """Scale features using StandardScaler"""
        if fit:
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
        else:
            if scaler is None:
                raise ValueError("Scaler required when fit=False")
            X_scaled = scaler.transform(X)
        
        return X_scaled, scaler
    
    @staticmethod
    def normalize_features(X: np.ndarray) -> np.ndarray:
        """Normalize features to [0, 1] range"""
        X_min = np.nanmin(X, axis=0)
        X_max = np.nanmax(X, axis=0)
        X_range = X_max - X_min
        X_range[X_range == 0] = 1  # Avoid division by zero
        return (X - X_min) / X_range


# Export all classes
__all__ = [
    'DataPreprocessor',
    'NoiseInjector',
    'FeatureScaler'
]