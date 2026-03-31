# FILE LOCATION: backend/api/endpoints.py
# Purpose: REST API routes and endpoints
# FIXED: JSON serialization error for numpy bool_ and numpy dtypes
# ENHANCED: Shows original features for samples

from flask import Blueprint, request, jsonify, send_file
from flask_cors import cross_origin
import logging
import numpy as np
import pandas as pd
from io import StringIO
from pathlib import Path

logger = logging.getLogger(__name__)

# Import all backend modules
from backend.config import DATA_DIR, SAVED_MODELS_DIR, LOGS_DIR
from backend.pipeline.data_engine import DataEngine, DataValidator
from backend.pipeline.preprocessing import DataPreprocessor
from backend.pipeline.trainer import ModelTrainer, SignalGenerator
from backend.models.factory import ModelFactory
from backend.thresholds.adaptive import AdaptiveThresholdEngine, MultiThresholdEngine
from backend.monitoring.drift import DriftDetector
from backend.explainability.shap_explainer import SHAPExplainer, ExplainabilityReporter
from backend.explainability.similarity import SimilarityEngine
from backend.utils.helpers import FileHelper, LoggingHelper, ValidationHelper

# Create blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

# Global state management
state = {
    'data_engine': None,
    'model_trainer': None,
    'signals': None,
    'corruption_threshold': 0.5,
    'preprocessor': None,
    'feature_names': None,
    'export_history': []
}

# ========================================================================
# HELPER FUNCTION: Convert numpy types to JSON-serializable Python types
# ========================================================================

def convert_to_serializable(obj):
    """Convert numpy/pandas types to Python native types for JSON serialization"""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    elif pd.isna(obj):
        return None
    else:
        return obj

# ========================================================================
# HEALTH & STATUS ENDPOINTS
# ========================================================================

@api_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'version': '1.0.0',
            'timestamp': pd.Timestamp.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500


@api_bp.route('/status', methods=['GET'])
@cross_origin()
def get_status():
    """Get platform status"""
    try:
        return jsonify({
            'data_loaded': state['data_engine'] is not None,
            'model_trained': state['model_trainer'] is not None and state['model_trainer'].primary_model is not None,
            'signals_computed': state['signals'] is not None,
            'api_status': 'ready'
        }), 200
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/session', methods=['GET'])
@cross_origin()
def get_session():
    """Retrieve full backend session state to restore frontend"""
    try:
        data_loaded = state['data_engine'] is not None
        model_trained = state['model_trainer'] is not None

        return jsonify({
            'dataUploaded': data_loaded,
            'uploadedFilename': getattr(state['data_engine'], 'source_filename', 'dataset.csv') if data_loaded else None,
            'targetSet': bool(state['data_engine'].target_column) if data_loaded else False,
            'targetColumn': state['data_engine'].target_column if data_loaded else None,
            'problemType': state['data_engine'].problem_type if data_loaded else None,
            'modelTrained': model_trained,
        }), 200
    except Exception as e:
        logger.error(f"Session fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/reset', methods=['POST'])
@cross_origin()
def reset_session():
    """Reset all global state to start fresh"""
    try:
        state['data_engine'] = None
        state['model_trainer'] = None
        state['signals'] = None
        state['preprocessor'] = None
        state['feature_names'] = None
        state['export_history'] = []
        return jsonify({'success': True}), 200
    except Exception as e:
        logger.error(f"Reset error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ========================================================================
# DATA MANAGEMENT ENDPOINTS
# ========================================================================

@api_bp.route('/data/upload', methods=['POST'])
@cross_origin()
def upload_data():
    """Upload CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file extension
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Only CSV files allowed'}), 400
        
        # Save file
        filepath = DATA_DIR / file.filename
        file.save(filepath)
        
        logger.info(f"File saved: {filepath}")
        
        # Load data
        state['data_engine'] = DataEngine()
        df = state['data_engine'].load_csv(str(filepath))
        
        # Validate data
        is_valid, msg = ValidationHelper.validate_csv(df)
        if not is_valid:
            return jsonify({'error': f'Invalid CSV: {msg}'}), 400
        
        logger.info(f"Data uploaded: {file.filename}")
        
        return jsonify({
            'success': True,
            'message': f"Loaded {len(df)} rows, {len(df.columns)} columns",
            'columns': df.columns.tolist(),
            'shape': list(df.shape)
        }), 200
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@api_bp.route('/data/columns', methods=['GET'])
@cross_origin()
def get_columns():
    """Get column information"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded. Upload CSV first.'}), 400
        
        columns_info = state['data_engine'].get_columns_info()
        
        return jsonify(convert_to_serializable(columns_info)), 200
    
    except Exception as e:
        logger.error(f"Columns error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting columns: {str(e)}'}), 500


@api_bp.route('/data/set-target', methods=['POST'])
@cross_origin()
def set_target():
    """Set target column"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded. Upload CSV first.'}), 400
        
        data = request.get_json()
        target_col = data.get('target_column')
        inject_noise = data.get('inject_noise', False)
        noise_rate = data.get('noise_rate', 0.1)
        
        if not target_col:
            return jsonify({'error': 'Target column required'}), 400
        
        # Validate target column
        is_valid, msg = ValidationHelper.validate_target_column(state['data_engine'].raw_df, target_col)
        if not is_valid:
            return jsonify({'error': f'Invalid target: {msg}'}), 400
        
        # Set target
        success = state['data_engine'].set_target_column(target_col)
        
        if not success:
            return jsonify({'error': 'Could not set target column'}), 400
        
        # Optionally inject noise
        if inject_noise:
            state['data_engine'].inject_synthetic_noise(noise_rate)
            logger.info(f"Injected {noise_rate*100:.1f}% noise")
        
        # Preprocess data
        try:
            X, y = state['data_engine'].preprocess_data()
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Preprocessing failed: {str(e)}'}), 400
        
        # Save preprocessor
        state['preprocessor'] = state['data_engine'].preprocessor
        state['feature_names'] = state['preprocessor'].feature_columns
        
        logger.info(f"Target set: {target_col}, Problem type: {state['data_engine'].problem_type}")
        
        return jsonify({
            'success': True,
            'target_column': target_col,
            'problem_type': state['data_engine'].problem_type,
            'X_shape': list(X.shape),
            'y_shape': list(y.shape),
            'num_features': len(state['feature_names']),
            'sample_features': state['feature_names'][:10]
        }), 200
    
    except Exception as e:
        logger.error(f"Set target error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error setting target: {str(e)}'}), 500


@api_bp.route('/data/summary', methods=['GET'])
@cross_origin()
def get_data_summary():
    """Get data summary"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded'}), 400
        
        summary = state['data_engine'].get_summary()
        
        return jsonify(convert_to_serializable(summary)), 200
    
    except Exception as e:
        logger.error(f"Summary error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ========================================================================
# MODEL TRAINING ENDPOINTS
# ========================================================================

@api_bp.route('/model/train', methods=['POST'])
@cross_origin()
def train_model():
    """Train primary and meta models"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded. Upload CSV first.'}), 400
        
        if state['data_engine'].target_column is None:
            return jsonify({'error': 'Set target column first.'}), 400
        
        data = request.get_json()
        model_type = data.get('model_type', 'random_forest')
        problem_type = state['data_engine'].problem_type
        
        logger.info(f"Training model: {model_type}, Problem: {problem_type}")
        
        # Get processed data
        try:
            X, y = state['data_engine'].preprocess_data()
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Preprocessing failed: {str(e)}'}), 400
        
        # Validate data shapes
        if len(X) == 0 or len(y) == 0:
            return jsonify({'error': 'No data to train on'}), 400
        
        logger.info(f"Data shapes: X={X.shape}, y={y.shape}")
        
        # Create and train trainer
        try:
            state['model_trainer'] = ModelTrainer(problem_type, model_type)
            state['model_trainer'].train_primary_model(X, y)
            logger.info("Primary model trained")
        except Exception as e:
            logger.error(f"Model training error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Model training failed: {str(e)}'}), 400
        
        # Get predictions and generate signals
        try:
            y_pred, y_proba = state['model_trainer'].get_primary_predictions(X)
            logger.info(f"Predictions shape: y_pred={y_pred.shape}, y_proba={y_proba.shape}")
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Prediction failed: {str(e)}'}), 400
        
        try:
            state['signals'] = state['model_trainer'].generate_signals(X, y, y_pred, y_proba)
            logger.info(f"Signals generated: {state['signals'].shape}")
        except Exception as e:
            logger.error(f"Signal generation error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Signal generation failed: {str(e)}'}), 400
        
        # Train meta-model
        try:
            state['model_trainer'].train_meta_model(X, y, state['signals'])
            logger.info("Meta-model trained")
        except Exception as e:
            logger.error(f"Meta-model training error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Meta-model training failed: {str(e)}'}), 400
        
        # Evaluate
        try:
            metrics = state['model_trainer'].evaluate(X, y)
            logger.info(f"Metrics: {metrics}")
        except Exception as e:
            logger.warning(f"Metric evaluation error: {str(e)}")
            metrics = {'status': 'computed but with errors'}
        
        logger.info("✅ Model training complete")
        
        return jsonify({
            'success': True,
            'model_type': model_type,
            'problem_type': problem_type,
            'metrics': convert_to_serializable(metrics),
            'training_samples': len(X)
        }), 200
    
    except Exception as e:
        logger.error(f"Training error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Training failed: {str(e)}'}), 500


@api_bp.route('/model/feature-importance', methods=['GET'])
@cross_origin()
def get_feature_importance():
    """Get feature importance"""
    try:
        if state['model_trainer'] is None or state['model_trainer'].primary_model is None:
            return jsonify({'error': 'Model not trained. Train model first.'}), 400
        
        if state['feature_names'] is None:
            return jsonify({'error': 'Feature names not available'}), 400
        
        importance = state['model_trainer'].get_feature_importance(state['feature_names'])
        
        return jsonify({
            'feature_importance': convert_to_serializable(importance),
            'top_features': list(importance.keys())[:5]
        }), 200
    
    except Exception as e:
        logger.error(f"Feature importance error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ========================================================================
# CORRECTION & REVIEW ENDPOINTS
# ========================================================================

@api_bp.route('/correction/detect', methods=['POST'])
@cross_origin()
def detect_corrections():
    """Detect samples needing correction"""
    try:
        if state['signals'] is None:
            return jsonify({'error': 'Model not trained. Train model first.'}), 400
        
        if state['model_trainer'] is None or state['model_trainer'].meta_model is None:
            return jsonify({'error': 'Meta-model not trained'}), 400
        
        data = request.get_json()
        percentile = data.get('percentile', 75)
        
        # Validate percentile
        if not (0 < percentile < 100):
            return jsonify({'error': 'Percentile must be between 0 and 100'}), 400
        
        logger.info(f"Detecting corruptions with percentile={percentile}")
        
        # Compute adaptive threshold
        threshold_engine = AdaptiveThresholdEngine('percentile')
        corruption_proba = state['model_trainer'].predict_corruption_probability(state['signals'])
        
        if corruption_proba is None or len(corruption_proba) == 0:
            return jsonify({'error': 'Could not compute corruption probabilities'}), 500
        
        threshold = threshold_engine.compute_percentile_threshold(corruption_proba, percentile)
        state['corruption_threshold'] = float(threshold)
        
        logger.info(f"Threshold computed: {threshold}")
        
        # Flag anomalies
        flagged_indices = np.where(corruption_proba > threshold)[0]
        
        logger.info(f"Flagged {len(flagged_indices)} samples")
        
        return jsonify({
            'flagged_count': int(len(flagged_indices)),
            'flagged_samples': [int(x) for x in flagged_indices.tolist()[:500]],  # Convert to int, limit to 500
            'corruption_threshold': float(threshold),
            'total_samples': int(len(corruption_proba))
        }), 200
    
    except Exception as e:
        logger.error(f"Detection error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Detection failed: {str(e)}'}), 500


@api_bp.route('/correction/sample/<int:sample_id>', methods=['GET'])
@cross_origin()
def get_sample_details(sample_id):
    """Get detailed information about a sample WITH ORIGINAL FEATURES - ENHANCED"""
    try:
        # ===== VALIDATION =====
        logger.info(f"Getting sample #{sample_id} details with features")
        
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded'}), 400
        
        if state['model_trainer'] is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        if state['signals'] is None:
            return jsonify({'error': 'Signals not computed'}), 400
        
        # Validate sample_id type and range
        if not isinstance(sample_id, int):
            return jsonify({'error': f'Invalid sample ID type: {type(sample_id).__name__}'}), 400
        
        if sample_id < 0:
            return jsonify({'error': 'Sample ID must be non-negative'}), 400
        
        # ===== GET DATA =====
        try:
            X, y = state['data_engine'].preprocess_data()
            raw_df = state['data_engine'].raw_df  # Get original unprocessed data
        except Exception as e:
            logger.error(f"Preprocessing failed: {str(e)}", exc_info=True)
            return jsonify({'error': f'Data preprocessing failed: {str(e)}'}), 500
        
        if sample_id >= len(X):
            return jsonify({
                'error': f'Sample ID {sample_id} out of range',
                'valid_range': f'[0, {len(X)-1}]',
                'total_samples': len(X)
            }), 400
        
        logger.info(f"Data retrieved: X shape = {X.shape}, y shape = {y.shape}")
        
        # ===== GET PREDICTIONS =====
        try:
            # Extract sample
            sample_X = X[sample_id:sample_id+1]
            
            # Validate shape
            if len(sample_X.shape) != 2:
                sample_X = sample_X.reshape(1, -1)
            
            logger.info(f"Sample shape: {sample_X.shape}")
            
            # Get predictions
            y_pred, y_proba = state['model_trainer'].get_primary_predictions(sample_X)
            
            if y_pred is None or len(y_pred) == 0:
                return jsonify({'error': 'Could not get predictions'}), 500
            
            pred_label = int(y_pred[0])
            true_label = int(y[sample_id])
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Prediction failed: {str(e)}'}), 500
        
        # ===== GET SIGNALS =====
        try:
            if sample_id >= len(state['signals']):
                return jsonify({'error': f'Sample {sample_id} not in signals'}), 400
            
            signals_row = state['signals'].iloc[sample_id].to_dict()
            # Convert all signal values to float (handle numpy types)
            signals_row = {k: float(v) for k, v in signals_row.items()}
            
        except Exception as e:
            logger.error(f"Signal retrieval error: {str(e)}", exc_info=True)
            return jsonify({'error': f'Could not get signals: {str(e)}'}), 500
        
        # ===== GET CORRUPTION PROBABILITY =====
        try:
            if state['model_trainer'].meta_model is None:
                corruption_prob = 0.5  # Default fallback
            else:
                signals_sample = state['signals'].iloc[sample_id:sample_id+1]
                corruption_prob = float(state['model_trainer'].predict_corruption_probability(signals_sample)[0])
        except Exception as e:
            logger.warning(f"Could not compute corruption probability: {str(e)}")
            corruption_prob = 0.5  # Fallback
        
        # ===== GET ORIGINAL FEATURES (NEW!) =====
        original_features = {}
        if sample_id < len(raw_df):
            for col in raw_df.columns:
                # Exclude target column from features
                if col != state['data_engine'].target_column:
                    value = raw_df.iloc[sample_id][col]
                    # Convert numpy types to Python native types
                    if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                        value = int(value)
                    elif isinstance(value, (np.floating, np.float64, np.float32)):
                        value = float(value)
                    elif isinstance(value, (np.bool_, bool)):
                        value = bool(value)
                    elif pd.isna(value):
                        value = None
                    original_features[col] = value
            
            logger.info(f"Original features extracted: {len(original_features)} features")
        
        # ===== BUILD RESPONSE (ENHANCED WITH FEATURES!) =====
        response = {
            'sample_id': int(sample_id),
            'true_label': int(true_label),
            'predicted_label': int(pred_label),
            'prediction_probability': float(np.max(y_proba[0])) if y_proba is not None and len(y_proba) > 0 else 0.5,
            'signals': signals_row,
            'corruption_probability': float(corruption_prob),
            'needs_review': bool(corruption_prob > state['corruption_threshold']),
            # NEW: Original features
            'original_features': original_features,
            'feature_count': len(original_features)
        }
        
        logger.info(f"✅ Sample details retrieved successfully with {len(original_features)} features")
        
        return jsonify(convert_to_serializable(response)), 200
    
    except Exception as e:
        logger.error(f"Sample details error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting sample details: {str(e)}'}), 500


@api_bp.route('/correction/feedback', methods=['POST'])
@cross_origin()
def submit_feedback():
    """Submit human feedback"""
    try:
        data = request.get_json()
        
        # Validate input
        sample_id = data.get('sample_id')
        decision = data.get('decision')
        
        if sample_id is None:
            return jsonify({'error': 'sample_id required'}), 400
        
        if decision not in ['approve', 'reject', 'unsure']:
            return jsonify({'error': f'Invalid decision: {decision}'}), 400
        
        corrected_value = data.get('corrected_value')
        notes = data.get('notes', '')
        reviewer_id = data.get('reviewer_id', 'unknown')
        
        # Log feedback
        try:
            feedback_record = {
                'sample_id': sample_id,
                'decision': decision,
                'corrected_value': corrected_value,
                'notes': notes,
                'reviewer_id': reviewer_id
            }
            
            LoggingHelper.log_feedback_record(feedback_record, LOGS_DIR)
            
            logger.info(f"Feedback submitted for sample {sample_id}: {decision}")
        except Exception as e:
            logger.warning(f"Could not log feedback: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': 'Feedback recorded'
        }), 200
    
    except Exception as e:
        logger.error(f"Feedback error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Feedback submission failed: {str(e)}'}), 500


# ========================================================================
# MONITORING & DRIFT ENDPOINTS
# ========================================================================

@api_bp.route('/monitoring/drift', methods=['POST'])
@cross_origin()
def detect_drift():
    """Detect data drift"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded'}), 400
        
        X, y = state['data_engine'].preprocess_data()
        
        # Initialize drift detector on first half
        X_ref = X[:len(X)//2]
        y_ref = y[:len(y)//2]
        drift_detector = DriftDetector(X_ref, y_ref)
        
        # Detect drift in second half
        X_new = X[len(X)//2:]
        y_new = y[len(y)//2:]
        
        drift_summary = drift_detector.get_drift_summary(X_new, y_new)
        
        return jsonify(convert_to_serializable(drift_summary)), 200
    
    except Exception as e:
        logger.error(f"Drift detection error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/monitoring/metrics', methods=['GET'])
@cross_origin()
def get_metrics():
    """Get performance metrics"""
    try:
        if state['model_trainer'] is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        X, y = state['data_engine'].preprocess_data()
        metrics = state['model_trainer'].evaluate(X, y)
        
        return jsonify({
            'metrics': convert_to_serializable(metrics),
            'timestamp': pd.Timestamp.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Metrics error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ========================================================================
# REPORTS & EXPORT ENDPOINTS
# ========================================================================

@api_bp.route('/reports/stats', methods=['GET'])
@cross_origin()
def get_report_stats():
    """Get report statistics — real counts from loaded data"""
    try:
        result = {
            'total_exports': len(state.get('export_history', [])),
            'total_samples': 0,
            'clean_samples': 0,
            'flagged_samples': 0,
            'data_loaded': state['data_engine'] is not None,
        }

        if state['data_engine'] is not None:
            X, y = state['data_engine'].preprocess_data()
            result['total_samples'] = int(len(X))

            if (state.get('model_trainer') is not None
                    and state.get('signals') is not None
                    and state['model_trainer'].meta_model is not None):
                corruption_proba = state['model_trainer'].predict_corruption_probability(state['signals'])
                threshold = state.get('corruption_threshold', 0.5)
                flagged = int(np.sum(corruption_proba > threshold))
                result['flagged_samples'] = flagged
                result['clean_samples'] = int(len(X) - flagged)
            else:
                result['clean_samples'] = int(len(X))

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Report stats error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/reports/export', methods=['POST'])
@cross_origin()
def export_data():
    """Generate a real export file (CSV, JSON, or TXT report)"""
    try:
        if state['data_engine'] is None:
            return jsonify({'error': 'No data loaded. Upload CSV first.'}), 400

        data = request.get_json()
        fmt = data.get('format', 'csv')
        include_probs = data.get('include_probabilities', True)
        only_suspicious = data.get('only_suspicious', False)

        # Work on a copy of the raw data
        export_df = state['data_engine'].raw_df.copy()

        # Attach corruption probabilities when available
        has_probs = False
        if (include_probs
                and state.get('model_trainer') is not None
                and state.get('signals') is not None
                and state['model_trainer'].meta_model is not None):
            corruption_proba = state['model_trainer'].predict_corruption_probability(state['signals'])
            if len(corruption_proba) == len(export_df):
                export_df['corruption_probability'] = corruption_proba
                has_probs = True

        # Filter to suspicious only
        if only_suspicious and has_probs:
            threshold = state.get('corruption_threshold', 0.5)
            export_df = export_df[export_df['corruption_probability'] > threshold]

        # Prepare exports directory
        export_dir = DATA_DIR / 'exports'
        export_dir.mkdir(exist_ok=True)
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')

        if fmt == 'csv':
            filename = f'export_{timestamp}.csv'
            filepath = export_dir / filename
            export_df.to_csv(filepath, index=False)
        elif fmt == 'json':
            filename = f'export_{timestamp}.json'
            filepath = export_dir / filename
            export_df.to_json(filepath, orient='records', indent=2)
        elif fmt == 'pdf':
            # Generate a text-based compliance report
            filename = f'compliance_report_{timestamp}.txt'
            filepath = export_dir / filename
            col_list = ", ".join(export_df.columns.tolist())
            target_col = state['data_engine'].target_column
            problem_type = state['data_engine'].problem_type
            with open(filepath, 'w') as f:
                f.write("SLDCE PRO -- Data Quality Compliance Report\n")
                f.write(f"Generated: {pd.Timestamp.now().isoformat()}\n")
                f.write("=" * 56 + "\n\n")
                f.write(f"Dataset Shape   : {export_df.shape[0]} rows x {export_df.shape[1]} columns\n")
                f.write(f"Columns         : {col_list}\n")
                if target_col:
                    f.write(f"Target Column   : {target_col}\n")
                    f.write(f"Problem Type    : {problem_type}\n")
                f.write("\n--- Descriptive Statistics ---\n\n")
                f.write(export_df.describe(include='all').to_string())
                f.write('\n')
        else:
            return jsonify({'error': f'Unsupported format: {fmt}'}), 400

        # Record in history
        record = {
            'filename': filename,
            'format': fmt,
            'rows': int(len(export_df)),
            'timestamp': pd.Timestamp.now().isoformat(),
            'include_probabilities': bool(include_probs),
            'only_suspicious': bool(only_suspicious),
        }
        state['export_history'].insert(0, record)

        logger.info(f"✅ Export generated: {filename} ({len(export_df)} rows)")

        return jsonify({
            'success': True,
            'filename': filename,
            'format': fmt,
            'rows_exported': int(len(export_df)),
        }), 200

    except Exception as e:
        logger.error(f"Export error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Export failed: {str(e)}'}), 500


@api_bp.route('/reports/recent', methods=['GET'])
@cross_origin()
def get_recent_exports():
    """Get recent export history"""
    try:
        history = state.get('export_history', [])
        return jsonify({
            'exports': history[:20],
            'total_exports': len(history),
        }), 200
    except Exception as e:
        logger.error(f"Recent exports error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/reports/download/<filename>', methods=['GET'])
@cross_origin()
def download_export(filename):
    """Download an exported file"""
    try:
        export_dir = DATA_DIR / 'exports'
        filepath = export_dir / filename

        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404

        return send_file(str(filepath.resolve()), as_attachment=True,
                         download_name=filename)
    except Exception as e:
        logger.error(f"Download error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ========================================================================
# CONFIGURATION ENDPOINTS
# ========================================================================

@api_bp.route('/config/models', methods=['GET'])
@cross_origin()
def get_available_models():
    """Get available models"""
    try:
        problem_type = request.args.get('problem_type', 'classification')
        
        if problem_type not in ['classification', 'regression']:
            return jsonify({'error': f'Invalid problem type: {problem_type}'}), 400
        
        models = ModelFactory.get_available_models(problem_type)
        default = ModelFactory.get_default_model(problem_type)
        
        return jsonify({
            'models': models,
            'default_model': default
        }), 200
    
    except Exception as e:
        logger.error(f"Models config error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ========================================================================
# ERROR HANDLERS
# ========================================================================

@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@api_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {str(error)}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500


# Export blueprint
__all__ = ['api_bp']