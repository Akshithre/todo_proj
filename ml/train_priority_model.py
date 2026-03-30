"""
Train a Random Forest classifier to predict task priority level.
Downloads training data from Azure Blob Storage, preprocesses it,
trains the model, and saves the artifact locally.
"""
import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder

from data_loader import load_data, ML_DIR


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
    df = load_data()
    print(f"Dataset size: {len(df)} rows")

    X, y, category_encoder = preprocess(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}  |  Test: {len(X_test)}")

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\n--- Evaluation ---")
    print(f"Accuracy: {acc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, preds))

    model_path = os.path.join(ML_DIR, "priority_model.pkl")
    joblib.dump(model, model_path)
    print(f"Saved: {model_path}")


if __name__ == "__main__":
    train()
