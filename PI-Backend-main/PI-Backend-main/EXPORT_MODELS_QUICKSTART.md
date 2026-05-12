# Quick Start: Export Models Checklist

## ✅ Pre-Export Checklist

Before exporting, verify you have these trained models in your notebook:

- [ ] `gbr` - Gradient Boosting Regressor (trained in notebook)
- [ ] `rf_classifier_multi` - Random Forest Classifier multi-class (trained in notebook)
- [ ] `scaler` - MinMaxScaler (fitted on training data in notebook)

**How to check:**
```python
# Add this cell to your notebook to verify
print("Checking variables...")
print(f"gbr: {type(gbr)}")
print(f"rf_classifier_multi: {type(rf_classifier_multi)}")
print(f"scaler: {type(scaler)}")
```

---

## 🚀 Step-by-Step Export

### Step 1: Copy this code to a new Jupyter cell

```python
# =============================================================================
# MODEL EXPORT - Run this cell to export your trained models
# =============================================================================

import os
import joblib
from pathlib import Path

# Create output directory
output_dir = './saved_model'
Path(output_dir).mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("EXPORTING TRAINED MODELS")
print("=" * 70)

success_count = 0
error_count = 0

# Export Gradient Boosting Regressor
try:
    joblib.dump(gbr, os.path.join(output_dir, 'gbr_model.joblib'))
    print("✓ gbr_model.joblib")
    success_count += 1
except NameError:
    print("✗ gbr - Not found! Check variable name in notebook")
    error_count += 1
except Exception as e:
    print(f"✗ gbr - Error: {e}")
    error_count += 1

# Export Random Forest Classifier (multi-class)
try:
    joblib.dump(rf_classifier_multi, os.path.join(output_dir, 'rf_classifier_multi.joblib'))
    print("✓ rf_classifier_multi.joblib")
    success_count += 1
except NameError:
    print("✗ rf_classifier_multi - Not found! Check variable name in notebook")
    error_count += 1
except Exception as e:
    print(f"✗ rf_classifier_multi - Error: {e}")
    error_count += 1

# Export MinMaxScaler
try:
    joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
    print("✓ scaler.joblib")
    success_count += 1
except NameError:
    print("✗ scaler - Not found! Check variable name in notebook")
    error_count += 1
except Exception as e:
    print(f"✗ scaler - Error: {e}")
    error_count += 1

# Export Random Forest Classifier (binary) if available
try:
    joblib.dump(rf_classifier, os.path.join(output_dir, 'rf_classifier_binary.joblib'))
    print("✓ rf_classifier_binary.joblib (optional)")
    success_count += 1
except NameError:
    print("• rf_classifier_binary.joblib (optional - not found)")
except Exception as e:
    print(f"• rf_classifier_binary.joblib - Error: {e}")

print("\n" + "=" * 70)
print(f"EXPORT SUMMARY: {success_count} succeeded, {error_count} failed")
print("=" * 70)

if error_count == 0 and success_count >= 3:
    print("\n✅ SUCCESS! All models exported.")
    print(f"\nModels saved to: {os.path.abspath(output_dir)}\n")
    
    # Show file details
    print("Files created:")
    for file in sorted(os.listdir(output_dir)):
        file_path = os.path.join(output_dir, file)
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"  • {file:<35} {size_mb:>8.2f} MB")
    
    print("\n📋 Next steps:")
    print("  1. Copy the 'saved_model' folder to: PI-Backend/saved_model/")
    print("  2. Run: pip install -r flask_requirements.txt")
    print("  3. Run: python flask_recommendation_api.py")
    print("  4. Test: curl http://localhost:5000/health")
    
elif error_count > 0:
    print("\n❌ EXPORT FAILED - Check errors above")
    print("\n🔍 Troubleshooting:")
    print("  • Verify you trained all models in your notebook")
    print("  • Check variable names match exactly:")
    print("    - gbr")
    print("    - rf_classifier_multi")
    print("    - scaler")
    print("  • Run training cells again if needed")
    print("  • Check notebook for errors: print(gbr), print(rf_classifier_multi), print(scaler)")
else:
    print("\n⚠️ INCOMPLETE - Need at least 3 models")
```

### Step 2: Run the cell

- Copy the code above
- Paste into a new cell in your Jupyter notebook
- Click "Run Cell"
- Wait for completion

### Step 3: Check the output

You should see something like:
```
======================================================================
EXPORTING TRAINED MODELS
======================================================================
✓ gbr_model.joblib
✓ rf_classifier_multi.joblib
✓ scaler.joblib

======================================================================
EXPORT SUMMARY: 3 succeeded, 0 failed
======================================================================

✅ SUCCESS! All models exported.

Models saved to: /home/user/matchykhedma/saved_model

Files created:
  • gbr_model.joblib                    125.45 MB
  • rf_classifier_multi.joblib           45.30 MB
  • scaler.joblib                         0.02 MB

📋 Next steps:
  1. Copy the 'saved_model' folder to: PI-Backend/saved_model/
  2. Run: pip install -r flask_requirements.txt
  3. Run: python flask_recommendation_api.py
  4. Test: curl http://localhost:5000/health
```

---

## 📁 Copy Models to Backend

### Option A: Command Line

```bash
# From your notebook directory
cp -r saved_model ../PI-Backend/

# Verify
ls -la ../PI-Backend/saved_model/
```

### Option B: Python in Notebook

```python
import shutil

src = './saved_model'
dst = '../PI-Backend/saved_model'

try:
    shutil.copytree(src, dst, dirs_exist_ok=True)
    print(f"✓ Models copied to: {dst}")
except Exception as e:
    print(f"✗ Error copying: {e}")
```

### Option C: Manual

1. Open file explorer
2. Navigate to your notebook's `saved_model/` folder
3. Copy the folder
4. Navigate to `PI-Backend/`
5. Paste the folder

---

## 🔧 Start Flask API

### From terminal

```bash
cd PI-Backend

# Install dependencies (first time only)
pip install -r flask_requirements.txt

# Start Flask server
python flask_recommendation_api.py

# You should see:
# INFO:werkzeug: * Running on http://0.0.0.0:5000
```

### From Python (alternative)

```python
os.system('python flask_recommendation_api.py')
```

---

## ✅ Verify It Works

### Test 1: Health Check

```bash
curl http://localhost:5000/health

# Expected:
# {"status": "ok", "message": "Recommendation service is running", "models": "LOADED"}
```

### Test 2: Sample Prediction

```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "s_skills": 0.85,
    "s_experience": 0.90,
    "s_location": 0.70,
    "s_domain": 0.80
  }'

# Expected:
# {"Scoreglobal": 81.25, "binary_classification": "Bon candidat", "multi_class_classification": "Très recommandé", "mode": "REAL"}
```

### Test 3: Test from Spring Boot

```bash
# With Flask running, in another terminal
curl http://localhost:8080/api/recommendations/health

# Then enable in application.properties:
# flask.recommendation.enabled=true

# Restart Spring Boot and test:
curl http://localhost:8080/api/recommendations/candidate/1/offre/1
```

---

## 🎯 Full Workflow Summary

1. **✅ Train models** in `matchykhedma.ipynb`
2. **✅ Export models** using the cell above
3. **✅ Copy to backend** `PI-Backend/saved_model/`
4. **✅ Install dependencies** `pip install -r flask_requirements.txt`
5. **✅ Start Flask** `python flask_recommendation_api.py`
6. **✅ Verify** `curl http://localhost:5000/health`
7. **✅ Enable in Spring Boot** set `flask.recommendation.enabled=true`
8. **✅ Test end-to-end** use recommendation API endpoints

---

## ❓ FAQ

**Q: Models are very large (100+ MB), is that normal?**
A: Yes! Trained ML models are typically 50-300 MB depending on complexity.

**Q: Can I run without models?**
A: Yes! Flask runs in DEMO mode using simple averaging. Check response for `"mode": "DEMO"`.

**Q: Where exactly should saved_model folder go?**
A: `PI-Backend/saved_model/` - same directory as `flask_recommendation_api.py`

**Q: How do I know if models are loaded?**
A: Check health endpoint for `"models": "LOADED"` or check Flask startup logs.

**Q: What if export fails?**
A: Check you ran all training cells and variables have correct names. See troubleshooting above.

---

## 🆘 Still Having Issues?

Check [MODEL_EXPORT_SETUP.md](./MODEL_EXPORT_SETUP.md) for detailed troubleshooting.
