"""
Integration test: creates tasks, calls predict-time and suggestions endpoints,
and verifies the Azure ML pipeline is working end-to-end.
"""
import sys
import httpx
from datetime import datetime, timedelta

API_URL = "http://localhost:8000"

TEST_TASKS = [
    {
        "task_name": "Write quarterly report",
        "priority": "High",
        "category": "Work",
        "estimated_time": 3.0,
        "deadline": (datetime.now() + timedelta(days=2)).isoformat(),
    },
    {
        "task_name": "Grocery shopping",
        "priority": "Low",
        "category": "Personal",
        "estimated_time": 1.0,
        "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
    },
    {
        "task_name": "Fix login bug",
        "priority": "High",
        "category": "Work",
        "estimated_time": 5.0,
        "deadline": (datetime.now() + timedelta(hours=12)).isoformat(),
    },
]


def create_tasks(client: httpx.Client) -> list[dict]:
    created = []
    for task in TEST_TASKS:
        resp = client.post(f"{API_URL}/tasks", json=task)
        assert resp.status_code == 201, f"Create failed: {resp.status_code} {resp.text}"
        data = resp.json()
        created.append(data)
        print(f"  Created task #{data['task_id']}: {data['task_name']} "
              f"(priority={data['priority']}, est={data['estimated_time']}h)")
    return created


def test_predict_time(client: httpx.Client, tasks: list[dict]) -> list[dict]:
    predictions = []
    for task in tasks:
        tid = task["task_id"]
        resp = client.get(f"{API_URL}/tasks/{tid}/predict-time")
        assert resp.status_code == 200, f"Predict failed for task {tid}: {resp.status_code} {resp.text}"
        data = resp.json()
        predictions.append(data)

        assert "predicted_time" in data, "Missing predicted_time"
        assert "task_name" in data, "Missing task_name"
        assert "recommendation" in data, "Missing recommendation"
        assert data["task_id"] == tid, "task_id mismatch"
        assert isinstance(data["predicted_time"], (int, float)), "predicted_time is not a number"

        print(f"  Task #{tid} '{data['task_name']}':")
        print(f"    Predicted time : {data['predicted_time']}h")
        print(f"    Your estimate  : {data['your_estimate']}h")
        print(f"    Recommendation : {data['recommendation']}")
    return predictions


def test_suggestions(client: httpx.Client) -> dict:
    resp = client.get(f"{API_URL}/tasks/suggestions")
    assert resp.status_code == 200, f"Suggestions failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert "suggestions" in data, "Missing suggestions key"
    suggestions = data["suggestions"]
    assert len(suggestions) <= 5, "More than 5 suggestions returned"

    for s in suggestions:
        assert "suggested_priority" in s, "Missing suggested_priority"
        assert "confidence" in s, "Missing confidence"
        assert "do_this" in s, "Missing do_this"
        assert isinstance(s["confidence"], (int, float)), "confidence is not a number"

        print(f"  #{s['task_id']} '{s['task_name']}':")
        print(f"    Suggested priority : {s['suggested_priority']}")
        print(f"    Predicted time     : {s['predicted_time']}h")
        print(f"    Confidence         : {s['confidence']}")
        print(f"    Do this            : {s['do_this']}")

    # Verify sorted by confidence descending
    confidences = [s["confidence"] for s in suggestions]
    assert confidences == sorted(confidences, reverse=True), "Suggestions not sorted by confidence"

    return data


def cleanup_tasks(client: httpx.Client, tasks: list[dict]):
    for task in tasks:
        client.delete(f"{API_URL}/tasks/{task['task_id']}")
    print(f"  Cleaned up {len(tasks)} test tasks.")


def main():
    passed = 0
    failed = 0
    created_tasks = []

    with httpx.Client(timeout=30.0) as client:
        # Step 1: Create tasks
        print("\n=== Step 1: Creating test tasks ===")
        try:
            created_tasks = create_tasks(client)
            print(f"  PASSED - {len(created_tasks)} tasks created\n")
            passed += 1
        except Exception as e:
            print(f"  FAILED - {e}\n")
            failed += 1
            sys.exit(1)

        # Step 2: Predict time for each task
        print("=== Step 2: Testing predict-time endpoint ===")
        try:
            test_predict_time(client, created_tasks)
            print("  PASSED - All predictions returned correctly\n")
            passed += 1
        except Exception as e:
            print(f"  FAILED - {e}\n")
            failed += 1

        # Step 3: Get suggestions
        print("=== Step 3: Testing suggestions endpoint ===")
        try:
            test_suggestions(client)
            print("  PASSED - Suggestions returned and sorted correctly\n")
            passed += 1
        except Exception as e:
            print(f"  FAILED - {e}\n")
            failed += 1

        # Cleanup
        print("=== Cleanup ===")
        cleanup_tasks(client, created_tasks)

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*40}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
