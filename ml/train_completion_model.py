"""
Train a Random Forest model to predict task completion time.
Downloads training data from Azure Blob Storage, preprocesses it,
trains the model, and saves all artifacts locally.
"""
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

from data_loader import load_data, ML_DIR, PRIORITY_MAP


# ── Preprocessing ───────────────────────────────────────────────────

def preprocess(df: pd.DataFrame):
    """Encode features and return X, y, and the fitted encoders."""
    df = df.dropna(subset=["priority", "category", "deadline_gap",
                           "estimated_time", "actual_time"]).copy()

    df["priority_encoded"] = df["priority"].map(PRIORITY_MAP).fillna(2).astype(int)

    category_encoder = LabelEncoder()
    df["category_encoded"] = category_encoder.fit_transform(df["category"])

    features = ["priority_encoded", "category_encoded",
                "deadline_gap", "estimated_time"]
    X = df[features]
    y = df["actual_time"]

    return X, y, category_encoder


# ── Training ────────────────────────────────────────────────────────

def train():
    df = load_data()
    print(f"Dataset size: {len(df)} rows")

    X, y, category_encoder = preprocess(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}  |  Test: {len(X_test)}")

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
