"""
Script to export trained models from your notebook to joblib format
Run this in your Jupyter notebook AFTER training all models

Usage:
1. Run all cells in matchykhedma.ipynb until the model training is complete
2. Run this script in a new cell
3. Models will be saved to saved_model/ directory
"""

import os
import joblib
import numpy as np
from pathlib import Path

def export_models(output_dir='./saved_model'):
    """Export all trained models to joblib format"""
    
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    print(f"Exporting models to {output_dir}/...")
    
    try:
        # Export Gradient Boosting Regressor (for Scoreglobal prediction)
        if 'gbr' in globals():
            joblib.dump(gbr, os.path.join(output_dir, 'gbr_model.joblib'))
            print(f"✓ Exported: gbr_model.joblib")
        else:
            print("✗ gbr model not found in notebook. Make sure you trained it.")
            return False
        
        # Export Random Forest Classifier for multi-class (for recommendation levels)
        if 'rf_classifier_multi' in globals():
            joblib.dump(rf_classifier_multi, os.path.join(output_dir, 'rf_classifier_multi.joblib'))
            print(f"✓ Exported: rf_classifier_multi.joblib")
        else:
            print("✗ rf_classifier_multi model not found in notebook. Make sure you trained it.")
            return False
        
        # Export Scaler (IMPORTANT - for normalizing input scores)
        if 'scaler' in globals():
            joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
            print(f"✓ Exported: scaler.joblib")
        else:
            print("✗ scaler not found in notebook. Make sure you fitted MinMaxScaler.")
            return False
        
        # Optional: Export Random Forest Classifier for binary classification
        if 'rf_classifier' in globals():
            joblib.dump(rf_classifier, os.path.join(output_dir, 'rf_classifier_binary.joblib'))
            print(f"✓ Exported: rf_classifier_binary.joblib")
        
        print("\n✓ All models exported successfully!")
        print(f"\nModel directory: {os.path.abspath(output_dir)}")
        print("Files created:")
        for file in os.listdir(output_dir):
            file_path = os.path.join(output_dir, file)
            size_mb = os.path.getsize(file_path) / (1024 * 1024)
            print(f"  - {file} ({size_mb:.2f} MB)")
        
        return True
        
    except Exception as e:
        print(f"✗ Error exporting models: {e}")
        return False


# Run the export
if __name__ == "__main__":
    success = export_models()
    if not success:
        print("\n⚠️  Please ensure you have trained all models in your notebook first.")
