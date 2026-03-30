"""
Train a Random Forest model to predict task completion time.
Downloads training data from Azure Blob Storage, preprocesses it,
trains the model, and saves all artifacts locally.
"""
import os
import io

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

ML_DIR = os.path.dirname(__file__)
PRIORITY_MAP = {"High": 3, "Medium": 2, "Low": 1}


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
    """Encode features and return X, y, and the fitted encoders."""
    df = df.dropna(subset=["priority", "category", "deadline_gap",
                           "estimated_time", "actual_time"]).copy()

    # Priority encoding
    df["priority_encoded"] = df["priority"].map(PRIORITY_MAP).fillna(2).astype(int)

    # Category encoding
    category_encoder = LabelEncoder()
    df["category_encoded"] = category_encoder.fit_transform(df["category"])

    features = ["priority_encoded", "category_encoded",
                "deadline_gap", "estimated_time"]
    target = "actual_time"

    X = df[features]
    y = df[target]

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
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print(f"\n--- Evaluation ---")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R2:   {r2:.4f}")

    # Sample predictions
    print(f"\n--- Sample Predictions (first 10) ---")
    print(f"{'Actual':>10}  {'Predicted':>10}  {'Error':>10}")
    for actual, pred in list(zip(y_test.values, preds))[:10]:
        print(f"{actual:>10.2f}  {pred:>10.2f}  {actual - pred:>+10.2f}")

    # Save artifacts
    model_path = os.path.join(ML_DIR, "completion_model.pkl")
    cat_enc_path = os.path.join(ML_DIR, "category_encoder.pkl")
    pri_enc_path = os.path.join(ML_DIR, "priority_encoder.pkl")

    joblib.dump(model, model_path)
    joblib.dump(category_encoder, cat_enc_path)
    joblib.dump(PRIORITY_MAP, pri_enc_path)

    print(f"\nSaved: {model_path}")
    print(f"Saved: {cat_enc_path}")
    print(f"Saved: {pri_enc_path}")


if __name__ == "__main__":
    train()
