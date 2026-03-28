from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum
from datetime import datetime
import enum
from .database import Base


class PriorityLevel(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TaskStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class Task(Base):
    __tablename__ = "tasks"

    task_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_name = Column(String(255), nullable=False)
    priority = Column(String(10), default=PriorityLevel.MEDIUM.value)
    deadline = Column(DateTime, nullable=True)
    estimated_time = Column(Float, nullable=True)
    actual_time = Column(Float, nullable=True)
    status = Column(String(20), default=TaskStatus.PENDING.value)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
