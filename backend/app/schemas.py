from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    org_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    avatar_url: Optional[str]
    role: str
    org_id: Optional[int]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Organization ─────────────────────────────────────────────────────────────

class OrgCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    plan: str = "free"


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    plan: Optional[str] = None


class OrgResponse(BaseModel):
    org_id: int
    name: str
    slug: str
    logo_url: Optional[str]
    description: Optional[str]
    plan: str
    created_at: datetime
    is_active: bool
    model_config = {"from_attributes": True}


class OrgStats(BaseModel):
    member_count: int
    team_count: int
    task_count: int
    completed_count: int


# ── Team ─────────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366F1"
    icon: str = "users"


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    user: Optional[UserResponse] = None
    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    team_id: int
    org_id: int
    name: str
    description: Optional[str]
    color: str
    icon: str
    created_at: datetime
    member_count: int = 0
    task_count: int = 0
    model_config = {"from_attributes": True}


class TeamDetailResponse(TeamResponse):
    members: List[TeamMemberResponse] = []


class AddMemberRequest(BaseModel):
    email: str
    role: str = "member"


class UpdateMemberRoleRequest(BaseModel):
    role: str


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    task_name: str
    priority: str = "Medium"
    deadline: Optional[datetime] = None
    estimated_time: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    team_id: Optional[int] = None
    assigned_to: Optional[int] = None
    depends_on_id: Optional[int] = None


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    estimated_time: Optional[float] = None
    actual_time: Optional[float] = None
    status: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    depends_on_id: Optional[int] = None
    is_archived: Optional[bool] = None


class TaskResponse(BaseModel):
    task_id: int
    task_name: str
    priority: str
    deadline: Optional[datetime]
    estimated_time: Optional[float]
    actual_time: Optional[float]
    status: str
    category: Optional[str]
    description: Optional[str]
    created_at: datetime
    user_id: Optional[int]
    assigned_to: Optional[int]
    team_id: Optional[int]
    org_id: Optional[int]
    depends_on_id: Optional[int]
    is_archived: bool = False
    creator_name: Optional[str] = None
    assignee_name: Optional[str] = None
    comment_count: int = 0
    reaction_counts: dict = {}
    model_config = {"from_attributes": True}


class TimePrediction(BaseModel):
    task_id: int
    task_name: str
    predicted_time: float
    confidence: float = 0.0
    your_estimate: Optional[float]
    recommendation: str


class PrioritySuggestion(BaseModel):
    task_id: int
    task_name: str
    suggested_priority: str
    reason: str
    predicted_time: float
    confidence: float
    do_this: str


class SuggestionsResponse(BaseModel):
    suggestions: list[PrioritySuggestion]


# ── Comments ─────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    comment_id: int
    task_id: int
    user_id: int
    content: str
    created_at: datetime
    updated_at: datetime
    parent_id: Optional[int]
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    replies: List["CommentResponse"] = []
    model_config = {"from_attributes": True}


# ── Reactions ────────────────────────────────────────────────────────────────

class ReactionCreate(BaseModel):
    emoji: str


class ReactionResponse(BaseModel):
    emoji: str
    count: int
    users: List[str] = []
    reacted_by_me: bool = False


# ── Notifications ────────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    type: str
    title: str
    message: Optional[str]
    task_id: Optional[int]
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int


# ── Activity Log ─────────────────────────────────────────────────────────────

class ActivityResponse(BaseModel):
    log_id: int
    user_id: int
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    metadata_json: Optional[dict]
    created_at: datetime
    user_name: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Invite ───────────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    team_id: Optional[int] = None


class InviteResponse(BaseModel):
    token: str
    invite_url: str
