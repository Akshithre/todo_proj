"""
Generate training data for ML models.

Primary source: Real-world Kaggle dataset (Employee Performance and Productivity Data)
               transformed into task-level records via load_kaggle_data.py
Fallback:      Synthetic data generation (used only when the Kaggle dataset is unavailable)

Usage:
  # Preferred — uses real Kaggle data:
  python load_kaggle_data.py

  # Fallback — generates synthetic data:
  python generate_sample_data.py
"""
import os
import random
from datetime import datetime, timedelta

import pandas as pd
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

TASK_NAMES = [
    "Write report", "Send emails", "Study chapter", "Fix login bug",
    "Update resume", "Plan meeting", "Review PR", "Design mockup",
    "Prepare presentation", "Debug API", "Write unit tests", "Read documentation",
    "Organize files", "Call client", "Submit assignment", "Refactor module",
    "Create dashboard", "Grocery shopping", "Morning workout", "Meditate",
    "Team standup", "Code review", "Database backup", "Write blog post",
    "Schedule interview", "Update dependencies", "Research tools", "Clean inbox",
    "Practice coding", "Weekly review", "Deploy to staging", "Draft proposal",
    "Optimize query", "Setup CI pipeline", "Run benchmarks", "Plan sprint",
    "Write API docs", "Gym session", "Meal prep", "Track expenses",
    "Book appointment", "Learn new framework", "Backup photos", "Water plants",
    "Pay bills", "Attend webinar", "Sketch wireframe", "Review analytics",
    "Update portfolio", "File taxes",
]

PRIORITIES = ["High", "Medium", "Low"]
CATEGORIES = ["Work", "Personal", "Study", "Health"]

ML_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(ML_DIR, "tasks_data.csv")


def generate_synthetic_tasks(n: int = 500) -> pd.DataFrame:
    """Generate synthetic task data as a fallback when real data is unavailable."""
    random.seed(42)
    now = datetime.now()
    six_months_ago = now - timedelta(days=180)

    rows = []
    for _ in range(n):
        priority = random.choice(PRIORITIES)
        estimated_time = round(random.uniform(0.5, 8.0), 2)
        deadline_gap = random.randint(1, 30)

        if priority == "High":
            actual_time = round(estimated_time * random.uniform(0.9, 1.4), 2)
        elif priority == "Medium":
            actual_time = round(estimated_time * random.uniform(0.8, 1.6), 2)
        else:
            actual_time = round(estimated_time * random.uniform(0.7, 2.0), 2)

        completion_rate = min(round(actual_time / estimated_time, 2), 2.0)
        created_at = six_months_ago + timedelta(
            seconds=random.randint(0, int((now - six_months_ago).total_seconds()))
        )

        rows.append({
            "task_name": random.choice(TASK_NAMES),
            "priority": priority,
            "category": random.choice(CATEGORIES),
            "deadline_gap": deadline_gap,
            "estimated_time": estimated_time,
            "actual_time": actual_time,
            "status": "Completed",
            "completion_rate": completion_rate,
            "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    return pd.DataFrame(rows)


def upload_to_blob(csv_path: str) -> None:
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        print("AZURE_STORAGE_CONNECTION_STRING not set — skipping upload.")
        return

    container = os.getenv("AZURE_STORAGE_CONTAINER", "tododata")
    blob_name = "tasks_data.csv"

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    container_client = blob_service.get_container_client(container)

    try:
        container_client.get_container_properties()
    except Exception:
        container_client.create_container()
        print(f"Created container '{container}'.")

    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    with open(csv_path, "rb") as f:
        blob_client.upload_blob(f, overwrite=True)

    print(f"Uploaded to Azure Blob: {container}/{blob_name}")


def print_summary(df: pd.DataFrame) -> None:
    print("\n--- Summary ---")
    print(f"Total tasks: {len(df)}")
    print(f"\nPriority distribution:\n{df['priority'].value_counts().to_string()}")
    print(f"\nCategory distribution:\n{df['category'].value_counts().to_string()}")
    print(f"\nAverage actual completion time: {df['actual_time'].mean():.2f} hours")


def main():
    # Try real Kaggle data first
    kaggle_csv = os.path.join(ML_DIR, "kaggle_data", "Extended_Employee_Performance_and_Productivity_Data.csv")
    if os.path.exists(kaggle_csv):
        print("Real Kaggle dataset found — use 'python load_kaggle_data.py' instead.")
        print("Running synthetic generation as fallback...\n")

    print("Generating synthetic training data (fallback mode)...")
    df = generate_synthetic_tasks(500)
    df.to_csv(CSV_PATH, index=False)
    print(f"Saved {len(df)} synthetic tasks to {CSV_PATH}")

    upload_to_blob(CSV_PATH)
    print_summary(df)


if __name__ == "__main__":
    main()
