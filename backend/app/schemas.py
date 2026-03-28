from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TaskCreate(BaseModel):
    task_name: str
    priority: str = "Medium"
    deadline: Optional[datetime] = None
    estimated_time: Optional[float] = None
    category: Optional[str] = None


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    estimated_time: Optional[float] = None
    actual_time: Optional[float] = None
    status: Optional[str] = None
    category: Optional[str] = None


class TaskResponse(BaseModel):
    task_id: int
    task_name: str
    priority: str
    deadline: Optional[datetime]
    estimated_time: Optional[float]
    actual_time: Optional[float]
    status: str
    category: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TimePrediction(BaseModel):
    task_id: int
    predicted_time: float
    confidence: float


class PrioritySuggestion(BaseModel):
    task_id: int
    task_name: str
    current_priority: str
    suggested_priority: str
    reason: str
