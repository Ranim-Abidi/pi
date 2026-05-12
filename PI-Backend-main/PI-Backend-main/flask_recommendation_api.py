"""
Flask API for recommendation model predictions
Serves pre-trained ML models for candidate-job matching
"""

from flask import Flask, request, jsonify
import joblib
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import os
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ML_INTERNAL_API_KEY = os.getenv("ML_INTERNAL_API_KEY", "").strip()


@app.before_request
def _require_internal_api_key():
    if request.method == "OPTIONS":
        return None
    if request.path == "/health":
        return None
    if not ML_INTERNAL_API_KEY:
        return None
    if request.headers.get("X-Internal-Api-Key") != ML_INTERNAL_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None

# Model paths
MODEL_DIR = os.getenv('MODEL_DIR', './saved_model')
GBR_MODEL_PATH = os.path.join(MODEL_DIR, 'gbr_model.joblib')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.joblib')
CLASSIFIER_PATH = os.path.join(MODEL_DIR, 'rf_classifier_multi.joblib')

# Load models at startup
gbr_model = None
scaler = None
classifier = None
models_loaded = False

try:
    if os.path.exists(GBR_MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(CLASSIFIER_PATH):
        gbr_model = joblib.load(GBR_MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        classifier = joblib.load(CLASSIFIER_PATH)
        models_loaded = True
        logger.info("✓ All models loaded successfully")
    else:
        logger.warning("⚠️  Model files not found. Running in DEMO mode.")
        logger.info(f"Expected model files in: {MODEL_DIR}")
        logger.info(f"  - {GBR_MODEL_PATH}")
        logger.info(f"  - {SCALER_PATH}")
        logger.info(f"  - {CLASSIFIER_PATH}")
        logger.info("\nTo export models from notebook, run:")
        logger.info("  1. Complete training in matchykhedma.ipynb")
        logger.info("  2. Run export_models.py in the notebook")
        logger.info("  3. Copy saved_model/ to this directory")
except Exception as e:
    logger.error(f"Error loading models: {e}")
    logger.warning("Running in DEMO mode with simulated predictions")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    if models_loaded:
        return jsonify({
            'status': 'ok',
            'message': 'Recommendation service is running',
            'models': 'LOADED'
        }), 200
    else:
        return jsonify({
            'status': 'warning',
            'message': 'Recommendation service running in DEMO mode',
            'models': 'NOT_LOADED',
            'instructions': 'See logs for model export instructions'
        }), 200


@app.route('/api/recommend', methods=['POST'])
def recommend():
    """
    Main recommendation endpoint
    
    Expected JSON payload:
    {
        "s_skills": 0.7,
        "s_experience": 0.8,
        "s_location": 0.5,
        "s_domain": 0.9
    }
    
    Returns:
    {
        "Scoreglobal": 66.05,
        "binary_classification": "Bon candidat",
        "multi_class_classification": "Recommandé"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['s_skills', 's_experience', 's_location', 's_domain']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields. Expected: ' + ', '.join(required_fields)
            }), 400
        
        # Extract scores
        scores = np.array([[
            data['s_skills'],
            data['s_experience'],
            data['s_location'],
            data['s_domain']
        ]], dtype=np.float64)
        
        # Validate score ranges (0-1)
        if np.any(scores < 0) or np.any(scores > 1):
            return jsonify({
                'error': 'All scores must be between 0 and 1'
            }), 400
        
        # If models are loaded, use them
        if models_loaded and gbr_model is not None and scaler is not None and classifier is not None:
            # Scale the input
            scaled_scores = scaler.transform(scores)
            
            # Predict Scoreglobal using Gradient Boosting Regressor
            scoreglobal = gbr_model.predict(scaled_scores)[0]
            
            # Predict multi-class classification
            multi_class = classifier.predict(scaled_scores)[0]
            
            # Determine binary classification
            binary_classification = "Bon candidat" if scoreglobal >= 60 else "Mauvais candidat"
            
            logger.info(f"Prediction made (REAL): Scoreglobal={scoreglobal:.2f}, Level={multi_class}")
        else:
            # Fallback: Simple demo scoring (average of scores * 100)
            avg_score = np.mean(scores) * 100
            
            if avg_score >= 80:
                multi_class = "Très recommandé"
            elif avg_score >= 60:
                multi_class = "Recommandé"
            elif avg_score >= 40:
                multi_class = "Moyen"
            else:
                multi_class = "Faible match"
            
            binary_classification = "Bon candidat" if avg_score >= 60 else "Mauvais candidat"
            scoreglobal = avg_score
            
            logger.warning(f"Prediction made (DEMO): Scoreglobal={scoreglobal:.2f}, Level={multi_class}")
        
        response = {
            "Scoreglobal": round(scoreglobal, 2),
            "binary_classification": binary_classification,
            "multi_class_classification": multi_class,
            "mode": "REAL" if models_loaded else "DEMO"
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in recommendation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/batch-recommend', methods=['POST'])
def batch_recommend():
    """
    Batch recommendation endpoint for multiple candidates
    
    Expected JSON payload:
    {
        "candidates": [
            {
                "id": 1,
                "s_skills": 0.7,
                "s_experience": 0.8,
                "s_location": 0.5,
                "s_domain": 0.9
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if 'candidates' not in data:
            return jsonify({'error': 'Missing "candidates" field'}), 400
        
        candidates = data['candidates']
        results = []
        
        for candidate in candidates:
            try:
                scores = np.array([[
                    candidate.get('s_skills', 0),
                    candidate.get('s_experience', 0),
                    candidate.get('s_location', 0),
                    candidate.get('s_domain', 0)
                ]], dtype=np.float64)
                
                if models_loaded and gbr_model is not None and scaler is not None and classifier is not None:
                    scaled_scores = scaler.transform(scores)
                    scoreglobal = gbr_model.predict(scaled_scores)[0]
                    multi_class = classifier.predict(scaled_scores)[0]
                else:
                    # Demo mode
                    scoreglobal = np.mean(scores) * 100
                    if scoreglobal >= 80:
                        multi_class = "Très recommandé"
                    elif scoreglobal >= 60:
                        multi_class = "Recommandé"
                    elif scoreglobal >= 40:
                        multi_class = "Moyen"
                    else:
                        multi_class = "Faible match"
                
                binary = "Bon candidat" if scoreglobal >= 60 else "Mauvais candidat"
                
                results.append({
                    "id": candidate.get('id'),
                    "Scoreglobal": round(scoreglobal, 2),
                    "binary_classification": binary,
                    "multi_class_classification": multi_class,
                    "mode": "REAL" if models_loaded else "DEMO"
                })
            except Exception as e:
                logger.error(f"Error processing candidate {candidate.get('id')}: {str(e)}")
                results.append({
                    "id": candidate.get('id'),
                    "error": str(e)
                })
        
        return jsonify({"results": results}), 200
        
    except Exception as e:
        logger.error(f"Error in batch recommendation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Get configuration from environment
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', 5000))
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    
    app.run(host=host, port=port, debug=debug)
