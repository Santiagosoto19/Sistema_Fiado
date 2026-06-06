"""
Backfill: poblar nivel_riesgo (ML) y confianza para todos los scoring existentes.
Ejecutar después de reentrenar el modelo y aplicar la migración de BD.

Uso:
    cd backend/ml_service
    venv\Scripts\python ..\scripts\backfill_ml_predictions.py    # Windows
    python ../scripts/backfill_ml_predictions.py                  # macOS/Linux
"""

import os
import sys
import pickle
import numpy as np
import psycopg2
from dotenv import load_dotenv

# Asegurar que podemos importar features.py del microservicio
ML_SERVICE_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_service")
sys.path.insert(0, ML_SERVICE_DIR)

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

MODEL_PATH = os.path.join(ML_SERVICE_DIR, "modelo.pkl")


def main():
    if not os.path.exists(MODEL_PATH):
        print(f"Modelo no encontrado en {MODEL_PATH}. Ejecuta model.py primero.")
        sys.exit(1)

    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)

    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    # Obtener todos los scoring con sus 4 variables
    cur.execute("""
        SELECT id_scoring, id_cliente, pts_puntualidad, pts_historial,
               pts_cumplimiento, pts_antiguedad
        FROM scoring
        ORDER BY id_scoring
    """)
    rows = cur.fetchall()

    updated = 0

    for row in rows:
        id_scoring, id_cliente, p1, p2, p3, p4 = row
        puntaje = p1 + p2 + p3 + p4

        X = np.array([[p1, p2, p3, p4, puntaje]])
        pred = model_data["model"].predict(X)[0]
        proba = model_data["model"].predict_proba(X)[0]
        confidence = float(np.max(proba))
        nivel_riesgo = model_data["label_encoder"].inverse_transform([pred])[0]

        cur.execute("""
            UPDATE scoring
            SET nivel_riesgo = %s, confianza = %s
            WHERE id_scoring = %s
        """, (nivel_riesgo, round(confidence, 4), id_scoring))
        updated += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Backfill completado: {updated} registros actualizados.")


if __name__ == "__main__":
    main()
