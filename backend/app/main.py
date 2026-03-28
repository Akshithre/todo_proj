import os
import json
import joblib
from datetime import datetime
from typing import List
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import engine, get_db, Base
from .models import Task
from .schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    TimePrediction, PrioritySuggestion,
)

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart To-Do Task Optimizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ML_DIR = Path(__file__).resolve().parent.parent.parent / "ml"


# ── helpers ──────────────────────────────────────────────────────────────────

def _priority_score(priority: str) -> int:
    return {"High": 3, "Medium": 2, "Low": 1}.get(priority, 2)


def _load_model(name: str):
    path = ML_DIR / name
    if path.exists():
        return joblib.load(path)
    return None


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
    model = _load_model("priority_model.pkl")

    suggestions: list[PrioritySuggestion] = []
    for t in tasks:
        if model:
            try:
                deadline_gap = (
                    (t.deadline - datetime.utcnow()).total_seconds() / 3600
                    if t.deadline else 168
                )
                features = [[
                    _priority_score(t.priority),
                    t.estimated_time or 1,
                    deadline_gap,
                ]]
                pred = model.predict(features)[0]
                suggested = {3: "High", 2: "Medium", 1: "Low"}.get(int(pred), t.priority)
            except Exception:
                suggested = t.priority
        else:
            # Rule-based fallback when no model is available
            if t.deadline:
                hours_left = (t.deadline - datetime.utcnow()).total_seconds() / 3600
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

    model = _load_model("completion_model.pkl")

    if model:
        try:
            deadline_gap = (
                (task.deadline - datetime.utcnow()).total_seconds() / 3600
                if task.deadline else 168
            )
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
        except Exception:
            pass

    # Fallback: return estimated_time with lower confidence
    return TimePrediction(
        task_id=task.task_id,
        predicted_time=task.estimated_time or 1.0,
        confidence=0.5,
    )
