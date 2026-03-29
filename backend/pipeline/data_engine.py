# FILE LOCATION: backend/pipeline/data_engine.py
# Purpose: Universal CSV data processing and validation

import pandas as pd
import numpy as np
from pathlib import Path
import logging
from typing import Tuple, List, Dict, Any

from backend.utils.helpers import DataHelper, FileHelper, ValidationHelper
from backend.pipeline.preprocessing import DataPreprocessor, NoiseInjector

logger = logging.getLogger(__name__)

class DataEngine:
    """Universal engine for loading and processing any CSV"""
    
    def __init__(self):
        self.raw_df = None
        self.processed_df = None
        self.target_column = None
        self.feature_columns = None
        self.problem_type = None
        self.preprocessor = DataPreprocessor()
        self.metadata = {}
    
    def load_csv(self, filepath: str) -> pd.DataFrame:
        """Load CSV file"""
        logger.info(f"Loading CSV from {filepath}")
        
        try:
            df = FileHelper.read_csv(filepath)
            self.raw_df = df.copy()
            logger.info(f"Loaded {len(df)} rows and {len(df.columns)} columns")
            return df
        except Exception as e:
            logger.error(f"Error loading CSV: {str(e)}")
            raise
    
    def get_columns_info(self) -> Dict[str, List[str]]:
        """Get information about columns in the dataset"""
        if self.raw_df is None:
            raise ValueError("No data loaded")
        
        numeric_cols = self.raw_df.select_dtypes(include=['int64', 'float64']).columns.tolist()
        categorical_cols = self.raw_df.select_dtypes(include=['object']).columns.tolist()
        
        return {
            'all_columns': self.raw_df.columns.tolist(),
            'numeric_columns': numeric_cols,
            'categorical_columns': categorical_cols,
            'dtypes': self.raw_df.dtypes.astype(str).to_dict()
        }
    
    def set_target_column(self, target_col: str) -> bool:
        """Set target column and validate"""
        if self.raw_df is None:
            raise ValueError("No data loaded")
        
        is_valid, msg = ValidationHelper.validate_target_column(self.raw_df, target_col)
        if not is_valid:
            logger.error(f"Invalid target column: {msg}")
            return False
        
        self.target_column = target_col
        logger.info(f"Target column set to: {target_col}")
        
        # Auto-detect problem type
        self.problem_type = self.preprocessor.detect_problem_type(self.raw_df, target_col)
        logger.info(f"Problem type detected: {self.problem_type}")
        
        return True
    
    def get_data_statistics(self) -> Dict[str, Any]:
        """Get statistics about the dataset"""
        if self.raw_df is None:
            raise ValueError("No data loaded")
        
        stats = {
            'n_rows': len(self.raw_df),
            'n_columns': len(self.raw_df.columns),
            'missing_values': self.raw_df.isnull().sum().to_dict(),
            'missing_percentage': (self.raw_df.isnull().sum() / len(self.raw_df) * 100).to_dict(),
            'columns_info': self.get_columns_info(),
        }
        
        if self.target_column:
            target = self.raw_df[self.target_column]
            stats['target_info'] = {
                'name': self.target_column,
                'dtype': str(target.dtype),
                'unique_values': target.nunique(),
                'missing': int(target.isnull().sum()),
                'value_counts': target.value_counts().to_dict()
            }
        
        return stats
    
    def preprocess_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess data for modeling"""
        if self.raw_df is None or self.target_column is None:
            raise ValueError("Data not loaded or target column not set")
        
        # Handle missing values
        df_clean = DataHelper.handle_missing_values(self.raw_df, method='mean')
        
        # Fit preprocessor and transform
        X, y = self.preprocessor.fit_transform(df_clean, self.target_column)
        
        # Encode target for classification
        if self.problem_type == 'classification':
            y, _ = self.preprocessor.encode_target(y, self.problem_type)
        
        logger.info(f"Preprocessed data: X shape = {X.shape}, y shape = {y.shape}")
        
        return X, y
    
    def inject_synthetic_noise(self, noise_rate: float = 0.1) -> np.ndarray:
        """Inject noise into target variable for testing"""
        if self.raw_df is None or self.target_column is None:
            raise ValueError("Data not loaded or target column not set")
        
        y = self.raw_df[self.target_column].values
        noisy_y, noise_mask = NoiseInjector.inject_noise(y, noise_rate)
        
        # Update dataframe with noisy labels
        self.raw_df[self.target_column] = noisy_y
        
        logger.info(f"Injected {np.sum(noise_mask)} noisy labels")
        
        return noise_mask
    
    def get_feature_columns(self) -> List[str]:
        """Get feature column names (excluding target)"""
        if self.raw_df is None or self.target_column is None:
            raise ValueError("Data not loaded or target column not set")
        
        return [col for col in self.raw_df.columns if col != self.target_column]
    
    def get_processed_data(self) -> Tuple[pd.DataFrame, str, str]:
        """Get processed data ready for modeling"""
        if self.raw_df is None or self.target_column is None:
            raise ValueError("Data not loaded or target column not set")
        
        return self.raw_df, self.target_column, self.problem_type
    
    def validate_data(self) -> Tuple[bool, str]:
        """Validate loaded data"""
        if self.raw_df is None:
            return False, "No data loaded"
        
        return ValidationHelper.validate_csv(self.raw_df)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get complete summary of dataset"""
        if self.raw_df is None:
            raise ValueError("No data loaded")
        
        return {
            'status': 'ready' if self.target_column else 'awaiting_target_selection',
            'n_rows': len(self.raw_df),
            'n_columns': len(self.raw_df.columns),
            'n_features': len(self.get_feature_columns()) if self.target_column else 0,
            'target_column': self.target_column,
            'problem_type': self.problem_type,
            'columns': self.raw_df.columns.tolist(),
            'data_types': self.raw_df.dtypes.astype(str).to_dict(),
            'missing_values': int(self.raw_df.isnull().sum().sum()),
            'missing_percentage': float(self.raw_df.isnull().sum().sum() / (len(self.raw_df) * len(self.raw_df.columns)) * 100),
            'preprocessor_fitted': self.preprocessor.fitted
        }
    
    def get_sample_data(self, n_rows: int = 5) -> List[Dict[str, Any]]:
        """Get sample of data as list of dicts"""
        if self.raw_df is None:
            raise ValueError("No data loaded")
        
        return self.raw_df.head(n_rows).to_dict('records')


class DataValidator:
    """Validate data quality and integrity"""
    
    @staticmethod
    def check_data_quality(df: pd.DataFrame, target_col: str = None) -> Dict[str, Any]:
        """Check various data quality metrics"""
        quality_report = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'total_cells': len(df) * len(df.columns),
            'missing_cells': int(df.isnull().sum().sum()),
            'missing_percentage': float(df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100),
            'duplicate_rows': len(df) - len(df.drop_duplicates()),
            'duplicate_percentage': float((len(df) - len(df.drop_duplicates())) / len(df) * 100),
            'column_quality': {}
        }
        
        for col in df.columns:
            quality_report['column_quality'][col] = {
                'dtype': str(df[col].dtype),
                'missing_count': int(df[col].isnull().sum()),
                'missing_percentage': float(df[col].isnull().sum() / len(df) * 100),
                'unique_values': int(df[col].nunique()),
                'is_numeric': df[col].dtype in ['int64', 'float64']
            }
        
        return quality_report
    
    @staticmethod
    def detect_outliers(df: pd.DataFrame, method: str = 'iqr') -> Dict[str, List[int]]:
        """Detect outliers in numeric columns"""
        outliers = {}
        
        numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
        
        for col in numeric_cols:
            if method == 'iqr':
                q1 = df[col].quantile(0.25)
                q3 = df[col].quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outlier_indices = df[outlier_mask].index.tolist()
                
                if outlier_indices:
                    outliers[col] = outlier_indices
        
        return outliers
    
    @staticmethod
    def detect_categorical_imbalance(df: pd.DataFrame, target_col: str = None) -> Dict[str, Any]:
        """Detect class imbalance in categorical columns"""
        imbalance_report = {}
        
        categorical_cols = df.select_dtypes(include=['object']).columns
        
        for col in categorical_cols:
            value_counts = df[col].value_counts()
            distribution = (value_counts / len(df) * 100).to_dict()
            
            # Calculate imbalance ratio
            max_freq = value_counts.max()
            min_freq = value_counts.min()
            imbalance_ratio = max_freq / min_freq if min_freq > 0 else float('inf')
            
            imbalance_report[col] = {
                'distribution': distribution,
                'imbalance_ratio': float(imbalance_ratio),
                'is_imbalanced': imbalance_ratio > 3  # Threshold
            }
        
        return imbalance_report


# Export classes
__all__ = [
    'DataEngine',
    'DataValidator'
]