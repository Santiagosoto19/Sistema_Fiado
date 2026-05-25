import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from features import fetch_all_scoring, count_scoring_records, save_state


def train_model(output_path="modelo.pkl"):
    rows = fetch_all_scoring()

    if len(rows) < 5:
        print("No hay suficientes datos para entrenar el modelo.")
        return None

    X = np.array([[r[0], r[1], r[2], r[3], r[4]] for r in rows])
    y_raw = [r[5] for r in rows]

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    with open(output_path, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    current_count = count_scoring_records()
    save_state({"last_train_count": current_count})
    print(f"Modelo entrenado y guardado en {output_path}. Registros usados: {current_count}")
    return output_path


if __name__ == "__main__":
    train_model()
