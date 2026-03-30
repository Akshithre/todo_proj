"""
Upload trained ML model artifacts to Azure Blob Storage
and verify by listing all blobs in the container.
"""
import os

from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

ML_DIR = os.path.dirname(__file__)

FILES = [
    "completion_model.pkl",
    "priority_model.pkl",
    "category_encoder.pkl",
    "priority_encoder.pkl",
]


def upload_models():
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        print("ERROR: AZURE_STORAGE_CONNECTION_STRING not set.")
        return

    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")
    blob_service = BlobServiceClient.from_connection_string(conn_str)
    container_client = blob_service.get_container_client(container)

    # Upload each file
    print("--- Uploading models ---")
    for filename in FILES:
        local_path = os.path.join(ML_DIR, filename)
        if not os.path.exists(local_path):
            print(f"  SKIP: {filename} not found")
            continue

        size_kb = os.path.getsize(local_path) / 1024
        blob_client = blob_service.get_blob_client(container=container, blob=filename)
        with open(local_path, "rb") as f:
            blob_client.upload_blob(f, overwrite=True)
        print(f"  Uploaded: {filename} ({size_kb:.1f} KB)")

    # List all blobs in container
    print(f"\n--- All files in '{container}' container ---")
    for blob in container_client.list_blobs():
        size_kb = blob.size / 1024
        print(f"  {blob.name} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    upload_models()
