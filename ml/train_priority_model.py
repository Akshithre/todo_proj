"""
Train a priority suggestion model based on past task patterns.
Predicts what priority level a task should have based on features.
"""
import os
import io
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

PRIORITY_MAP = {"High": 3, "Medium": 2, "Low": 1}
MODEL_PATH = os.path.join(os.path.dirname(__file__), "priority_model.pkl")


def load_data_from_blob() -> pd.DataFrame:
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service.get_blob_client(container=container, blob="tasks_processed.csv")
    stream = blob_client.download_blob().readall()
    return pd.read_csv(io.BytesIO(stream))


def load_data_local() -> pd.DataFrame:
    np.random.seed(42)
    n = 500
    estimated = np.random.uniform(0.5, 10, size=n)
    deadline_gap = np.random.uniform(1, 200, size=n)

    # Heuristic labels: short deadline + long task → high priority
    priority = np.where(
        (deadline_gap < 48) & (estimated > 3), 3,
        np.where(deadline_gap < 96, 2, 1),
    )

    return pd.DataFrame({
        "estimated_time": estimated,
        "deadline_gap_hours": deadline_gap,
        "priority_score": priority,
    })


def train():
    try:
        df = load_data_from_blob()
        print("Loaded data from Azure Blob Storage")
        if "priority" in df.columns:
            df["priority_score"] = df["priority"].map(PRIORITY_MAP).fillna(2)
    except Exception:
        print("Azure Blob not available — using synthetic data")
        df = load_data_local()

    features = ["estimated_time", "deadline_gap_hours"]
    target = "priority_score"

    df = df.dropna(subset=features + [target])
    X = df[features]
    y = df[target].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print(classification_report(y_test, preds))

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
