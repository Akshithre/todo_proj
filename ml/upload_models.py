"""Upload trained model .pkl files to Azure Blob Storage."""
import os
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

MODELS = ["completion_model.pkl", "priority_model.pkl"]


def upload():
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    container_client = blob_service.get_container_client(container)

    for model_file in MODELS:
        path = os.path.join(os.path.dirname(__file__), model_file)
        if not os.path.exists(path):
            print(f"Skipping {model_file} — file not found")
            continue
        with open(path, "rb") as f:
            container_client.upload_blob(name=f"models/{model_file}", data=f, overwrite=True)
        print(f"Uploaded {model_file} to Azure Blob Storage")


if __name__ == "__main__":
    upload()
