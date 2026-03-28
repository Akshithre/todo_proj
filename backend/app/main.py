import os
import json
import joblib
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Dict, Optional
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import engine, get_db, Base
from .models import Task
from .schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    TimePrediction, PrioritySuggestion,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Smart To-Do Task Optimizer", version="1.0.0", lifespan=lifespan)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

ML_DIR = Path(__file__).resolve().parent.parent.parent / "ml"

# ── model cache ──────────────────────────────────────────────────────────────

_models: Dict[str, Optional[object]] = {}


def _get_model(name: str):
    if name not in _models:
        path = ML_DIR / name
        if path.exists():
            try:
                _models[name] = joblib.load(path)
                logger.info("Loaded ML model: %s", name)
            except Exception as e:
                logger.error("Failed to load model %s: %s", name, e)
                _models[name] = None
        else:
            _models[name] = None
    return _models[name]


# ── helpers ──────────────────────────────────────────────────────────────────

def _priority_score(priority: str) -> int:
    return {"High": 3, "Medium": 2, "Low": 1}.get(priority, 2)


def _hours_until_deadline(deadline: Optional[datetime]) -> float:
    """Return hours until deadline, handling both naive and aware datetimes."""
    if deadline is None:
        return 168.0  # default 1 week
    now = datetime.now(timezone.utc)
    # If the deadline is naive (no tzinfo), treat it as UTC
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return (deadline - now).total_seconds() / 3600


# ── CRUD endpoints ───────────────────────────────────────────────────────────

@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/tasks", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).order_by(Task.created_at.desc()).all()


@app.get("/tasks/suggestions", response_model=List[PrioritySuggestion])
def get_suggestions(db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.status != "Completed").all()
    model = _get_model("priority_model.pkl")

    suggestions: List[PrioritySuggestion] = []
    for t in tasks:
        if model:
            try:
                deadline_gap = _hours_until_deadline(t.deadline)
                features = [[
                    _priority_score(t.priority),
                    t.estimated_time or 1,
                    deadline_gap,
                ]]
                pred = model.predict(features)[0]
                suggested = {3: "High", 2: "Medium", 1: "Low"}.get(int(pred), t.priority)
            except Exception as e:
                logger.warning("Priority prediction failed for task %s: %s", t.task_id, e)
                suggested = t.priority
        else:
            # Rule-based fallback when no model is available
            hours_left = _hours_until_deadline(t.deadline)
            if t.deadline:
                if hours_left < 24:
                    suggested = "High"
                elif hours_left < 72:
                    suggested = "Medium"
                else:
                    suggested = t.priority
            else:
                suggested = t.priority

        if suggested != t.priority:
            reason = (
                "Deadline approaching soon"
                if suggested == "High"
                else "Adjusted based on workload patterns"
            )
            suggestions.append(PrioritySuggestion(
                task_id=t.task_id,
                task_name=t.task_name,
                current_priority=t.priority,
                suggested_priority=suggested,
                reason=reason,
            ))

    return suggestions


@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in task.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"detail": "Task deleted"}


@app.get("/tasks/{task_id}/predict-time", response_model=TimePrediction)
def predict_time(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    model = _get_model("completion_model.pkl")

    if model:
        try:
            deadline_gap = _hours_until_deadline(task.deadline)
            features = [[
                _priority_score(task.priority),
                task.estimated_time or 1,
                deadline_gap,
            ]]
            predicted = float(model.predict(features)[0])
            return TimePrediction(
                task_id=task.task_id,
                predicted_time=round(predicted, 2),
                confidence=0.85,
            )
        except Exception as e:
            logger.warning("Completion prediction failed for task %s: %s", task.task_id, e)

    # Fallback: return estimated_time with lower confidence
    return TimePrediction(
        task_id=task.task_id,
        predicted_time=task.estimated_time or 1.0,
        confidence=0.5,
    )
