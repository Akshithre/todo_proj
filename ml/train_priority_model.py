"""
Train a Random Forest classifier to predict task priority level.
Downloads training data from Azure Blob Storage, preprocesses it,
trains the model, and saves the artifact locally.
"""
import os
import io

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

ML_DIR = os.path.dirname(__file__)


# ── Data loading ────────────────────────────────────────────────────

def load_data_from_blob() -> pd.DataFrame:
    """Download tasks_data.csv from Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")
    blob_name = "tasks_data.csv"

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    stream = blob_client.download_blob().readall()
    return pd.read_csv(io.BytesIO(stream))


def load_data_local() -> pd.DataFrame:
    """Fall back to local CSV if Azure is unavailable."""
    local_path = os.path.join(ML_DIR, "tasks_data.csv")
    if os.path.exists(local_path):
        return pd.read_csv(local_path)
    raise FileNotFoundError(
        "No local tasks_data.csv found. Run generate_sample_data.py first."
    )


# ── Preprocessing ───────────────────────────────────────────────────

def preprocess(df: pd.DataFrame):
    """Encode features and return X, y, and the fitted encoder."""
    df = df.dropna(subset=["deadline_gap", "estimated_time", "category",
                           "completion_rate", "priority"]).copy()

    category_encoder = LabelEncoder()
    df["category_encoded"] = category_encoder.fit_transform(df["category"])

    features = ["deadline_gap", "estimated_time",
                "category_encoded", "completion_rate"]
    X = df[features]
    y = df["priority"]

    return X, y, category_encoder


# ── Training ────────────────────────────────────────────────────────

def train():
    # Load data
    try:
        df = load_data_from_blob()
        print("Loaded data from Azure Blob Storage")
    except Exception as e:
        print(f"Azure Blob not available ({e}) — using local CSV")
        df = load_data_local()

    print(f"Dataset size: {len(df)} rows")

    # Preprocess
    X, y, category_encoder = preprocess(df)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}  |  Test: {len(X_test)}")

    # Train
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\n--- Evaluation ---")
    print(f"Accuracy: {acc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, preds))

    # Save model
    model_path = os.path.join(ML_DIR, "priority_model.pkl")
    joblib.dump(model, model_path)
    print(f"Saved: {model_path}")


if __name__ == "__main__":
    train()
