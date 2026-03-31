import os
import re
import json
import uuid
import joblib
import httpx
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import func, case
from dotenv import load_dotenv

from .database import engine, get_db, Base, DATABASE_URL
from .models import (
    Task, User, Organization, Team, TeamMember,
    TaskComment, TaskReaction, TaskMention, Notification,
    ActivityLog, InviteToken,
)
from .schemas import (
    # Auth
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    ChangePasswordRequest, UserResponse, UserUpdate,
    # Org
    OrgCreate, OrgUpdate, OrgResponse, OrgStats,
    # Team
    TeamCreate, TeamUpdate, TeamResponse, TeamDetailResponse,
    TeamMemberResponse, AddMemberRequest, UpdateMemberRoleRequest,
    # Task
    TaskCreate, TaskUpdate, TaskResponse,
    TimePrediction, PrioritySuggestion, SuggestionsResponse,
    # Social
    CommentCreate, CommentUpdate, CommentResponse,
    ReactionCreate, ReactionResponse,
    NotificationResponse, UnreadCountResponse,
    ActivityResponse,
    # Invite
    InviteRequest, InviteResponse,
)
from .auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, get_optional_user,
    require_org_admin, require_superadmin,
)
from .email_service import send_invite_email

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AZURE_ML_ENDPOINT = os.getenv("AZURE_ML_ENDPOINT", "")
AZURE_ML_KEY = os.getenv("AZURE_ML_KEY", "")


def _seed_superadmin(db: Session):
    existing = db.query(User).filter(User.email == "admin@taskoptimizer.com").first()
    if not existing:
        org = Organization(name="TaskOptimizer", slug="taskoptimizer", description="Platform admin org", plan="enterprise")
        db.add(org)
        db.flush()
        admin = User(
            email="admin@taskoptimizer.com",
            password_hash=hash_password("Admin@2024"),
            full_name="Super Admin",
            role="superadmin",
            org_id=org.org_id,
        )
        db.add(admin)
        db.commit()
        logger.info("Seeded superadmin account")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        _seed_superadmin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Smart To-Do Task Optimizer", version="2.0.0", lifespan=lifespan)

origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
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


# ── ML helpers ────────────────────────────────────────────────────────────────

ML_DIR = Path(__file__).resolve().parent.parent.parent / "ml"
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


def _priority_score(priority: str) -> int:
    return {"High": 3, "Medium": 2, "Low": 1}.get(priority, 2)


def call_ml_endpoint(task_data: dict) -> dict:
    """Send POST request to Azure ML endpoint and return prediction results."""
    if not AZURE_ML_ENDPOINT or not AZURE_ML_KEY:
        raise HTTPException(status_code=503, detail="ML endpoint not configured")

    response = httpx.post(
        AZURE_ML_ENDPOINT,
        json=task_data,
        headers={
            "Authorization": f"Bearer {AZURE_ML_KEY}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )

    if response.status_code != 200:
        logger.error("ML endpoint returned %s: %s", response.status_code, response.text)
        raise HTTPException(status_code=502, detail="ML endpoint error")

    data = response.json()
    # Azure ML's run() returns json.dumps(result), so the response may be
    # a JSON string that needs a second parse.
    if isinstance(data, str):
        data = json.loads(data)
    return data


# ── helpers ───────────────────────────────────────────────────────────────────

def _user_task_filter(user: Optional["User"]):
    """Return a SQLAlchemy filter clause scoping tasks to the given user."""
    if user:
        if user.org_id:
            return (Task.org_id == user.org_id) | ((Task.org_id == None) & (Task.user_id == user.user_id))
        return Task.user_id == user.user_id
    return (Task.user_id == None) & (Task.org_id == None)


def _hours_until_deadline(deadline: Optional[datetime]) -> float:
    if deadline is None:
        return 168.0
    now = datetime.now(timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return (deadline - now).total_seconds() / 3600


def _log_activity(db: Session, user: User, action: str, entity_type: str = None,
                  entity_id: int = None, metadata: dict = None, team_id: int = None):
    log = ActivityLog(
        org_id=user.org_id,
        team_id=team_id,
        user_id=user.user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata,
    )
    db.add(log)


def _create_notification(db: Session, user_id: int, type: str, title: str,
                         message: str = None, task_id: int = None):
    notif = Notification(
        user_id=user_id, type=type, title=title,
        message=message, task_id=task_id,
    )
    db.add(notif)


def _build_activity(log: ActivityLog) -> dict:
    return {
        "log_id": log.log_id, "user_id": log.user_id, "action": log.action,
        "entity_type": log.entity_type, "entity_id": log.entity_id,
        "metadata_json": log.metadata_json, "created_at": log.created_at,
        "user_name": log.user.full_name if log.user else None,
    }


def _build_task_response(task: Task, db: Session, current_user_id: int = None,
                         comment_counts: dict = None, reaction_counts: dict = None) -> dict:
    data = {
        "task_id": task.task_id,
        "task_name": task.task_name,
        "priority": task.priority,
        "deadline": task.deadline,
        "estimated_time": task.estimated_time,
        "actual_time": task.actual_time,
        "status": task.status,
        "category": task.category,
        "description": task.description,
        "created_at": task.created_at,
        "user_id": task.user_id,
        "assigned_to": task.assigned_to,
        "team_id": task.team_id,
        "org_id": task.org_id,
        "depends_on_id": task.depends_on_id,
        "is_archived": task.is_archived or False,
        "creator_name": task.creator.full_name if task.creator else None,
        "assignee_name": task.assignee.full_name if task.assignee else None,
    }
    # Use pre-fetched counts if available, otherwise query (single-task endpoints)
    if comment_counts is not None:
        data["comment_count"] = comment_counts.get(task.task_id, 0)
    else:
        data["comment_count"] = db.query(func.count(TaskComment.comment_id)).filter(TaskComment.task_id == task.task_id).scalar() or 0
    if reaction_counts is not None:
        data["reaction_counts"] = reaction_counts.get(task.task_id, {})
    else:
        reactions = db.query(TaskReaction.emoji, func.count(TaskReaction.reaction_id)).filter(
            TaskReaction.task_id == task.task_id
        ).group_by(TaskReaction.emoji).all()
        data["reaction_counts"] = {emoji: count for emoji, count in reactions}
    return data


def _batch_task_counts(db: Session, task_ids: list) -> tuple:
    """Pre-fetch comment counts and reaction counts for a list of tasks in 2 queries."""
    if not task_ids:
        return {}, {}
    # Comment counts: one query
    cc_rows = db.query(
        TaskComment.task_id, func.count(TaskComment.comment_id)
    ).filter(TaskComment.task_id.in_(task_ids)).group_by(TaskComment.task_id).all()
    comment_counts = {tid: cnt for tid, cnt in cc_rows}
    # Reaction counts: one query
    rc_rows = db.query(
        TaskReaction.task_id, TaskReaction.emoji, func.count(TaskReaction.reaction_id)
    ).filter(TaskReaction.task_id.in_(task_ids)).group_by(
        TaskReaction.task_id, TaskReaction.emoji
    ).all()
    reaction_counts: dict = {}
    for tid, emoji, cnt in rc_rows:
        reaction_counts.setdefault(tid, {})[emoji] = cnt
    return comment_counts, reaction_counts


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = None
    if req.invite_token:
        invite = db.query(InviteToken).filter(
            InviteToken.token == req.invite_token, InviteToken.is_used == False
        ).first()
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or expired invite token")
        org = db.query(Organization).filter(Organization.org_id == invite.org_id).first()
        invite.is_used = True
        team_id_from_invite = invite.team_id
    elif req.org_name:
        slug = re.sub(r'[^a-z0-9]+', '-', req.org_name.lower()).strip('-')
        if db.query(Organization).filter(Organization.slug == slug).first():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        org = Organization(name=req.org_name, slug=slug)
        db.add(org)
        db.flush()
        team_id_from_invite = None
    else:
        team_id_from_invite = None

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="admin" if (org and not req.invite_token) else "member",
        org_id=org.org_id if org else None,
    )
    db.add(user)
    db.flush()

    if req.invite_token and team_id_from_invite:
        db.add(TeamMember(team_id=team_id_from_invite, user_id=user.user_id, role="member"))

    if org and not req.invite_token:
        # Auto-create a default team
        team = Team(org_id=org.org_id, name="General", description="Default team", created_by=user.user_id)
        db.add(team)
        db.flush()
        db.add(TeamMember(team_id=team.team_id, user_id=user.user_id, role="owner"))

    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.user_id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


@app.post("/auth/logout")
def logout():
    return {"detail": "Logged out"}


@app.get("/auth/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user


@app.put("/auth/me", response_model=UserResponse)
def update_me(req: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"detail": "Password changed"}


@app.post("/auth/accept-invite/{token}", response_model=TokenResponse)
def accept_invite(token: str, req: RegisterRequest, db: Session = Depends(get_db)):
    req.invite_token = token
    return register(req, db)


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS (superadmin only)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/organizations", response_model=List[OrgResponse])
def admin_list_orgs(user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return db.query(Organization).all()


@app.post("/admin/organizations", response_model=OrgResponse, status_code=201)
def admin_create_org(req: OrgCreate, user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    if db.query(Organization).filter(Organization.slug == req.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    org = Organization(**req.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@app.get("/admin/stats")
def admin_stats(user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return {
        "total_orgs": db.query(func.count(Organization.org_id)).scalar(),
        "total_users": db.query(func.count(User.user_id)).scalar(),
        "total_tasks": db.query(func.count(Task.task_id)).scalar(),
        "total_teams": db.query(func.count(Team.team_id)).scalar(),
    }


@app.get("/admin/users", response_model=List[UserResponse])
def admin_list_users(user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return db.query(User).all()


# ══════════════════════════════════════════════════════════════════════════════
#  ORGANIZATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/organizations/me", response_model=OrgResponse)
def get_my_org(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.org_id:
        raise HTTPException(status_code=404, detail="No organization")
    org = db.query(Organization).filter(Organization.org_id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@app.put("/organizations/me", response_model=OrgResponse)
def update_my_org(req: OrgUpdate, user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.org_id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org


@app.get("/organizations/me/stats", response_model=OrgStats)
def get_org_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.org_id:
        raise HTTPException(status_code=404, detail="No organization")
    oid = user.org_id
    # Single query for task stats
    task_stats = db.query(
        func.count(Task.task_id),
        func.count(case((Task.status == "Completed", 1))),
    ).filter(Task.org_id == oid).first()
    return OrgStats(
        member_count=db.query(func.count(User.user_id)).filter(User.org_id == oid).scalar(),
        team_count=db.query(func.count(Team.team_id)).filter(Team.org_id == oid).scalar(),
        task_count=task_stats[0] or 0,
        completed_count=task_stats[1] or 0,
    )


@app.get("/organizations/me/members", response_model=List[UserResponse])
def get_org_members(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.org_id:
        raise HTTPException(status_code=404, detail="No organization")
    return db.query(User).filter(User.org_id == user.org_id).all()


@app.post("/organizations/me/invite", response_model=InviteResponse)
def invite_member(req: InviteRequest, user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    token_str = uuid.uuid4().hex
    invite = InviteToken(
        token=token_str, org_id=user.org_id,
        team_id=req.team_id, email=req.email,
        created_by=user.user_id,
    )
    db.add(invite)
    db.commit()
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return InviteResponse(token=token_str, invite_url=f"{base_url}/accept-invite/{token_str}")


@app.get("/organizations/me/activity", response_model=List[ActivityResponse])
def get_org_activity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, le=200),
):
    if not user.org_id:
        return []
    logs = db.query(ActivityLog).options(joinedload(ActivityLog.user)).filter(
        ActivityLog.org_id == user.org_id
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [_build_activity(log) for log in logs]


# ══════════════════════════════════════════════════════════════════════════════
#  TEAM ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/teams", response_model=List[TeamResponse])
def list_teams(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.org_id:
        return []
    teams = db.query(Team).filter(Team.org_id == user.org_id).all()
    if not teams:
        return []
    team_ids = [t.team_id for t in teams]
    # Batch member counts
    mc_rows = db.query(
        TeamMember.team_id, func.count(TeamMember.id)
    ).filter(TeamMember.team_id.in_(team_ids)).group_by(TeamMember.team_id).all()
    member_counts = {tid: cnt for tid, cnt in mc_rows}
    # Batch task counts
    tc_rows = db.query(
        Task.team_id, func.count(Task.task_id)
    ).filter(Task.team_id.in_(team_ids)).group_by(Task.team_id).all()
    task_counts = {tid: cnt for tid, cnt in tc_rows}
    return [
        {
            **{c.name: getattr(t, c.name) for c in t.__table__.columns},
            "member_count": member_counts.get(t.team_id, 0),
            "task_count": task_counts.get(t.team_id, 0),
        }
        for t in teams
    ]


@app.post("/teams", response_model=TeamResponse, status_code=201)
def create_team(req: TeamCreate, user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    team = Team(**req.model_dump(), org_id=user.org_id, created_by=user.user_id)
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.team_id, user_id=user.user_id, role="owner"))
    _log_activity(db, user, "team_created", "team", team.team_id, {"name": team.name}, team.team_id)
    db.commit()
    db.refresh(team)
    return {
        **{c.name: getattr(team, c.name) for c in team.__table__.columns},
        "member_count": 1, "task_count": 0,
    }


@app.get("/teams/{team_id}", response_model=TeamDetailResponse)
def get_team(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.org_id != user.org_id and user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied")
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    user_ids = [m.user_id for m in members]
    users_by_id = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    member_list = [
        {"id": m.id, "user_id": m.user_id, "role": m.role, "joined_at": m.joined_at,
         "user": users_by_id.get(m.user_id)}
        for m in members
    ]
    return {
        **{c.name: getattr(team, c.name) for c in team.__table__.columns},
        "member_count": len(members),
        "task_count": db.query(func.count(Task.task_id)).filter(Task.team_id == team_id).scalar(),
        "members": member_list,
    }


@app.put("/teams/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, req: TeamUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check permission: org admin or team owner
    if user.role not in ("superadmin", "admin"):
        membership = db.query(TeamMember).filter(
            TeamMember.team_id == team_id, TeamMember.user_id == user.user_id
        ).first()
        if not membership or membership.role != "owner":
            raise HTTPException(status_code=403, detail="Permission denied")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return {
        **{c.name: getattr(team, c.name) for c in team.__table__.columns},
        "member_count": db.query(func.count(TeamMember.id)).filter(TeamMember.team_id == team_id).scalar(),
        "task_count": db.query(func.count(Task.task_id)).filter(Task.team_id == team_id).scalar(),
    }


@app.delete("/teams/{team_id}")
def delete_team(team_id: int, user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == team_id, Team.org_id == user.org_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()
    return {"detail": "Team deleted"}


@app.post("/teams/{team_id}/members")
def add_team_member(team_id: int, req: AddMemberRequest, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    org = db.query(Organization).filter(Organization.org_id == team.org_id).first()
    target = db.query(User).filter(User.email == req.email).first()

    if not target:
        # User doesn't exist — send invite email instead
        token_str = uuid.uuid4().hex
        invite = InviteToken(
            token=token_str, org_id=team.org_id,
            team_id=team_id, email=req.email,
            created_by=user.user_id,
        )
        db.add(invite)
        _log_activity(db, user, "invite_sent", "team", team_id,
                      {"email": req.email}, team_id)
        db.commit()
        org_name = org.name if org else "your organization"
        sent = send_invite_email(
            to_email=req.email,
            inviter_name=user.full_name,
            org_name=org_name,
            team_name=team.name,
            invite_token=token_str,
        )
        if sent:
            return JSONResponse(
                status_code=201,
                content={"detail": "invite_sent", "email": req.email},
            )
        else:
            return JSONResponse(
                status_code=201,
                content={"detail": "invite_created", "email": req.email,
                         "message": "Invite created but email delivery failed. Share the link manually."},
            )

    # User exists — add directly
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == target.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    member = TeamMember(team_id=team_id, user_id=target.user_id, role=req.role)
    db.add(member)
    _create_notification(db, target.user_id, "assignment",
                         f"You were added to team {team.name}",
                         f"Added by {user.full_name}")
    _log_activity(db, user, "member_added", "team", team_id,
                  {"member": target.full_name}, team_id)
    db.commit()
    db.refresh(member)
    return {"id": member.id, "user_id": member.user_id, "role": member.role,
            "joined_at": member.joined_at, "user": target}


@app.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(team_id: int, user_id: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"detail": "Member removed"}


@app.put("/teams/{team_id}/members/{user_id}/role")
def update_member_role(team_id: int, user_id: int, req: UpdateMemberRoleRequest,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = req.role
    db.commit()
    return {"detail": "Role updated"}


@app.get("/teams/{team_id}/activity", response_model=List[ActivityResponse])
def get_team_activity(team_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db), limit: int = Query(50, le=200)):
    logs = db.query(ActivityLog).options(joinedload(ActivityLog.user)).filter(
        ActivityLog.team_id == team_id
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [_build_activity(log) for log in logs]


# ══════════════════════════════════════════════════════════════════════════════
#  TASK ENDPOINTS (protected)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db),
                user: User = Depends(get_optional_user)):
    data = task.model_dump()
    if user:
        data["user_id"] = user.user_id
        data["org_id"] = user.org_id
    db_task = Task(**data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    if user:
        _log_activity(db, user, "task_created", "task", db_task.task_id,
                      {"name": db_task.task_name}, db_task.team_id)
        # Notify assignee
        if db_task.assigned_to and db_task.assigned_to != user.user_id:
            _create_notification(db, db_task.assigned_to, "assignment",
                                 f"New task assigned: {db_task.task_name}",
                                 f"Assigned by {user.full_name}", db_task.task_id)
        db.commit()

    return _build_task_response(db_task, db, user.user_id if user else None)


@app.get("/tasks", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db), user: User = Depends(get_optional_user),
              team_id: Optional[int] = Query(None),
              assigned_to: Optional[int] = Query(None),
              status: Optional[str] = Query(None),
              archived: bool = Query(False)):
    import time as _t
    _t0 = _t.time()
    q = db.query(Task).options(
        joinedload(Task.creator), joinedload(Task.assignee)
    ).filter(_user_task_filter(user))

    if team_id:
        q = q.filter(Task.team_id == team_id)
    if assigned_to:
        q = q.filter(Task.assigned_to == assigned_to)
    if status:
        q = q.filter(Task.status == status)
    if not archived:
        q = q.filter((Task.is_archived == False) | (Task.is_archived == None))

    tasks = q.order_by(Task.created_at.desc()).all()
    logger.info("PERF tasks query: %.2fs, count=%d", _t.time()-_t0, len(tasks))
    _t1 = _t.time()
    task_ids = [t.task_id for t in tasks]
    comment_counts, reaction_counts = _batch_task_counts(db, task_ids)
    logger.info("PERF batch counts: %.2fs", _t.time()-_t1)
    _t2 = _t.time()
    result = [_build_task_response(t, db, user.user_id if user else None,
                                 comment_counts, reaction_counts) for t in tasks]
    logger.info("PERF build responses: %.2fs, TOTAL: %.2fs", _t.time()-_t2, _t.time()-_t0)
    return result


@app.get("/tasks/suggestions", response_model=SuggestionsResponse)
def get_suggestions(db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    q = db.query(Task).filter(Task.status != "Completed", _user_task_filter(user))
    tasks = q.all()

    scored: List[PrioritySuggestion] = []
    model = _get_model("priority_model.pkl")
    for t in tasks:
        hours_left = _hours_until_deadline(t.deadline)

        # Use local model first (fast), Azure ML only for single-task predict-time
        if model:
            try:
                features = [[_priority_score(t.priority), t.estimated_time or 1, hours_left]]
                pred = model.predict(features)[0]
                suggested = {3: "High", 2: "Medium", 1: "Low"}.get(int(pred), t.priority)
            except Exception:
                suggested = t.priority
        elif t.deadline:
            suggested = "High" if hours_left < 24 else "Medium" if hours_left < 72 else t.priority
        else:
            suggested = t.priority

        if suggested != t.priority:
            reason = "Deadline approaching soon" if suggested == "High" else "Adjusted based on workload patterns"
            scored.append(PrioritySuggestion(
                task_id=t.task_id, task_name=t.task_name,
                suggested_priority=suggested,
                reason=reason,
                predicted_time=t.estimated_time or 1.0,
                confidence=0.7, do_this="",
            ))

    scored.sort(key=lambda s: s.confidence, reverse=True)
    top = scored[:5]
    ordinals = ["first", "second", "third", "fourth", "fifth"]
    for i, s in enumerate(top):
        s.do_this = ordinals[i]

    return SuggestionsResponse(suggestions=top)


@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user and task.user_id and task.user_id != user.user_id:
        if not (user.org_id and task.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied")
    return _build_task_response(task, db, user.user_id if user else None)


@app.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db),
                user: User = Depends(get_optional_user)):
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user and db_task.user_id and db_task.user_id != user.user_id:
        if not (user.org_id and db_task.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied")

    old_status = db_task.status
    old_assigned = db_task.assigned_to

    for field, value in task.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)

    if user:
        if old_status != db_task.status:
            _log_activity(db, user, "task_status_changed", "task", task_id,
                          {"from": old_status, "to": db_task.status}, db_task.team_id)
            if db_task.status == "Completed":
                _log_activity(db, user, "task_completed", "task", task_id,
                              {"name": db_task.task_name}, db_task.team_id)
        if db_task.assigned_to and db_task.assigned_to != old_assigned and db_task.assigned_to != user.user_id:
            _create_notification(db, db_task.assigned_to, "assignment",
                                 f"Task assigned: {db_task.task_name}",
                                 f"Assigned by {user.full_name}", task_id)
        db.commit()

    return _build_task_response(db_task, db, user.user_id if user else None)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user and db_task.user_id and db_task.user_id != user.user_id:
        if not (user.org_id and db_task.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied")
    db.delete(db_task)
    db.commit()
    return {"detail": "Task deleted"}


@app.post("/tasks/bulk-assign")
def bulk_assign(task_ids: List[int], assigned_to: int,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for tid in task_ids:
        task = db.query(Task).filter(Task.task_id == tid).first()
        if task:
            task.assigned_to = assigned_to
    if assigned_to != user.user_id:
        target = db.query(User).filter(User.user_id == assigned_to).first()
        if target:
            _create_notification(db, assigned_to, "assignment",
                                 f"{len(task_ids)} tasks assigned to you",
                                 f"Assigned by {user.full_name}")
    db.commit()
    return {"detail": f"{len(task_ids)} tasks assigned"}


@app.post("/tasks/{task_id}/duplicate", response_model=TaskResponse)
def duplicate_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    original = db.query(Task).filter(Task.task_id == task_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Task not found")
    new_task = Task(
        task_name=f"{original.task_name} (copy)",
        priority=original.priority,
        deadline=original.deadline,
        estimated_time=original.estimated_time,
        category=original.category,
        description=original.description,
        user_id=user.user_id,
        team_id=original.team_id,
        org_id=user.org_id,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return _build_task_response(new_task, db, user.user_id)


@app.get("/tasks/{task_id}/predict-time", response_model=TimePrediction)
def predict_time(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_data = {
        "priority": task.priority,
        "category": task.category or "General",
        "deadline_gap": _hours_until_deadline(task.deadline),
        "estimated_time": task.estimated_time or 1.0,
    }

    try:
        result = call_ml_endpoint(task_data)
        return TimePrediction(
            task_id=task.task_id,
            task_name=task.task_name,
            predicted_time=result["predicted_completion_time"],
            confidence=result.get("confidence", 0.0),
            your_estimate=task.estimated_time,
            recommendation=result["recommendation"],
        )
    except Exception:
        # Fallback to local model or estimate
        model = _get_model("completion_model.pkl")
        if model:
            try:
                deadline_gap = _hours_until_deadline(task.deadline)
                features = [[_priority_score(task.priority), task.estimated_time or 1, deadline_gap]]
                predicted = float(model.predict(features)[0])
                return TimePrediction(
                    task_id=task.task_id, task_name=task.task_name,
                    predicted_time=round(predicted, 2), confidence=0.85,
                    your_estimate=task.estimated_time, recommendation="Based on local ML model",
                )
            except Exception as e:
                logger.warning("Local ML prediction failed for task %s: %s", task.task_id, e)
        return TimePrediction(
            task_id=task.task_id, task_name=task.task_name,
            predicted_time=task.estimated_time or 1.0, confidence=0.5,
            your_estimate=task.estimated_time, recommendation="Based on your estimate",
        )


# ══════════════════════════════════════════════════════════════════════════════
#  COMMENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/tasks/{task_id}/comments", response_model=List[CommentResponse])
def get_comments(task_id: int, db: Session = Depends(get_db)):
    comments = db.query(TaskComment).filter(
        TaskComment.task_id == task_id, TaskComment.parent_id == None
    ).order_by(TaskComment.created_at.asc()).all()

    def build_comment(c: TaskComment) -> dict:
        replies = db.query(TaskComment).filter(TaskComment.parent_id == c.comment_id).order_by(TaskComment.created_at.asc()).all()
        return {
            "comment_id": c.comment_id, "task_id": c.task_id, "user_id": c.user_id,
            "content": c.content, "created_at": c.created_at, "updated_at": c.updated_at,
            "parent_id": c.parent_id,
            "user_name": c.user.full_name if c.user else None,
            "user_avatar": c.user.avatar_url if c.user else None,
            "replies": [build_comment(r) for r in replies],
        }
    return [build_comment(c) for c in comments]


@app.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(task_id: int, req: CommentCreate, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(task_id=task_id, user_id=user.user_id,
                          content=req.content, parent_id=req.parent_id)
    db.add(comment)
    db.flush()

    # Parse @mentions
    mentions = re.findall(r'@(\S+)', req.content)
    for mention_name in mentions:
        mentioned = db.query(User).filter(User.full_name.ilike(f"%{mention_name}%")).first()
        if mentioned and mentioned.user_id != user.user_id:
            db.add(TaskMention(
                task_id=task_id, mentioned_user_id=mentioned.user_id,
                mentioned_by_id=user.user_id,
            ))
            _create_notification(db, mentioned.user_id, "mention",
                                 f"{user.full_name} mentioned you",
                                 req.content[:100], task_id)

    # Notify task creator/assignee about comment
    notify_ids = set()
    if task.user_id and task.user_id != user.user_id:
        notify_ids.add(task.user_id)
    if task.assigned_to and task.assigned_to != user.user_id:
        notify_ids.add(task.assigned_to)
    for nid in notify_ids:
        _create_notification(db, nid, "comment",
                             f"{user.full_name} commented on {task.task_name}",
                             req.content[:100], task_id)

    _log_activity(db, user, "commented", "task", task_id,
                  {"content": req.content[:50]}, task.team_id)
    db.commit()
    db.refresh(comment)

    return {
        "comment_id": comment.comment_id, "task_id": comment.task_id,
        "user_id": comment.user_id, "content": comment.content,
        "created_at": comment.created_at, "updated_at": comment.updated_at,
        "parent_id": comment.parent_id,
        "user_name": user.full_name, "user_avatar": user.avatar_url,
        "replies": [],
    }


@app.put("/tasks/{task_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(task_id: int, comment_id: int, req: CommentUpdate,
                   db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    comment = db.query(TaskComment).filter(
        TaskComment.comment_id == comment_id, TaskComment.task_id == task_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.user_id and user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Cannot edit this comment")
    comment.content = req.content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return {
        "comment_id": comment.comment_id, "task_id": comment.task_id,
        "user_id": comment.user_id, "content": comment.content,
        "created_at": comment.created_at, "updated_at": comment.updated_at,
        "parent_id": comment.parent_id,
        "user_name": user.full_name, "user_avatar": user.avatar_url,
        "replies": [],
    }


@app.delete("/tasks/{task_id}/comments/{comment_id}")
def delete_comment(task_id: int, comment_id: int, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    comment = db.query(TaskComment).filter(
        TaskComment.comment_id == comment_id, TaskComment.task_id == task_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.user_id and user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Cannot delete this comment")
    db.delete(comment)
    db.commit()
    return {"detail": "Comment deleted"}


# ══════════════════════════════════════════════════════════════════════════════
#  REACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/tasks/{task_id}/reactions", response_model=List[ReactionResponse])
def get_reactions(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    reactions = db.query(TaskReaction).filter(TaskReaction.task_id == task_id).all()
    # Batch-fetch all user names in one query
    user_ids = {r.user_id for r in reactions}
    users_by_id = {u.user_id: u.full_name for u in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    current_uid = user.user_id if user else -1

    emoji_map: Dict[str, list] = {}
    for r in reactions:
        emoji_map.setdefault(r.emoji, []).append(r)
    return [
        ReactionResponse(
            emoji=emoji, count=len(items),
            users=[users_by_id[r.user_id] for r in items if r.user_id in users_by_id],
            reacted_by_me=any(r.user_id == current_uid for r in items),
        )
        for emoji, items in emoji_map.items()
    ]


@app.post("/tasks/{task_id}/reactions", status_code=201)
def add_reaction(task_id: int, req: ReactionCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = db.query(TaskReaction).filter(
        TaskReaction.task_id == task_id, TaskReaction.user_id == user.user_id,
        TaskReaction.emoji == req.emoji,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already reacted")
    reaction = TaskReaction(task_id=task_id, user_id=user.user_id, emoji=req.emoji)
    db.add(reaction)

    if task.user_id and task.user_id != user.user_id:
        _create_notification(db, task.user_id, "reaction",
                             f"{user.full_name} reacted {req.emoji}",
                             task.task_name, task_id)
    db.commit()
    return {"detail": "Reaction added"}


@app.delete("/tasks/{task_id}/reactions/{emoji}")
def remove_reaction(task_id: int, emoji: str, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    reaction = db.query(TaskReaction).filter(
        TaskReaction.task_id == task_id, TaskReaction.user_id == user.user_id,
        TaskReaction.emoji == emoji,
    ).first()
    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")
    db.delete(reaction)
    db.commit()
    return {"detail": "Reaction removed"}


# ══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db),
                      limit: int = Query(50, le=200)):
    return db.query(Notification).filter(
        Notification.user_id == user.user_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()


@app.get("/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(func.count(Notification.notification_id)).filter(
        Notification.user_id == user.user_id, Notification.is_read == False
    ).scalar()
    return UnreadCountResponse(count=count or 0)


@app.put("/notifications/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id, Notification.user_id == user.user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"detail": "Marked as read"}


@app.put("/notifications/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user.user_id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"detail": "All marked as read"}


# ══════════════════════════════════════════════════════════════════════════════
#  WORKLOAD & ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/teams/{team_id}/workload")
def get_team_workload(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    user_ids = [m.user_id for m in members]
    if not user_ids:
        return []

    users_by_id = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}

    # Batch query: get counts for all members in 2 queries instead of 3*N
    stats = db.query(
        Task.assigned_to,
        func.count(case((Task.status != "Completed", 1))).label("pending"),
        func.count(case((Task.status == "Completed", 1))).label("completed"),
        func.sum(case((Task.status != "Completed", Task.estimated_time), else_=0)).label("est"),
    ).filter(
        Task.assigned_to.in_(user_ids)
    ).group_by(Task.assigned_to).all()

    stats_map = {s[0]: {"pending": s.pending, "completed": s.completed, "est": s.est or 0} for s in stats}

    return [
        {
            "user_id": m.user_id,
            "full_name": users_by_id[m.user_id].full_name if m.user_id in users_by_id else "Unknown",
            "avatar_url": users_by_id[m.user_id].avatar_url if m.user_id in users_by_id else None,
            "pending_tasks": stats_map.get(m.user_id, {}).get("pending", 0),
            "completed_tasks": stats_map.get(m.user_id, {}).get("completed", 0),
            "total_estimated_hours": round(float(stats_map.get(m.user_id, {}).get("est", 0)), 1),
        }
        for m in members
    ]


@app.get("/ai/weekly-digest")
def weekly_digest(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    q = db.query(Task).filter(_user_task_filter(user))

    completed_this_week = q.filter(Task.status == "Completed", Task.created_at >= week_ago).count()
    created_this_week = q.filter(Task.created_at >= week_ago).count()
    pending = q.filter(Task.status != "Completed").count()

    overdue = q.filter(
        Task.deadline != None, Task.deadline < datetime.now(timezone.utc),
        Task.status != "Completed"
    ).count()

    # Top contributors
    contributors = db.query(
        User.full_name, func.count(Task.task_id).label("count")
    ).join(Task, Task.assigned_to == User.user_id).filter(
        Task.status == "Completed", Task.created_at >= week_ago,
        _user_task_filter(user),
    ).group_by(User.full_name).order_by(func.count(Task.task_id).desc()).limit(3).all()

    return {
        "period": "Last 7 days",
        "completed": completed_this_week,
        "created": created_this_week,
        "pending": pending,
        "overdue": overdue,
        "top_contributors": [{"name": c[0], "completed": c[1]} for c in contributors],
        "insights": [
            f"{completed_this_week} tasks completed this week" if completed_this_week > 0 else "No tasks completed this week",
            f"{overdue} overdue tasks need attention" if overdue > 0 else "No overdue tasks!",
            f"{pending} tasks still in progress" if pending > 0 else "All caught up!",
        ],
    }


# ══════════════════════════════════════════════════════════════════════════════
#  DEBUG
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/dashboard")
def dashboard_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Combined endpoint: returns tasks, suggestions, and digest in one call."""
    # Tasks - eager load relationships
    q = db.query(Task).options(
        joinedload(Task.creator), joinedload(Task.assignee)
    ).filter(_user_task_filter(user))
    all_tasks = q.order_by(Task.created_at.desc()).all()
    # Batch-fetch counts in 2 queries instead of 2*N
    task_ids = [t.task_id for t in all_tasks]
    comment_counts, reaction_counts = _batch_task_counts(db, task_ids)
    tasks_data = [_build_task_response(t, db, user.user_id, comment_counts, reaction_counts) for t in all_tasks]

    # Suggestions (inline, skip Azure ML for speed — use local model only)
    pending_tasks = [t for t in all_tasks if t.status != "Completed"]
    scored: List[PrioritySuggestion] = []
    model = _get_model("priority_model.pkl")
    for t in pending_tasks:
        hours_left = _hours_until_deadline(t.deadline)
        if model:
            try:
                features = [[_priority_score(t.priority), t.estimated_time or 1, hours_left]]
                pred = model.predict(features)[0]
                suggested = {3: "High", 2: "Medium", 1: "Low"}.get(int(pred), t.priority)
            except Exception:
                suggested = t.priority
        elif t.deadline:
            suggested = "High" if hours_left < 24 else "Medium" if hours_left < 72 else t.priority
        else:
            suggested = t.priority
        if suggested != t.priority:
            reason = "Deadline approaching soon" if suggested == "High" else "Adjusted based on workload patterns"
            scored.append(PrioritySuggestion(
                task_id=t.task_id, task_name=t.task_name,
                suggested_priority=suggested, reason=reason,
                predicted_time=t.estimated_time or 1.0, confidence=0.7, do_this="",
            ))
    scored.sort(key=lambda s: s.confidence, reverse=True)
    top = scored[:5]
    ordinals = ["first", "second", "third", "fourth", "fifth"]
    for i, s in enumerate(top):
        s.do_this = ordinals[i]

    # Weekly digest (inline) — use naive datetime for SQLite compatibility
    now_naive = datetime.utcnow()
    week_ago = now_naive - timedelta(days=7)
    def _ts(dt):
        """Strip timezone info for safe comparison with SQLite naive datetimes."""
        return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt
    completed_this_week = sum(1 for t in all_tasks if t.status == "Completed" and t.created_at and _ts(t.created_at) >= week_ago)
    created_this_week = sum(1 for t in all_tasks if t.created_at and _ts(t.created_at) >= week_ago)
    pending_count = sum(1 for t in all_tasks if t.status != "Completed")
    overdue_count = sum(1 for t in all_tasks if t.deadline and t.status != "Completed" and _ts(t.deadline) < now_naive)

    contributors = db.query(
        User.full_name, func.count(Task.task_id).label("count")
    ).join(Task, Task.assigned_to == User.user_id).filter(
        Task.status == "Completed", Task.created_at >= week_ago,
        _user_task_filter(user),
    ).group_by(User.full_name).order_by(func.count(Task.task_id).desc()).limit(3).all()

    insights = []
    if completed_this_week > 0:
        insights.append(f"{completed_this_week} tasks completed this week")
    else:
        insights.append("No tasks completed this week")
    if overdue_count > 0:
        insights.append(f"{overdue_count} overdue tasks need attention")
    else:
        insights.append("No overdue tasks!")
    if pending_count > 0:
        insights.append(f"{pending_count} tasks still in progress")
    else:
        insights.append("All caught up!")

    return {
        "tasks": tasks_data,
        "suggestions": [s.model_dump() for s in top],
        "digest": {
            "period": "Last 7 days",
            "completed": completed_this_week,
            "created": created_this_week,
            "pending": pending_count,
            "overdue": overdue_count,
            "top_contributors": [{"name": c[0], "completed": c[1]} for c in contributors],
            "insights": insights,
        },
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for monitoring and load balancers."""
    status = {"status": "healthy", "version": app.version, "timestamp": datetime.now(timezone.utc).isoformat()}
    try:
        db.execute(func.now() if engine.dialect.name != "sqlite" else func.date("now"))
        status["database"] = "connected"
    except Exception:
        status["status"] = "degraded"
        status["database"] = "disconnected"
    return status


@app.get("/debug/db-info")
def debug_db_info():
    try:
        host = DATABASE_URL.split("@")[-1].split("/")[0] if "@" in DATABASE_URL else "local"
        db_name = DATABASE_URL.split("/")[-1].split("?")[0]
        dialect = engine.dialect.name
        return {"engine_host": host, "engine_db": db_name, "dialect": dialect}
    except Exception as e:
        return {"error": str(e)}
