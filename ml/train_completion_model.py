"""
Train a Random Forest model to predict task completion time.
Reads training data from Azure Blob Storage (CSV) or a local fallback.
"""
import os
import io
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

PRIORITY_MAP = {"High": 3, "Medium": 2, "Low": 1}
MODEL_PATH = os.path.join(os.path.dirname(__file__), "completion_model.pkl")


def load_data_from_blob() -> pd.DataFrame:
    """Try to load CSV from Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")
    blob_name = "tasks_processed.csv"

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    stream = blob_client.download_blob().readall()
    return pd.read_csv(io.BytesIO(stream))


def load_data_local() -> pd.DataFrame:
    """Generate synthetic training data for local development."""
    import numpy as np

    np.random.seed(42)
    n = 500
    priorities = np.random.choice([1, 2, 3], size=n)
    estimated = np.random.uniform(0.5, 10, size=n)
    deadline_gap = np.random.uniform(1, 200, size=n)
    actual = (
        estimated * 0.8
        + priorities * 0.5
        - deadline_gap * 0.005
        + np.random.normal(0, 0.5, size=n)
    ).clip(0.1)

    return pd.DataFrame({
        "priority_score": priorities,
        "estimated_time": estimated,
        "deadline_gap_hours": deadline_gap,
        "actual_time": actual,
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

    features = ["priority_score", "estimated_time", "deadline_gap_hours"]
    target = "actual_time"

    df = df.dropna(subset=features + [target])
    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print(f"MAE:  {mean_absolute_error(y_test, preds):.3f}")
    print(f"R²:   {r2_score(y_test, preds):.3f}")

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
