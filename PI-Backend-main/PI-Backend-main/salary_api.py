from __future__ import annotations

import hashlib
import logging
import os
import random
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
from flask import Flask, jsonify, request

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("salary_api")


MODEL_DIR = os.getenv("MODEL_DIR", "./saved_model")
SALARY_MODEL_PATH = os.path.join(MODEL_DIR, "salary_model.joblib")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "jobmatch_db")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


FEATURE_COLUMNS = ["titre", "description", "entreprise", "location", "typeContrat", "competences"]

# Hashing vectorizer dimension (keep moderate for memory on Windows)
HASH_DIM = int(os.getenv("SALARY_HASH_DIM", "4096"))
RIDGE_L2 = float(os.getenv("SALARY_RIDGE_L2", "50.0"))


@dataclass(frozen=True)
class PredictPayload:
    titre: str
    description: str
    entreprise: str
    location: str
    typeContrat: str
    competences: str


def _coerce_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _competences_to_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join([_coerce_str(v) for v in value if _coerce_str(v)])
    return _coerce_str(value)


def _parse_salary_to_number(s: Any) -> Optional[float]:
    """
    Convert salary strings like:
      - "2500-3000 TND" -> 2750
      - "3000" -> 3000
      - "3k" / "3 K" -> 3000
    Returns None if can't parse.
    """
    if s is None:
        return None
    if isinstance(s, (int, float)) and not (isinstance(s, float) and np.isnan(s)):
        val = float(s)
        return val if val > 0 else None

    raw = _coerce_str(s).lower()
    if not raw:
        return None

    # normalize thousands suffix
    raw = raw.replace("dt", " ").replace("tnd", " ")
    raw = re.sub(r"\s+", " ", raw).strip()

    # Handle '3k' style
    m_k = re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*k\s*$", raw)
    if m_k:
        num = float(m_k.group(1).replace(",", "."))
        return max(0.0, num * 1000.0) or None

    # Extract numbers (allow separators)
    nums = re.findall(r"\d+(?:[.,]\d+)?", raw)
    if not nums:
        return None

    values = [float(n.replace(",", ".")) for n in nums]
    values = [v for v in values if v > 0]
    if not values:
        return None

    # If range, take mean of first two values
    if len(values) >= 2 and ("-" in raw or "to" in raw or "à" in raw):
        return float(np.mean(values[:2]))
    return float(values[0])


def _format_salary_tnd(pred: float) -> str:
    # round to a nice number (nearest 50)
    if pred <= 0 or np.isnan(pred):
        return "0"
    rounded = int(round(pred / 50.0) * 50)
    return str(max(rounded, 0))


def _stable_hash(token: str) -> int:
    # stable across processes (unlike Python's built-in hash)
    h = hashlib.blake2b(token.encode("utf-8", errors="ignore"), digest_size=8).digest()
    return int.from_bytes(h, "little", signed=False)


def _tokenize(text: str) -> list[str]:
    text = _coerce_str(text).lower()
    if not text:
        return []
    # keep letters/numbers, split on others
    return [t for t in re.split(r"[^a-z0-9à-ÿ]+", text) if len(t) >= 2]


def _vectorize_record(rec: Dict[str, Any]) -> np.ndarray:
    """
    Feature hashing over:
      - tokens from titre/description/entreprise/competences
      - categorical location/typeContrat
    """
    x = np.zeros((HASH_DIM,), dtype=np.float32)

    text = " ".join(
        [
            _coerce_str(rec.get("titre")),
            _coerce_str(rec.get("description")),
            _coerce_str(rec.get("entreprise")),
            _competences_to_string(rec.get("competences")),
        ]
    )
    for tok in _tokenize(text):
        idx = _stable_hash("t:" + tok) % HASH_DIM
        x[idx] += 1.0

    loc = _coerce_str(rec.get("location")).lower()
    if loc:
        idx = _stable_hash("loc:" + loc) % HASH_DIM
        x[idx] += 1.0

    tc = _coerce_str(rec.get("typeContrat")).upper()
    if tc:
        idx = _stable_hash("tc:" + tc) % HASH_DIM
        x[idx] += 1.0

    # log(1+tf)
    x = np.log1p(x)
    return x


def _load_training_rows_from_mysql() -> list[Dict[str, Any]]:
    import mysql.connector  # type: ignore

    conn = mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
    )
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT
              o.id,
              o.titre,
              o.description,
              o.entreprise,
              o.location,
              o.type_contrat AS typeContrat,
              o.salary
            FROM offres_emploi o
            """
        )
        offres = cur.fetchall()
        if not offres:
            return []

        # Try to fetch competences from common table names
        skills_map: Dict[int, list[str]] = {}
        skill_tables = ["offre_competences", "offre_competences_requises", "offre_competencesrequises"]
        for table in skill_tables:
            try:
                cur.execute(f"SELECT offre_id AS id, competence FROM {table}")
                rows = cur.fetchall()
                for r in rows:
                    oid = r.get("id")
                    comp = _coerce_str(r.get("competence"))
                    if oid is None or not comp:
                        continue
                    skills_map.setdefault(int(oid), []).append(comp)
                if skills_map:
                    break
            except Exception:
                continue

        for o in offres:
            oid = o.get("id")
            if oid is not None and int(oid) in skills_map:
                o["competences"] = skills_map[int(oid)]
            else:
                o["competences"] = ""
        return offres
    finally:
        conn.close()


def _train_ridge_closed_form(X: np.ndarray, y: np.ndarray, l2: float) -> Tuple[np.ndarray, float]:
    # add bias term as last column
    Xb = np.hstack([X, np.ones((X.shape[0], 1), dtype=X.dtype)])
    d = Xb.shape[1]
    A = Xb.T @ Xb
    A.flat[:: d + 1] += l2  # add l2 to diagonal
    b = Xb.T @ y
    w_full = np.linalg.solve(A, b)
    w, bias = w_full[:-1], float(w_full[-1])
    return w.astype(np.float32), bias


def _train_and_save_model() -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    try:
        rows = _load_training_rows_from_mysql()
        if len(rows) < 30:
            return None, {
                "trained": False,
                "reason": f"Not enough rows in DB to train (need >= 30, got {len(rows)})",
            }

        labeled: list[Tuple[np.ndarray, float]] = []
        for r in rows:
            sal = _parse_salary_to_number(r.get("salary"))
            if sal is None or sal <= 0:
                continue
            vec = _vectorize_record(r)
            labeled.append((vec, float(sal)))

        if len(labeled) < 30:
            return None, {
                "trained": False,
                "reason": f"Not enough labeled offers with parsable salary (need >= 30, got {len(labeled)})",
            }

        X_all = np.vstack([v for v, _ in labeled])
        y_all = np.array([t for _, t in labeled], dtype=np.float32)
        y_min = float(np.min(y_all))
        y_max = float(np.max(y_all))

        # Train on log(salary) to stabilize and reduce extreme errors on small datasets
        y_all_log = np.log(np.clip(y_all, 1.0, None)).astype(np.float32)

        # Shuffle + split
        rng = random.Random(42)
        idx = list(range(len(y_all)))
        rng.shuffle(idx)
        split = int(len(idx) * 0.8)
        train_idx, test_idx = idx[:split], idx[split:]
        X_train, y_train = X_all[train_idx], y_all_log[train_idx]
        X_test, y_test = X_all[test_idx], y_all[test_idx]

        w, bias = _train_ridge_closed_form(X_train, y_train, RIDGE_L2)
        preds_log = X_test @ w + bias
        preds = np.exp(preds_log)
        preds = np.clip(preds, y_min, y_max)
        mae = float(np.mean(np.abs(preds - y_test)))
        rmse = float(np.sqrt(np.mean((preds - y_test) ** 2)))

        model_obj = {
            "dim": HASH_DIM,
            "l2": RIDGE_L2,
            "w": w,
            "bias": bias,
            "trained_rows": int(len(labeled)),
            "y_min": y_min,
            "y_max": y_max,
            "target": "log_salary",
        }

        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(model_obj, SALARY_MODEL_PATH)

        return model_obj, {
            "trained": True,
            "rows": int(len(labeled)),
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "model_path": SALARY_MODEL_PATH,
        }
    except Exception as e:
        logger.exception("Training failed")
        return None, {"trained": False, "reason": str(e)}


def _load_or_train_model() -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    try:
        if os.path.exists(SALARY_MODEL_PATH):
            pipeline = joblib.load(SALARY_MODEL_PATH)
            logger.info("✓ Salary model loaded: %s", SALARY_MODEL_PATH)
            return pipeline, {"loaded": True, "model_path": SALARY_MODEL_PATH}
    except Exception as e:
        logger.warning("Could not load salary model: %s", e)

    pipeline, meta = _train_and_save_model()
    if pipeline is not None:
        logger.info("✓ Salary model trained (%s)", meta)
    else:
        logger.warning("⚠ Salary model not available (%s)", meta)
    return pipeline, meta


salary_model, salary_model_meta = _load_or_train_model()


def _validate_payload(data: Dict[str, Any]) -> Tuple[Optional[PredictPayload], Optional[str]]:
    missing = [k for k in ["titre", "description", "entreprise", "location", "typeContrat", "competences"] if k not in data]
    if missing:
        return None, "Missing required fields: " + ", ".join(missing)

    payload = PredictPayload(
        titre=_coerce_str(data.get("titre")),
        description=_coerce_str(data.get("description")),
        entreprise=_coerce_str(data.get("entreprise")),
        location=_coerce_str(data.get("location")),
        typeContrat=_coerce_str(data.get("typeContrat")),
        competences=_competences_to_string(data.get("competences")),
    )
    if not payload.titre or not payload.description or not payload.location or not payload.typeContrat:
        return None, "Invalid payload: titre/description/location/typeContrat must be non-empty"
    return payload, None


def _predict_salary(payload: PredictPayload) -> Tuple[str, str]:
    """
    Returns (predicted_salary_string, mode)
    """
    if salary_model is None:
        # fallback heuristic when no model available
        base = 2000.0
        title = payload.titre.lower()
        skills = payload.competences.lower()
        contract = payload.typeContrat.upper()
        loc = payload.location.lower()

        if "senior" in title or "lead" in title:
            base += 800
        if "data" in title or "ml" in title or "ai" in title:
            base += 600
        if "devops" in title or "cloud" in skills:
            base += 500
        if contract == "FREELANCE":
            base += 400
        if loc in {"tunis", "ariana", "ben arous"}:
            base += 200

        return _format_salary_tnd(base), "HEURISTIC"

    vec = _vectorize_record(
        {
            "titre": payload.titre,
            "description": payload.description,
            "entreprise": payload.entreprise,
            "location": payload.location,
            "typeContrat": payload.typeContrat,
            "competences": payload.competences,
        }
    )
    w = salary_model.get("w")
    bias = float(salary_model.get("bias", 0.0))
    pred_log = float(vec @ w + bias)
    pred = float(np.exp(pred_log))
    y_min = float(salary_model.get("y_min", 0.0))
    y_max = float(salary_model.get("y_max", 0.0))
    if y_min > 0 and y_max > 0 and y_max >= y_min:
        pred = float(np.clip(pred, y_min, y_max))
    return _format_salary_tnd(pred), "ML"


def _predict_salary_route():
    try:
        data = request.get_json(silent=True) or {}
        payload, err = _validate_payload(data)
        if err:
            return jsonify({"error": err}), 400

        predicted_salary, mode = _predict_salary(payload)
        return jsonify(
            {
                "predicted_salary": predicted_salary,
                "currency": "TND",
                "mode": mode,
            }
        ), 200
    except Exception as e:
        logger.exception("Unexpected error")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# Angular proxy currently calls /api/predict-salary (via /api -> Flask)
@app.route("/api/predict-salary", methods=["POST"])
def predict_salary_api():
    return _predict_salary_route()


# Spring service calls flaskUrl + "/predict-salary"
@app.route("/predict-salary", methods=["POST"])
def predict_salary_root():
    return _predict_salary_route()


@app.route("/api/train-salary-model", methods=["POST"])
def train_salary_model():
    global salary_model, salary_model_meta
    salary_model, salary_model_meta = _train_and_save_model()
    if salary_model is None:
        return jsonify({"trained": False, **salary_model_meta}), 500
    return jsonify({"trained": True, **salary_model_meta}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "salary_model": "LOADED" if salary_model is not None else "NOT_AVAILABLE",
            "meta": salary_model_meta,
        }
    ), 200


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    port = int(os.getenv("FLASK_PORT", "5000"))
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    app.run(debug=debug, host=host, port=port)
