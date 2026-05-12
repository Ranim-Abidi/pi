# Model Export Setup Instructions

## Problem
The Flask API cannot find the trained ML models. They need to be exported from your Jupyter notebook and saved in the correct location.

## Solution

### Step 1: Export Models from Your Notebook

In your `matchykhedma.ipynb` notebook, add a new cell at the end with this code:

```python
import joblib
import os
from pathlib import Path

# Create output directory
output_dir = './saved_model'
Path(output_dir).mkdir(parents=True, exist_ok=True)

# Export all trained models
print("Exporting models...")

try:
    # 1. Gradient Boosting Regressor (for Scoreglobal)
    joblib.dump(gbr, os.path.join(output_dir, 'gbr_model.joblib'))
    print("✓ gbr_model.joblib exported")
    
    # 2. Random Forest Classifier Multi-class (for recommendation levels)
    joblib.dump(rf_classifier_multi, os.path.join(output_dir, 'rf_classifier_multi.joblib'))
    print("✓ rf_classifier_multi.joblib exported")
    
    # 3. MinMaxScaler (IMPORTANT!)
    joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
    print("✓ scaler.joblib exported")
    
    print("\n✓ All models exported successfully!")
    print(f"Location: {os.path.abspath(output_dir)}")
    
    # List files
    print("\nFiles created:")
    for file in os.listdir(output_dir):
        file_path = os.path.join(output_dir, file)
        size = os.path.getsize(file_path) / 1024 / 1024
        print(f"  - {file} ({size:.2f} MB)")
        
except Exception as e:
    print(f"✗ Error: {e}")
    print("Make sure you have trained all models (gbr, rf_classifier_multi, scaler)")
```

### Step 2: Run the Export

1. Open your Jupyter notebook: `matchykhedma.ipynb`
2. Make sure you've run all training cells
3. Add the code above to a new cell
4. Run the cell
5. You should see output like:
   ```
   ✓ gbr_model.joblib exported
   ✓ rf_classifier_multi.joblib exported
   ✓ scaler.joblib exported
   
   ✓ All models exported successfully!
   Location: /path/to/matchykhedma/saved_model
   ```

### Step 3: Copy Models to Backend

Copy the `saved_model/` directory to the backend:

**Option A: Manual Copy**
```bash
# From notebook directory to backend
cp -r saved_model/ PI-Backend/saved_model/
```

**Option B: Using Python**
```python
import shutil
shutil.copytree('./saved_model', '../PI-Backend/saved_model', dirs_exist_ok=True)
```

### Step 4: Verify Models

Check that files exist:

```bash
cd PI-Backend
ls -lah saved_model/

# You should see:
# -rw-r--r--  gbr_model.joblib (large file ~50MB+)
# -rw-r--r--  rf_classifier_multi.joblib (large file ~20MB+)
# -rw-r--r--  scaler.joblib (small file ~few KB)
```

### Step 5: Start Flask API

```bash
# Install dependencies if not done
pip install -r flask_requirements.txt

# Run Flask API
python flask_recommendation_api.py

# You should see:
# ✓ All models loaded successfully
# INFO:werkzeug: * Running on http://0.0.0.0:5000
```

### Step 6: Test the API

```bash
# In another terminal
curl -X GET http://localhost:5000/health

# Response:
# {"status": "ok", "message": "Recommendation service is running", "models": "LOADED"}
```

## Demo Mode

If models are not available, the Flask API will run in **DEMO mode**:

- ✓ API still works
- ✓ Returns reasonable scoring (average of input scores)
- ⚠️ Not using trained ML models
- ✓ Great for testing the full pipeline

Response example:
```json
{
  "Scoreglobal": 75.0,
  "binary_classification": "Bon candidat",
  "multi_class_classification": "Recommandé",
  "mode": "DEMO"
}
```

## Troubleshooting

### Models not found error

**Problem**: Flask starts but says models not loaded

**Solution**:
1. Check `saved_model/` directory exists
2. List files: `ls -la saved_model/`
3. Ensure all 3 files are present:
   - `gbr_model.joblib`
   - `rf_classifier_multi.joblib`
   - `scaler.joblib`

### Cannot find notebook variables (gbr, rf_classifier_multi, scaler)

**Problem**: NameError when exporting

**Solution**:
1. Make sure you've run all training cells in the notebook
2. Check variable names match exactly:
   - `gbr` (not `rf_regressor` or other names)
   - `rf_classifier_multi` (not `rf_classifier`)
   - `scaler` (MinMaxScaler instance)
3. Add this to verify:
   ```python
   print(gbr)
   print(rf_classifier_multi)
   print(scaler)
   ```

### File size too large (can't transfer)

**Problem**: Models are very large files

**Solution**:
- Normal! Trained models with scikit-learn are often 50-200 MB
- Models are compressed but still large
- Ensure you have enough disk space

### Jupyter kernel crash when exporting

**Problem**: Kernel dies during export

**Solution**:
1. Restart kernel
2. Re-run all training cells
3. Export again in fresh session

## Alternative: Use Pre-trained Models

If you want to use pre-trained models, see [RECOMMENDATION_SYSTEM.md](./RECOMMENDATION_SYSTEM.md) for options.

## Testing

After export and Flask startup:

```bash
# Test single recommendation
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "s_skills": 0.85,
    "s_experience": 0.90,
    "s_location": 0.70,
    "s_domain": 0.80
  }'

# Expected response:
# {
#   "Scoreglobal": 81.25,
#   "binary_classification": "Bon candidat",
#   "multi_class_classification": "Très recommandé",
#   "mode": "REAL"
# }
```

## Next Steps

1. ✅ Export models from notebook
2. ✅ Copy to `PI-Backend/saved_model/`
3. ✅ Start Flask API
4. ✅ Verify models loaded (check health endpoint)
5. ✅ Test with sample data
6. ✅ Enable in Spring Boot: `flask.recommendation.enabled=true`
7. ✅ Test full pipeline end-to-end

---

**Need help?** Check the logs:
```bash
# Flask logs will show:
# "✓ All models loaded successfully" - Models found and working
# "⚠️ Model files not found" - Running in demo mode
# "FileNotFoundError: ..." - Models missing, see troubleshooting
```
