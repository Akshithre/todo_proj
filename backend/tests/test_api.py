import os

# Force SQLite before any app imports
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

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


def _register_and_login(name="Test User", email="test@example.com", password="Test1234"):
    """Helper to register a user and return auth headers."""
    resp = client.post("/auth/register", json={
        "full_name": name, "email": email, "password": password, "org_name": "Test Org",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register():
    resp = client.post("/auth/register", json={
        "full_name": "Alice", "email": "alice@example.com",
        "password": "Alice123", "org_name": "Alice Corp",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login():
    _register_and_login(email="login@example.com")
    resp = client.post("/auth/login", json={"email": "login@example.com", "password": "Test1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_bad_password():
    _register_and_login(email="bad@example.com")
    resp = client.post("/auth/login", json={"email": "bad@example.com", "password": "wrong"})
    assert resp.status_code == 401


def test_me():
    headers = _register_and_login(email="me@example.com")
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


def test_create_task():
    headers = _register_and_login(email="task@example.com")
    response = client.post("/tasks", json={
        "task_name": "Write unit tests",
        "priority": "High",
        "estimated_time": 2.5,
        "category": "Development",
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["task_name"] == "Write unit tests"
    assert data["priority"] == "High"
    assert data["status"] == "Pending"


def test_create_task_no_auth():
    """Tasks can still be created without auth for backward compatibility."""
    response = client.post("/tasks", json={"task_name": "Anonymous task"})
    assert response.status_code == 201


def test_get_tasks():
    headers = _register_and_login(email="tasks@example.com")
    client.post("/tasks", json={"task_name": "Task A"}, headers=headers)
    client.post("/tasks", json={"task_name": "Task B"}, headers=headers)
    response = client.get("/tasks", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 2


def test_get_task_by_id():
    headers = _register_and_login(email="byid@example.com")
    create = client.post("/tasks", json={"task_name": "Find me"}, headers=headers)
    task_id = create.json()["task_id"]
    response = client.get(f"/tasks/{task_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["task_name"] == "Find me"


def test_update_task():
    headers = _register_and_login(email="update@example.com")
    create = client.post("/tasks", json={"task_name": "Old name"}, headers=headers)
    task_id = create.json()["task_id"]
    response = client.put(f"/tasks/{task_id}", json={
        "task_name": "New name",
        "status": "Completed",
        "actual_time": 3.0,
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["task_name"] == "New name"
    assert data["status"] == "Completed"


def test_delete_task():
    headers = _register_and_login(email="delete@example.com")
    create = client.post("/tasks", json={"task_name": "Delete me"}, headers=headers)
    task_id = create.json()["task_id"]
    response = client.delete(f"/tasks/{task_id}", headers=headers)
    assert response.status_code == 200
    get_resp = client.get(f"/tasks/{task_id}", headers=headers)
    assert get_resp.status_code == 404


def test_get_nonexistent_task():
    response = client.get("/tasks/9999")
    assert response.status_code == 404


def test_predict_time():
    headers = _register_and_login(email="predict@example.com")
    create = client.post("/tasks", json={
        "task_name": "Predict this",
        "priority": "High",
        "estimated_time": 4.0,
    }, headers=headers)
    task_id = create.json()["task_id"]
    response = client.get(f"/tasks/{task_id}/predict-time")
    assert response.status_code == 200
    data = response.json()
    assert "predicted_time" in data
    assert "confidence" in data


def test_suggestions():
    headers = _register_and_login(email="suggest@example.com")
    client.post("/tasks", json={"task_name": "Suggest me", "priority": "Low"}, headers=headers)
    response = client.get("/tasks/suggestions", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)


def test_teams():
    headers = _register_and_login(email="teams@example.com")
    resp = client.get("/teams", headers=headers)
    assert resp.status_code == 200
    teams = resp.json()
    assert len(teams) >= 1  # default "General" team created on register


def test_create_team():
    headers = _register_and_login(email="newteam@example.com")
    resp = client.post("/teams", json={"name": "Dev Team", "color": "#FF0000"}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Dev Team"


def test_notifications():
    headers = _register_and_login(email="notif@example.com")
    resp = client.get("/notifications", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_unread_count():
    headers = _register_and_login(email="unread@example.com")
    resp = client.get("/notifications/unread-count", headers=headers)
    assert resp.status_code == 200
    assert "count" in resp.json()


def test_org_stats():
    headers = _register_and_login(email="stats@example.com")
    resp = client.get("/organizations/me/stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "member_count" in data
    assert "team_count" in data


def test_comments():
    headers = _register_and_login(email="comment@example.com")
    create = client.post("/tasks", json={"task_name": "Comment task"}, headers=headers)
    task_id = create.json()["task_id"]

    # Add comment
    resp = client.post(f"/tasks/{task_id}/comments",
                       json={"content": "Great task!"}, headers=headers)
    assert resp.status_code == 201

    # Get comments
    resp = client.get(f"/tasks/{task_id}/comments")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_reactions():
    headers = _register_and_login(email="react@example.com")
    create = client.post("/tasks", json={"task_name": "React task"}, headers=headers)
    task_id = create.json()["task_id"]

    # Add reaction
    resp = client.post(f"/tasks/{task_id}/reactions",
                       json={"emoji": "fire"}, headers=headers)
    assert resp.status_code == 201

    # Get reactions
    resp = client.get(f"/tasks/{task_id}/reactions", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
