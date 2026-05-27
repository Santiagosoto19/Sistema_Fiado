import os
import json
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

# Cargar .env del directorio padre (backend/.env)
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)


STATE_FILE = os.path.join(os.path.dirname(__file__), 'ml_state.json')


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def get_features(id_cliente: int):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    # Nota: pts_frecuencia almacena pts_cumplimiento (días promedio de atraso en créditos pagados)
    cur.execute(
        """
        SELECT pts_puntualidad, pts_historial, pts_frecuencia, pts_antiguedad, puntaje
        FROM scoring
        WHERE id_cliente = %s
        ORDER BY fecha_calculo DESC
        LIMIT 1
        """,
        (str(id_cliente),),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    return [
        row["pts_puntualidad"],
        row["pts_historial"],
        row["pts_frecuencia"],
        row["pts_antiguedad"],
        row["puntaje"],
    ]


def get_last_credit_amount(id_cliente: int) -> float:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT monto_total
        FROM creditos
        WHERE id_cliente = %s
        ORDER BY fecha_credito DESC
        LIMIT 1
        """,
        (str(id_cliente),),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return 0.0

    return float(row[0])


def fetch_all_scoring():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT pts_puntualidad, pts_historial, pts_frecuencia, pts_antiguedad, puntaje, nivel_riesgo
        FROM scoring
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def count_scoring_records() -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM scoring")
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0]


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"last_train_count": 0}


def save_state(state: dict):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)
