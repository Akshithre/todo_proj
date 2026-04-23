from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
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


# ── Organizations ────────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    org_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    logo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    plan = Column(String(20), default="free")  # free / pro / enterprise
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    teams = relationship("Team", back_populates="organization", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization")
    tasks = relationship("Task", back_populates="organization")
    activity_logs = relationship("ActivityLog", back_populates="organization", cascade="all, delete-orphan")


# ── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(20), default="member")  # superadmin / admin / member
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="users")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    created_tasks = relationship("Task", back_populates="creator", foreign_keys="Task.user_id")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    comments = relationship("TaskComment", back_populates="user", cascade="all, delete-orphan")
    reactions = relationship("TaskReaction", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")


# ── Teams ────────────────────────────────────────────────────────────────────

class Team(Base):
    __tablename__ = "teams"

    team_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6366F1")  # hex
    icon = Column(String(50), default="users")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    organization = relationship("Organization", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="team")
    activity_logs = relationship("ActivityLog", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.team_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    role = Column(String(20), default="member")  # owner / admin / member
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


# ── Tasks (updated) ─────────────────────────────────────────────────────────

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
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # New FK columns
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.team_id"), nullable=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True)

    # Task dependencies
    depends_on_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=True)
    is_archived = Column(Boolean, default=False)

    creator = relationship("User", back_populates="created_tasks", foreign_keys=[user_id])
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to])
    team = relationship("Team", back_populates="tasks")
    organization = relationship("Organization", back_populates="tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    reactions = relationship("TaskReaction", back_populates="task", cascade="all, delete-orphan")
    mentions = relationship("TaskMention", back_populates="task", cascade="all, delete-orphan")


# ── Comments ─────────────────────────────────────────────────────────────────

class TaskComment(Base):
    __tablename__ = "task_comments"

    comment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    parent_id = Column(Integer, ForeignKey("task_comments.comment_id"), nullable=True)

    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")
    replies = relationship("TaskComment", backref="parent", remote_side=[comment_id])


# ── Reactions ────────────────────────────────────────────────────────────────

class TaskReaction(Base):
    __tablename__ = "task_reactions"
    __table_args__ = (
        UniqueConstraint("task_id", "user_id", "emoji", name="uq_task_user_emoji"),
    )

    reaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="reactions")
    user = relationship("User", back_populates="reactions")


# ── Mentions ─────────────────────────────────────────────────────────────────

class TaskMention(Base):
    __tablename__ = "task_mentions"

    mention_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    mentioned_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    mentioned_by_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = Column(Boolean, default=False)

    task = relationship("Task", back_populates="mentions")


# ── Notifications ────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    type = Column(String(30), nullable=False)  # mention/comment/reaction/assignment/deadline
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


# ── Activity Log ─────────────────────────────────────────────────────────────

class ActivityLog(Base):
    __tablename__ = "activity_log"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.team_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="activity_logs")
    team = relationship("Team", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")


# ── Invite Tokens ────────────────────────────────────────────────────────────

class InviteToken(Base):
    __tablename__ = "invite_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.team_id"), nullable=True)
    email = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_used = Column(Boolean, default=False)
