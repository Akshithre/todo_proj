"""
Load and transform real-world Kaggle dataset into task-level training data.

Source: Employee Performance and Productivity Data (100k rows)
URL:    https://www.kaggle.com/datasets/mexwell/employee-performance-and-productivity-data

This script performs ETL (Extract-Transform-Load):
  1. Extract  — Reads the raw Kaggle CSV
  2. Transform — Converts employee-level records into task-level records,
                 mapping departments to categories, deriving priorities from
                 performance scores, and computing realistic time estimates.
  3. Load — Outputs a clean tasks_data.csv ready for ML training.

Usage:
  1. Download the dataset from Kaggle and place the CSV in ml/kaggle_data/
  2. Run: python load_kaggle_data.py
  3. Output: ml/tasks_data.csv (overwrites synthetic data)
"""
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

ML_DIR = os.path.dirname(os.path.abspath(__file__))
KAGGLE_DATA_DIR = os.path.join(ML_DIR, "kaggle_data")
RAW_FILE = os.path.join(
    KAGGLE_DATA_DIR,
    "Extended_Employee_Performance_and_Productivity_Data.csv",
)
OUTPUT_FILE = os.path.join(ML_DIR, "tasks_data.csv")

# ── Column mappings ──────────────────────────────────────────────────

# Map departments to task categories relevant to a todo app.
# Employees in different departments tend to have different task mixes —
# e.g. HR handles more personal/admin tasks, Engineering more study/research.
DEPARTMENT_TO_CATEGORY_WEIGHTS = {
    "Sales":            {"Work": 0.60, "Personal": 0.20, "Study": 0.10, "Health": 0.10},
    "Marketing":        {"Work": 0.55, "Personal": 0.15, "Study": 0.20, "Health": 0.10},
    "IT":               {"Work": 0.50, "Study": 0.30, "Personal": 0.10, "Health": 0.10},
    "HR":               {"Work": 0.40, "Personal": 0.30, "Health": 0.15, "Study": 0.15},
    "Finance":          {"Work": 0.60, "Personal": 0.20, "Study": 0.10, "Health": 0.10},
    "Operations":       {"Work": 0.55, "Personal": 0.20, "Study": 0.10, "Health": 0.15},
    "Engineering":      {"Work": 0.45, "Study": 0.35, "Personal": 0.10, "Health": 0.10},
    "Customer Support": {"Work": 0.50, "Personal": 0.25, "Study": 0.10, "Health": 0.15},
    "Legal":            {"Work": 0.55, "Study": 0.25, "Personal": 0.10, "Health": 0.10},
}

# Map performance scores (1–5) to priority levels
PERFORMANCE_TO_PRIORITY = {
    1: "Low",
    2: "Low",
    3: "Medium",
    4: "High",
    5: "High",
}

# Realistic task names per category
TASK_NAMES = {
    "Work": [
        "Review quarterly report", "Update project timeline", "Prepare client proposal",
        "Conduct team standup", "Review pull request", "Debug production issue",
        "Write API documentation", "Optimize database query", "Deploy to staging",
        "Create sprint backlog", "Attend stakeholder meeting", "Write test cases",
        "Refactor authentication module", "Set up CI pipeline", "Analyze user metrics",
        "Draft email campaign", "Update CRM records", "Process invoices",
        "Prepare sales forecast", "Conduct code review",
    ],
    "Study": [
        "Study research paper", "Complete online course module", "Review lecture notes",
        "Practice coding problems", "Read documentation", "Write research summary",
        "Prepare presentation slides", "Analyze dataset", "Learn new framework",
        "Review technical whitepaper",
    ],
    "Health": [
        "Morning workout", "Gym session", "Yoga practice", "Meal prep",
        "Schedule doctor appointment", "Track daily nutrients", "Evening run",
        "Meditation session", "Stretching routine", "Prepare healthy lunch",
    ],
    "Personal": [
        "Organize workspace", "Plan weekly schedule", "Update personal budget",
        "Clean inbox", "File expense reports", "Schedule team outing",
        "Review insurance documents", "Organize digital files", "Plan commute route",
        "Update contact list",
    ],
}


def load_raw_data() -> pd.DataFrame:
    """Load the raw Kaggle CSV file."""
    if not os.path.exists(RAW_FILE):
        print(f"ERROR: Raw dataset not found at {RAW_FILE}")
        print(f"\nTo fix this:")
        print(f"  1. Download from: https://www.kaggle.com/datasets/mexwell/employee-performance-and-productivity-data")
        print(f"  2. Extract the ZIP file")
        print(f"  3. Place the CSV in: {KAGGLE_DATA_DIR}/")
        print(f"  OR run: kaggle datasets download -d mexwell/employee-performance-and-productivity-data --unzip -p ml/kaggle_data/")
        raise FileNotFoundError(f"Dataset not found: {RAW_FILE}")

    df = pd.read_csv(RAW_FILE)
    print(f"Loaded raw dataset: {len(df)} employee records, {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")
    return df


DEFAULT_CATEGORY_WEIGHTS = {"Work": 0.50, "Personal": 0.20, "Study": 0.15, "Health": 0.15}

# Target output size — enough for robust training without bloating the CSV
MAX_TASK_RECORDS = 10000


def _pick_category(department: str) -> str:
    """Pick a category based on department-weighted probabilities."""
    weights = DEPARTMENT_TO_CATEGORY_WEIGHTS.get(department, DEFAULT_CATEGORY_WEIGHTS)
    categories = list(weights.keys())
    probs = list(weights.values())
    return random.choices(categories, weights=probs, k=1)[0]


def transform_to_tasks(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform employee-level records into task-level records.

    Each employee generates 1 to N tasks (based on Projects_Handled),
    with realistic time estimates derived from actual work patterns.
    Output is capped at MAX_TASK_RECORDS for manageable training.
    """
    random.seed(42)
    np.random.seed(42)

    # Subsample if dataset is very large (keeps transform fast)
    if len(df) > MAX_TASK_RECORDS:
        df = df.sample(n=MAX_TASK_RECORDS, random_state=42).reset_index(drop=True)
        print(f"  Subsampled to {len(df)} employees for target ~{MAX_TASK_RECORDS} tasks")

    tasks = []
    now = datetime.now()
    six_months_ago = now - timedelta(days=180)

    for _, row in df.iterrows():
        # ── Extract source fields ──
        department = str(row.get("Department", "Operations"))
        perf_score = int(row.get("Performance_Score", 3))
        projects = int(row.get("Projects_Handled", 1))
        work_hours = float(row.get("Work_Hours_Per_Week", 40))
        overtime = float(row.get("Overtime_Hours", 0))

        # ── Map to task-level fields ──
        base_priority = PERFORMANCE_TO_PRIORITY.get(perf_score, "Medium")

        # Derive per-project hours from weekly work pattern
        weekly_task_hours = (work_hours + overtime / 52) / max(projects, 1)

        # Generate 1–3 tasks per employee (realistic mix)
        num_tasks = min(max(projects // 10, 1), 3)

        for _ in range(num_tasks):
            # Category: weighted by department
            category = _pick_category(department)

            # Priority: mostly from performance, with some variance
            if random.random() < 0.15:
                priority = random.choice(["High", "Medium", "Low"])
            else:
                priority = base_priority

            # Estimated time: based on real work hours per project
            estimated_time = round(max(0.5, np.random.normal(weekly_task_hours, 1.5)), 2)

            # Actual time: varies by priority (high-priority = tighter execution)
            if priority == "High":
                actual_factor = np.random.normal(1.1, 0.15)
            elif priority == "Medium":
                actual_factor = np.random.normal(1.2, 0.25)
            else:
                actual_factor = np.random.normal(1.3, 0.35)
            actual_factor = max(0.5, min(actual_factor, 2.5))
            actual_time = round(estimated_time * actual_factor, 2)

            # Deadline gap: high priority = tighter deadlines
            if priority == "High":
                deadline_gap = random.randint(1, 7)
            elif priority == "Medium":
                deadline_gap = random.randint(3, 14)
            else:
                deadline_gap = random.randint(7, 30)

            completion_rate = round(min(actual_time / max(estimated_time, 0.1), 2.0), 2)

            task_name = random.choice(TASK_NAMES[category])

            created_at = six_months_ago + timedelta(
                seconds=random.randint(0, int((now - six_months_ago).total_seconds()))
            )

            tasks.append({
                "task_name": task_name,
                "priority": priority,
                "category": category,
                "deadline_gap": deadline_gap,
                "estimated_time": estimated_time,
                "actual_time": actual_time,
                "status": "Completed",
                "completion_rate": completion_rate,
                "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
            })

    result = pd.DataFrame(tasks)
    print(f"Generated {len(result)} task records from {len(df)} employee records")
    return result


def print_summary(df: pd.DataFrame) -> None:
    """Print dataset statistics for verification."""
    print(f"\n{'='*60}")
    print(f"DATASET SUMMARY")
    print(f"{'='*60}")
    print(f"Total task records: {len(df)}")
    print(f"\nPriority distribution:")
    print(df["priority"].value_counts().to_string())
    print(f"\nCategory distribution:")
    print(df["category"].value_counts().to_string())
    print(f"\nTime statistics:")
    print(f"  Avg estimated time: {df['estimated_time'].mean():.2f} hrs")
    print(f"  Avg actual time:    {df['actual_time'].mean():.2f} hrs")
    print(f"  Avg completion rate: {df['completion_rate'].mean():.2f}")
    print(f"\nDeadline gap range: {df['deadline_gap'].min()} - {df['deadline_gap'].max()} days")
    print(f"\nSample records:")
    print(df.head(5).to_string(index=False))


def upload_to_blob(csv_path: str) -> None:
    """Upload the processed CSV to Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        print("\nAZURE_STORAGE_CONNECTION_STRING not set — skipping blob upload.")
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


def main():
    # Step 1: Extract
    print("Step 1/3: Loading raw Kaggle dataset...")
    raw_df = load_raw_data()

    # Step 2: Transform
    print("\nStep 2/3: Transforming employee data into task records...")
    tasks_df = transform_to_tasks(raw_df)

    # Step 3: Load
    print(f"\nStep 3/3: Saving to {OUTPUT_FILE}...")
    tasks_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Saved {len(tasks_df)} records to {OUTPUT_FILE}")

    # Optional: upload to Azure Blob
    upload_to_blob(OUTPUT_FILE)

    # Summary
    print_summary(tasks_df)


if __name__ == "__main__":
    main()
