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
    """Devuelve [pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad, puntaje_calc].
    El puntaje se calcula como suma de las 4 variables (ya no se almacena en BD)."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        SELECT pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad
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

    puntaje = row["pts_puntualidad"] + row["pts_historial"] + row["pts_cumplimiento"] + row["pts_antiguedad"]
    return [
        row["pts_puntualidad"],
        row["pts_historial"],
        row["pts_cumplimiento"],
        row["pts_antiguedad"],
        puntaje,
    ]


def get_limit_data(id_cliente: int):
    """
    Retorna (base, saldo_pendiente) para calcular el límite sugerido.
    - base = promedio de los últimos 3 créditos cerrados (pagado + vencido)
    - saldo_pendiente = suma de saldo_pendiente de créditos no pagados (vigentes + vencidos)
    """
    conn = get_connection()
    cur = conn.cursor()

    # Promedio de los últimos 3 créditos cerrados
    cur.execute(
        """
        SELECT COALESCE(AVG(monto_total), 0)
        FROM (
            SELECT monto_total
            FROM creditos
            WHERE id_cliente = %s AND estado IN ('pagado', 'vencido')
            ORDER BY fecha_credito DESC
            LIMIT 3
        ) sub
        """,
        (str(id_cliente),),
    )
    base = float(cur.fetchone()[0])

    # Saldo pendiente actual (créditos que no están pagados)
    cur.execute(
        """
        SELECT COALESCE(SUM(saldo_pendiente), 0)
        FROM creditos
        WHERE id_cliente = %s AND estado != 'pagado'
        """,
        (str(id_cliente),),
    )
    saldo_pendiente = float(cur.fetchone()[0])

    cur.close()
    conn.close()

    return base, saldo_pendiente


def fetch_all_scoring():
    """Devuelve filas con las 4 variables + nivel_riesgo. El puntaje se recalcula en model.py."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad, nivel_riesgo
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
