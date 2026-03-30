"""Shared data loading utilities for ML training scripts."""
import os
from io import BytesIO

import pandas as pd
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

ML_DIR = os.path.dirname(__file__)
PRIORITY_MAP = {"High": 3, "Medium": 2, "Low": 1}


def load_data_from_blob(blob_name: str = "tasks_data.csv") -> pd.DataFrame:
    """Download a CSV from Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    stream = blob_client.download_blob().readall()
    return pd.read_csv(BytesIO(stream))


def load_data_local(filename: str = "tasks_data.csv") -> pd.DataFrame:
    """Fall back to local CSV if Azure is unavailable."""
    local_path = os.path.join(ML_DIR, filename)
    if os.path.exists(local_path):
        return pd.read_csv(local_path)
    raise FileNotFoundError(
        f"No local {filename} found. Run generate_sample_data.py first."
    )


def load_data(blob_name: str = "tasks_data.csv") -> pd.DataFrame:
    """Try Azure Blob first, fall back to local CSV."""
    try:
        df = load_data_from_blob(blob_name)
        print("Loaded data from Azure Blob Storage")
        return df
    except Exception as e:
        print(f"Azure Blob not available ({e}) — using local CSV")
        return load_data_local(blob_name)
