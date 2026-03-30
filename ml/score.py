"""
Azure ML scoring script.
Deployed as a REST endpoint — receives JSON, returns predictions.
Downloads model artifacts from Azure Blob Storage on init.
"""
import os
import io
import json

import joblib
import numpy as np
import pandas as pd

completion_model = None
priority_model = None
category_encoder = None
priority_map = None


def _load_blob(blob_service, container, blob_name):
    """Download a blob and load it with joblib."""
    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    stream = blob_client.download_blob().readall()
    return joblib.load(io.BytesIO(stream))


def init():
    """Called once when the service starts. Downloads models from Azure Blob Storage."""
    global completion_model, priority_model, category_encoder, priority_map

    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")
    blob_service = BlobServiceClient.from_connection_string(conn_str)

    completion_model = _load_blob(blob_service, container, "completion_model.pkl")
    priority_model = _load_blob(blob_service, container, "priority_model.pkl")
    category_encoder = _load_blob(blob_service, container, "category_encoder.pkl")
    priority_map = _load_blob(blob_service, container, "priority_encoder.pkl")


def run(raw_data: str) -> str:
    """
    Score a single task.

    Input JSON:
    {
        "priority": "High",
        "category": "Work",
        "deadline_gap": 5,
        "estimated_time": 3.0
    }

    Output JSON:
    {
        "predicted_completion_time": 3.8,
        "suggested_priority": "High",
        "priority_confidence": 0.85,
        "recommendation": "..."
    }
    """
    request = json.loads(raw_data)

    priority = request["priority"]
    category = request["category"]
    deadline_gap = request["deadline_gap"]
    estimated_time = request["estimated_time"]

    # Encode inputs
    priority_encoded = priority_map.get(priority, 2)

    try:
        category_encoded = category_encoder.transform([category])[0]
    except ValueError:
        category_encoded = 0

    # Predict completion time
    completion_features = pd.DataFrame(
        [[priority_encoded, category_encoded, deadline_gap, estimated_time]],
        columns=["priority_encoded", "category_encoded",
                 "deadline_gap", "estimated_time"],
    )
    predicted_time = float(completion_model.predict(completion_features)[0])
    predicted_time = round(predicted_time, 2)

    # Predict priority
    completion_rate = min(predicted_time / estimated_time, 2.0) if estimated_time > 0 else 1.0
    priority_features = pd.DataFrame(
        [[deadline_gap, estimated_time, category_encoded, completion_rate]],
        columns=["deadline_gap", "estimated_time",
                 "category_encoded", "completion_rate"],
    )
    suggested_priority = str(priority_model.predict(priority_features)[0])

    # Priority confidence from class probabilities
    proba = priority_model.predict_proba(priority_features)[0]
    priority_confidence = round(float(np.max(proba)), 2)

    # Recommendation
    if predicted_time > estimated_time * 1.2:
        recommendation = "This will take longer than expected. Start early."
    elif predicted_time < estimated_time * 0.8:
        recommendation = "You may finish this faster than expected."
    else:
        recommendation = "Your time estimate looks accurate."

    result = {
        "predicted_completion_time": predicted_time,
        "suggested_priority": suggested_priority,
        "priority_confidence": priority_confidence,
        "recommendation": recommendation,
    }

    return json.dumps(result)
