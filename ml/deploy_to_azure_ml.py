"""
Deploy ML models to Azure ML as a managed online endpoint.
Uses score.py as the scoring script and downloads model artifacts
from Azure Blob Storage at runtime.
"""
import os

from azure.ai.ml import MLClient
from azure.ai.ml.entities import (
    ManagedOnlineEndpoint,
    ManagedOnlineDeployment,
    Environment,
    CodeConfiguration,
)
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

ML_DIR = os.path.dirname(os.path.abspath(__file__))

SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
RESOURCE_GROUP = "todo-optimizer-rg"
WORKSPACE_NAME = "todo-aml"

ENDPOINT_NAME = "todo-ml-endpoint"
DEPLOYMENT_NAME = "todo-ml-deployment"


def get_ml_client() -> MLClient:
    credential = DefaultAzureCredential()
    return MLClient(
        credential=credential,
        subscription_id=SUBSCRIPTION_ID,
        resource_group_name=RESOURCE_GROUP,
        workspace_name=WORKSPACE_NAME,
    )


def create_endpoint(ml_client: MLClient) -> ManagedOnlineEndpoint:
    endpoint = ManagedOnlineEndpoint(
        name=ENDPOINT_NAME,
        auth_mode="key",
    )

    print(f"Creating endpoint '{ENDPOINT_NAME}'...")
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    print("Endpoint created.")
    return endpoint


def create_deployment(ml_client: MLClient) -> ManagedOnlineDeployment:
    env = Environment(
        name="todo-ml-env",
        image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu22.04",
        conda_file={
            "name": "todo-ml-env",
            "channels": ["defaults", "conda-forge"],
            "dependencies": [
                "python=3.11",
                "pip",
                {
                    "pip": [
                        "scikit-learn",
                        "pandas",
                        "joblib",
                        "azure-storage-blob",
                        "numpy",
                        "azureml-inference-server-http",
                    ]
                },
            ],
        },
    )

    # Pass blob storage credentials so score.py init() can download models
    env_vars = {
        "AZURE_STORAGE_CONNECTION_STRING": os.getenv("AZURE_STORAGE_CONNECTION_STRING", ""),
        "AZURE_STORAGE_CONTAINER": os.getenv("AZURE_STORAGE_CONTAINER", "tododata"),
    }

    deployment = ManagedOnlineDeployment(
        name=DEPLOYMENT_NAME,
        endpoint_name=ENDPOINT_NAME,
        code_configuration=CodeConfiguration(
            code=ML_DIR,
            scoring_script="score.py",
        ),
        environment=env,
        instance_type="Standard_DS2_v2",
        instance_count=1,
        environment_variables=env_vars,
    )

    print(f"Creating deployment '{DEPLOYMENT_NAME}'...")
    ml_client.online_deployments.begin_create_or_update(deployment).result()
    print("Deployment created.")
    return deployment


def set_traffic(ml_client: MLClient) -> None:
    endpoint = ml_client.online_endpoints.get(ENDPOINT_NAME)
    endpoint.traffic = {DEPLOYMENT_NAME: 100}
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    print(f"Traffic set to 100% on '{DEPLOYMENT_NAME}'.")


def print_details(ml_client: MLClient) -> None:
    endpoint = ml_client.online_endpoints.get(ENDPOINT_NAME)
    keys = ml_client.online_endpoints.get_keys(ENDPOINT_NAME)

    scoring_uri = endpoint.scoring_uri
    primary_key = keys.primary_key

    print(f"\n--- Deployment Details ---")
    print(f"Endpoint URL:    {scoring_uri}")
    print(f"Primary API Key: {primary_key}")

    sample_payload = (
        '{"priority": "High", "category": "Work", '
        '"deadline_gap": 5, "estimated_time": 3.0}'
    )

    print(f"\nTest with curl:")
    print(f'curl -X POST "{scoring_uri}" \\')
    print(f'  -H "Authorization: Bearer {primary_key}" \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f"  -d '{sample_payload}'")


def main():
    if not SUBSCRIPTION_ID:
        print("ERROR: AZURE_SUBSCRIPTION_ID not set in .env")
        return

    ml_client = get_ml_client()

    create_endpoint(ml_client)
    create_deployment(ml_client)
    set_traffic(ml_client)
    print_details(ml_client)

    print("\nDeployment complete!")


if __name__ == "__main__":
    main()
