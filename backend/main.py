# FILE LOCATION: backend/main.py
# Purpose: Main Flask application entry point

import os
import sys
import logging
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import configuration
from backend.config import (
    API_HOST, API_PORT, DEBUG, PROJECT_ROOT,
    DATA_DIR, SAVED_MODELS_DIR, LOGS_DIR
)

# Import API blueprint
from backend.api.endpoints import api_bp

def create_app():
    """Create and configure Flask application"""
    
    app = Flask(__name__)
    
    # Configuration
    app.config['DEBUG'] = DEBUG
    app.config['JSON_SORT_KEYS'] = False
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(api_bp)
    
    # Create directories
    DATA_DIR.mkdir(exist_ok=True)
    SAVED_MODELS_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)
    
    logger.info("=" * 80)
    logger.info("SLDCE PRO - Self-Learning Data Correction & Governance Engine")
    logger.info("=" * 80)
    logger.info(f"Project Root: {PROJECT_ROOT}")
    logger.info(f"Data Directory: {DATA_DIR}")
    logger.info(f"Models Directory: {SAVED_MODELS_DIR}")
    logger.info(f"Logs Directory: {LOGS_DIR}")
    logger.info("=" * 80)
    
    # Health check route
    @app.route('/', methods=['GET'])
    def index():
        """Root endpoint"""
        return jsonify({
            'name': 'SLDCE PRO',
            'version': '1.0.0',
            'status': 'running',
            'api_url': 'http://localhost:5000/api/v1',
            'frontend_url': 'http://localhost:8501',
            'description': 'Self-Learning Data Correction & Governance Engine'
        }), 200
    
    # Health endpoint
    @app.route('/health', methods=['GET'])
    def health():
        """Health check"""
        return jsonify({
            'status': 'healthy',
            'service': 'sldce_pro_backend'
        }), 200
    
    # 404 handler
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint not found',
            'path': request.path,
            'method': request.method
        }), 404
    
    # 500 handler
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(error)
        }), 500
    
    logger.info("Flask application created successfully")
    logger.info(f"API Blueprint registered with prefix: /api/v1")
    
    return app


if __name__ == '__main__':
    # Create app
    app = create_app()
    
    logger.info("=" * 80)
    logger.info("Starting SLDCE PRO Backend Server")
    logger.info("=" * 80)
    logger.info(f"Host: {API_HOST}")
    logger.info(f"Port: {API_PORT}")
    logger.info(f"Debug: {DEBUG}")
    logger.info("=" * 80)
    logger.info("Endpoints:")
    logger.info("  - Health: http://localhost:5000/health")
    logger.info("  - API Base: http://localhost:5000/api/v1")
    logger.info("  - Frontend: http://localhost:8501")
    logger.info("=" * 80)
    
    # Run server
    try:
        from waitress import serve
        logger.info("Using Waitress WSGI server (production-ready)")
        serve(app, host=API_HOST, port=API_PORT)
    except ImportError:
        logger.warning("Waitress not found, using Flask development server")
        app.run(host=API_HOST, port=API_PORT, debug=DEBUG)