"""
Azure ML scoring script.
Deployed as a REST endpoint — receives JSON, returns predictions.
"""
import os
import json
import joblib
import numpy as np


def init():
    """Called once when the service starts."""
    global completion_model, priority_model
    model_dir = os.getenv("AZUREML_MODEL_DIR", ".")
    completion_model = joblib.load(os.path.join(model_dir, "completion_model.pkl"))
    priority_model = joblib.load(os.path.join(model_dir, "priority_model.pkl"))


def run(raw_data: str) -> str:
    """
    Called for each scoring request.

    Input JSON format:
    {
        "model": "completion" | "priority",
        "data": [[priority_score, estimated_time, deadline_gap_hours], ...]
    }
    """
    request = json.loads(raw_data)
    model_name = request.get("model", "completion")
    data = np.array(request["data"])

    if model_name == "completion":
        predictions = completion_model.predict(data).tolist()
    elif model_name == "priority":
        predictions = priority_model.predict(data[:, :2]).tolist()  # only first 2 features
    else:
        return json.dumps({"error": f"Unknown model: {model_name}"})

    return json.dumps({"predictions": predictions})
