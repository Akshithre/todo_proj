import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_create_task():
    response = client.post("/tasks", json={
        "task_name": "Write unit tests",
        "priority": "High",
        "estimated_time": 2.5,
        "category": "Development",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["task_name"] == "Write unit tests"
    assert data["priority"] == "High"
    assert data["status"] == "Pending"


def test_get_tasks():
    client.post("/tasks", json={"task_name": "Task A"})
    client.post("/tasks", json={"task_name": "Task B"})
    response = client.get("/tasks")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_task_by_id():
    create = client.post("/tasks", json={"task_name": "Find me"})
    task_id = create.json()["task_id"]
    response = client.get(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["task_name"] == "Find me"


def test_update_task():
    create = client.post("/tasks", json={"task_name": "Old name"})
    task_id = create.json()["task_id"]
    response = client.put(f"/tasks/{task_id}", json={
        "task_name": "New name",
        "status": "Completed",
        "actual_time": 3.0,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["task_name"] == "New name"
    assert data["status"] == "Completed"


def test_delete_task():
    create = client.post("/tasks", json={"task_name": "Delete me"})
    task_id = create.json()["task_id"]
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    get_resp = client.get(f"/tasks/{task_id}")
    assert get_resp.status_code == 404


def test_get_nonexistent_task():
    response = client.get("/tasks/9999")
    assert response.status_code == 404


def test_predict_time():
    create = client.post("/tasks", json={
        "task_name": "Predict this",
        "priority": "High",
        "estimated_time": 4.0,
    })
    task_id = create.json()["task_id"]
    response = client.get(f"/tasks/{task_id}/predict-time")
    assert response.status_code == 200
    data = response.json()
    assert "predicted_time" in data
    assert "confidence" in data


def test_suggestions():
    client.post("/tasks", json={"task_name": "Suggest me", "priority": "Low"})
    response = client.get("/tasks/suggestions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
