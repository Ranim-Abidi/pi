import os
import pickle

import pandas as pd
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor


BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
CSV_PATH = os.path.join(DATA_DIR, "rates.csv")
MODEL_PATH = os.path.join(DATA_DIR, "price_model.pkl")
ENCODERS_PATH = os.path.join(DATA_DIR, "encoders.pkl")


model = None
encoders = {}


def _encode_or_fallback(encoder: LabelEncoder, value: str) -> int:
    if value in encoder.classes_:
        return int(encoder.transform([value])[0])
    # Fallback to index 0 for unseen categories.
    return 0


def train():
    global model, encoders

    df = pd.read_csv(CSV_PATH)

    skill_encoder = LabelEncoder()
    location_encoder = LabelEncoder()

    df["skill_enc"] = skill_encoder.fit_transform(df["skill"].astype(str))
    df["location_enc"] = location_encoder.fit_transform(df["location"].astype(str))

    X = df[["skill_enc", "experience_years", "rating", "location_enc"]]
    y = df["hourly_rate"]

    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(X, y)

    encoders = {
        "skill": skill_encoder,
        "location": location_encoder,
    }

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(ENCODERS_PATH, "wb") as f:
        pickle.dump(encoders, f)

    return model, encoders


def _load_or_train():
    global model, encoders
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODERS_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(ENCODERS_PATH, "rb") as f:
            encoders = pickle.load(f)
    else:
        train()


def predict_rate(skill, experience_years, rating, location) -> dict:
    if model is None or not encoders:
        _load_or_train()

    skill_idx = _encode_or_fallback(encoders["skill"], str(skill))
    location_idx = _encode_or_fallback(encoders["location"], str(location))

    X_input = pd.DataFrame(
        [
            {
                "skill_enc": skill_idx,
                "experience_years": float(experience_years),
                "rating": float(rating),
                "location_enc": location_idx,
            }
        ]
    )

    mid = float(model.predict(X_input)[0])
    low = float(mid * 0.85)
    high = float(mid * 1.15)

    return {
        "min": round(low, 2),
        "mid": round(mid, 2),
        "max": round(high, 2),
    }


_load_or_train()
