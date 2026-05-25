import os
import pickle
import threading
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from features import get_features, get_last_credit_amount, count_scoring_records, load_state, save_state
from model import train_model

app = FastAPI()

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo.pkl")

_model_data = None
_model_lock = threading.Lock()


def _load_model():
    global _model_data
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model_data = pickle.load(f)
    else:
        _model_data = None


_load_model()


def _get_model():
    global _model_data
    if _model_data is None:
        _load_model()
    return _model_data


class PredictRequest(BaseModel):
    id_cliente: int


class RetrainRequest(BaseModel):
    evento: str = "manual"


@app.post("/predict")
def predict(req: PredictRequest):
    model_data = _get_model()
    if model_data is None:
        return {"error": "Modelo no entrenado. Ejecuta model.py primero."}

    features = get_features(req.id_cliente)
    if features is None:
        return {"error": "No se encontraron datos de scoring para este cliente"}

    X = np.array([features])
    pred = model_data["model"].predict(X)[0]
    proba = model_data["model"].predict_proba(X)[0]
    confidence = float(np.max(proba))

    nivel_riesgo = model_data["label_encoder"].inverse_transform([pred])[0]

    base_scores = {"bajo": 85, "medio": 55, "alto": 25}
    puntaje_rf = int(base_scores.get(nivel_riesgo, 50) * confidence)
    puntaje_rf = max(0, min(100, puntaje_rf))

    monto_ultimo = get_last_credit_amount(req.id_cliente)
    if nivel_riesgo == "bajo":
        limite = max(monto_ultimo * 2.0, 50000)
    elif nivel_riesgo == "medio":
        limite = max(monto_ultimo * 1.5, 30000)
    else:
        limite = max(monto_ultimo * 0.8, 10000)

    return {
        "nivel_riesgo": nivel_riesgo,
        "puntaje_rf": puntaje_rf,
        "limite_sugerido": float(limite),
        "confianza": round(confidence, 4),
    }


def _should_retrain() -> bool:
    current_count = count_scoring_records()
    state = load_state()
    last_count = state.get("last_train_count", 0)

    if last_count == 0:
        return current_count >= 5

    growth = (current_count - last_count) / last_count
    return growth >= 0.20


def _retrain_in_background():
    try:
        new_path = train_model()
        if new_path:
            with _model_lock:
                global _model_data
                with open(MODEL_PATH, "rb") as f:
                    _model_data = pickle.load(f)
            print("[ML] Modelo reentrenado y swapped correctamente.")
    except Exception as e:
        print(f"[ML] Error durante reentrenamiento: {e}")


@app.post("/ml/retrain")
def retrain(req: RetrainRequest):
    if not _should_retrain():
        return {
            "status": "skipped",
            "message": "No se alcanzó el umbral del 20% de registros nuevos.",
            "current_count": count_scoring_records(),
            "last_train_count": load_state().get("last_train_count", 0),
        }

    threading.Thread(target=_retrain_in_background, daemon=True).start()
    return {
        "status": "training",
        "message": "Reentrenamiento iniciado en background. El modelo actual sigue activo.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
