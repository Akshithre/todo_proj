"""
Seed SQLite database with rich demo data.
Compatible with SQLite (no SQL Server bracket syntax).
Run: cd backend && python seed_sqlite.py
"""
import os, sys, random, bcrypt, json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Force SQLite
os.environ["DATABASE_URL"] = "sqlite:///./todo.db"

from app.database import engine, Base, SessionLocal
from app.models import (
    Organization, User, Team, TeamMember, Task,
    TaskComment, TaskReaction, Notification, ActivityLog,
)

# Create all tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()

NOW = datetime.now(timezone.utc)

def dt(days_ago):
    return NOW - timedelta(days=days_ago, hours=random.randint(0,12), minutes=random.randint(0,59))

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()

# ── 1. Create organization ──────────────────────────────────────────────────
print("Creating organization...")
org = db.query(Organization).filter(Organization.slug == "nexuswave").first()
if not org:
    org = Organization(
        name="NexusWave Technologies", slug="nexuswave",
        description="Product development and innovation team",
        plan="pro", created_at=dt(180)
    )
    db.add(org)
    db.flush()
print(f"  Org: {org.name} (id={org.org_id})")

# ── 2. Create superadmin org ────────────────────────────────────────────────
admin_org = db.query(Organization).filter(Organization.slug == "taskoptimizer").first()
if not admin_org:
    admin_org = Organization(
        name="TaskOptimizer", slug="taskoptimizer",
        description="Platform admin org", plan="enterprise"
    )
    db.add(admin_org)
    db.flush()

# Superadmin
superadmin = db.query(User).filter(User.email == "admin@taskoptimizer.com").first()
if not superadmin:
    superadmin = User(
        email="admin@taskoptimizer.com", password_hash=hash_pw("Admin@2024"),
        full_name="Super Admin", role="superadmin", org_id=admin_org.org_id
    )
    db.add(superadmin)
    db.flush()

db.commit()

# ── 3. Create users ─────────────────────────────────────────────────────────
print("Creating users...")
akshith = db.query(User).filter(User.email == "akshith@nexuswave.com").first()
if not akshith:
    akshith = User(
        email="akshith@nexuswave.com", password_hash=hash_pw("Akshith@2024"),
        full_name="Akshith", role="admin", org_id=org.org_id,
        created_at=dt(180), last_login=dt(0)
    )
    db.add(akshith)
    db.flush()
print(f"  Akshith (id={akshith.user_id})")

new_users_data = [
    ("ravi.kumar@gmail.com",   "Ravi Kumar",     "admin",  dt(170)),
    ("meera.shah@gmail.com",   "Meera Shah",     "member", dt(165)),
    ("arjun.reddy@gmail.com",  "Arjun Reddy",    "member", dt(150)),
    ("sneha.patel@gmail.com",  "Sneha Patel",    "member", dt(140)),
    ("vikram.singh@gmail.com", "Vikram Singh",   "member", dt(120)),
    ("ananya.joshi@gmail.com", "Ananya Joshi",   "member", dt(90)),
    ("karthik.m@gmail.com",    "Karthik Menon",  "member", dt(60)),
]

other_users = []
for email, name, role, created in new_users_data:
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            email=email, password_hash=hash_pw(name.split()[0] + "@2026"),
            full_name=name, role=role, org_id=org.org_id,
            created_at=created, last_login=dt(random.randint(0, 3))
        )
        db.add(u)
        db.flush()
    other_users.append(u)
    print(f"  {name} (id={u.user_id})")

db.commit()
all_users = [akshith] + other_users
all_uids = [u.user_id for u in all_users]

# ── 4. Create teams ─────────────────────────────────────────────────────────
print("Creating teams...")
teams_data = [
    ("General",          "General team channel",                          "#6366F1", "users",   dt(178)),
    ("Backend Squad",    "API, database, and server-side development",    "#3B82F6", "code",    dt(175)),
    ("Frontend Crew",    "UI/UX implementation and React development",    "#10B981", "monitor", dt(175)),
    ("DevOps & Infra",   "CI/CD, cloud infrastructure, and monitoring",   "#F59E0B", "server",  dt(170)),
    ("Product & Design", "Product strategy, UX research, and design",     "#EC4899", "palette", dt(160)),
    ("QA & Testing",     "Quality assurance and test automation",         "#8B5CF6", "shield",  dt(140)),
]

teams = {}
for tname, desc, color, icon, created in teams_data:
    t = db.query(Team).filter(Team.org_id == org.org_id, Team.name == tname).first()
    if not t:
        t = Team(org_id=org.org_id, name=tname, description=desc, color=color, icon=icon,
                 created_at=created, created_by=akshith.user_id)
        db.add(t)
        db.flush()
    teams[tname] = t
    print(f"  {tname} (id={t.team_id})")

db.commit()

# ── 5. Add team members ─────────────────────────────────────────────────────
print("Adding team members...")
# Akshith owns all teams
for t in teams.values():
    existing = db.query(TeamMember).filter(TeamMember.team_id == t.team_id, TeamMember.user_id == akshith.user_id).first()
    if not existing:
        db.add(TeamMember(team_id=t.team_id, user_id=akshith.user_id, role="owner", joined_at=dt(175)))

# Add others to General
for u in other_users:
    existing = db.query(TeamMember).filter(TeamMember.team_id == teams["General"].team_id, TeamMember.user_id == u.user_id).first()
    if not existing:
        db.add(TeamMember(team_id=teams["General"].team_id, user_id=u.user_id, role="member", joined_at=dt(random.randint(90, 170))))

assignments = {
    "Backend Squad":    [(0, "admin"), (2, "member"), (5, "member")],
    "Frontend Crew":    [(1, "admin"), (3, "member"), (6, "member")],
    "DevOps & Infra":   [(0, "admin"), (4, "member")],
    "Product & Design": [(1, "admin"), (3, "member"), (5, "member")],
    "QA & Testing":     [(4, "admin"), (2, "member"), (6, "member")],
}

for tname, members in assignments.items():
    tid = teams[tname].team_id
    for idx, role in members:
        uid = other_users[idx].user_id
        existing = db.query(TeamMember).filter(TeamMember.team_id == tid, TeamMember.user_id == uid).first()
        if not existing:
            db.add(TeamMember(team_id=tid, user_id=uid, role=role, joined_at=dt(random.randint(60, 160))))

db.commit()

# ── 6. Create tasks ─────────────────────────────────────────────────────────
print("Creating tasks...")
ou = other_users  # shorthand

tasks_data = [
    # (name, priority, status, category, creator, assignee, team, days_ago, est, actual, desc)
    # Old completed
    ("Set up project repository and branch strategy", "High", "Completed", "DevOps", akshith, akshith, "DevOps & Infra", 175, 2.0, 1.5, "Initialize Git repo with main/dev/feature branch model"),
    ("Design database schema v1", "High", "Completed", "Backend", akshith, ou[0], "Backend Squad", 172, 8.0, 10.0, "ERD for users, orgs, teams, tasks tables"),
    ("FastAPI project scaffold", "High", "Completed", "Backend", akshith, ou[0], "Backend Squad", 170, 4.0, 3.5, "FastAPI with SQLAlchemy, Pydantic, CORS, JWT"),
    ("React project setup with TypeScript", "High", "Completed", "Frontend", akshith, ou[1], "Frontend Crew", 170, 3.0, 2.5, "CRA + TypeScript + Tailwind + React Router"),
    ("User authentication - backend", "High", "Completed", "Backend", ou[0], ou[0], "Backend Squad", 165, 12.0, 14.0, "JWT tokens, bcrypt hashing, auth endpoints"),
    ("User authentication - frontend", "High", "Completed", "Frontend", ou[1], ou[1], "Frontend Crew", 162, 10.0, 8.0, "Login/register pages, auth context, protected routes"),
    ("Azure SQL Database provisioning", "High", "Completed", "DevOps", akshith, ou[4], "DevOps & Infra", 168, 3.0, 4.0, "Provision Azure SQL, configure firewall rules"),
    ("Task CRUD API endpoints", "High", "Completed", "Backend", ou[0], ou[2], "Backend Squad", 155, 8.0, 7.0, "Create, read, update, delete tasks with validation"),
    ("Task list and kanban views", "High", "Completed", "Frontend", ou[1], ou[3], "Frontend Crew", 150, 12.0, 15.0, "Sortable table list and drag-drop kanban board"),
    ("Organization and team models", "Medium", "Completed", "Backend", akshith, ou[0], "Backend Squad", 148, 6.0, 5.5, "Multi-tenant org model, team CRUD, roles"),
    ("Dashboard stats and charts", "Medium", "Completed", "Frontend", ou[1], ou[6], "Frontend Crew", 140, 10.0, 12.0, "Recharts - completion trends, priority distribution"),
    ("Landing page with pricing tiers", "Medium", "Completed", "Frontend", ou[1], ou[3], "Product & Design", 138, 8.0, 9.0, "Hero, features grid, testimonials, pricing cards"),
    ("CI/CD pipeline with GitHub Actions", "High", "Completed", "DevOps", akshith, ou[4], "DevOps & Infra", 135, 6.0, 8.0, "Auto deploy to App Service and Static Web Apps"),
    ("Comment system with threading", "Medium", "Completed", "Backend", ou[0], ou[0], "Backend Squad", 130, 6.0, 5.0, "Threaded comments, @mention parsing, edit/delete"),
    ("Notification system", "Medium", "Completed", "Backend", akshith, ou[2], "Backend Squad", 125, 8.0, 7.5, "Notifications for mentions, comments, reactions"),
    ("Emoji reactions on tasks", "Low", "Completed", "Frontend", ou[1], ou[6], "Frontend Crew", 122, 3.0, 2.5, "Emoji reactions unique per user/task/emoji"),
    ("Team management UI", "Medium", "Completed", "Frontend", ou[1], ou[1], "Frontend Crew", 118, 8.0, 7.0, "Team cards, member list, role management"),
    ("ML priority prediction model", "High", "Completed", "ML", akshith, akshith, "Backend Squad", 110, 16.0, 20.0, "RandomForest classifier for priority suggestions"),
    ("ML completion time estimator", "High", "Completed", "ML", akshith, ou[5], "Backend Squad", 105, 12.0, 14.0, "GradientBoosting regressor for time prediction"),
    ("Azure Data Factory ETL pipeline", "Medium", "Completed", "DevOps", akshith, ou[4], "DevOps & Infra", 100, 10.0, 12.0, "SQL to Blob pipeline with ETL transforms"),
    ("Invite system with token links", "Medium", "Completed", "Backend", ou[0], ou[2], "Backend Squad", 95, 4.0, 3.5, "Unique invite tokens, accept flow"),
    ("Settings page - profile and org", "Low", "Completed", "Frontend", ou[1], ou[3], "Frontend Crew", 90, 6.0, 5.0, "Profile, org settings, password, CSV export"),
    ("Command palette (Ctrl+K)", "Low", "Completed", "Frontend", ou[6], ou[6], "Frontend Crew", 85, 4.0, 3.0, "Global search, keyboard navigation"),
    ("Activity feed and audit log", "Medium", "Completed", "Backend", ou[0], ou[0], "Backend Squad", 80, 5.0, 4.5, "Org and team level activity logs"),
    ("Workload visualization", "Medium", "Completed", "Frontend", ou[1], ou[6], "Frontend Crew", 75, 4.0, 3.0, "Bar charts for team member task distribution"),
    ("Admin panel for superadmin", "Medium", "Completed", "Backend", akshith, ou[0], "Backend Squad", 70, 6.0, 5.5, "Platform stats, org/user management"),
    ("Performance optimization pass", "High", "Completed", "Backend", akshith, ou[2], "Backend Squad", 60, 8.0, 6.0, "N+1 query fixes, response caching"),
    ("Responsive mobile layout", "Medium", "Completed", "Frontend", ou[3], ou[3], "Frontend Crew", 55, 6.0, 7.0, "Mobile bottom tab bar, touch-friendly drawer"),
    ("E2E test suite with Cypress", "Medium", "Completed", "QA", ou[4], ou[4], "QA & Testing", 50, 10.0, 9.0, "Auth flow, task CRUD, team mgmt - 40+ tests"),
    ("Weekly AI digest feature", "Medium", "Completed", "Backend", akshith, akshith, "Backend Squad", 45, 6.0, 5.0, "AI weekly productivity summary"),
    ("Task duplication feature", "Low", "Completed", "Backend", ou[0], ou[2], "Backend Squad", 28, 2.0, 1.5, "One-click deep copy of tasks"),
    ("Framer Motion page transitions", "Low", "Completed", "Frontend", ou[6], ou[6], "Frontend Crew", 25, 4.0, 3.5, "Smooth transitions, confetti on completion"),
    ("Bulk task assignment endpoint", "Medium", "Completed", "Backend", ou[0], ou[0], "Backend Squad", 22, 3.0, 2.5, "Assign multiple tasks in one API call"),
    ("Search and filter overhaul", "Medium", "Completed", "Frontend", ou[1], ou[3], "Frontend Crew", 14, 5.0, 4.0, "Full-text search, multi-select filters"),
    ("Keyboard shortcuts system", "Low", "Completed", "Frontend", ou[6], ou[6], "Frontend Crew", 10, 3.0, 2.0, "n=quick add, /=search, Ctrl+K=palette"),
    ("API rate limiting middleware", "Medium", "Completed", "Backend", ou[0], ou[5], "Backend Squad", 7, 3.0, 3.0, "Token bucket rate limiter per user"),
    ("Bug fix: JWT refresh race condition", "High", "Completed", "Backend", akshith, akshith, "Backend Squad", 5, 2.0, 4.0, "Fixed concurrent request token invalidation"),
    # In progress
    ("Real-time WebSocket notifications", "High", "In Progress", "Backend", akshith, ou[0], "Backend Squad", 4, 10.0, None, "Replace polling with WebSocket"),
    ("Task template library", "Medium", "In Progress", "Frontend", ou[1], ou[3], "Frontend Crew", 3, 6.0, None, "Pre-built task templates"),
    ("Azure ML endpoint integration", "High", "In Progress", "ML", akshith, akshith, "Backend Squad", 3, 8.0, None, "Connect models to Azure ML endpoint"),
    ("Dark mode color refinement", "Medium", "In Progress", "Frontend", ou[3], ou[3], "Product & Design", 2, 4.0, None, "Fix contrast ratios, glassmorphism"),
    ("Load testing with k6", "Medium", "In Progress", "QA", ou[4], ou[4], "QA & Testing", 2, 5.0, None, "k6 scripts for API endpoints"),
    # Pending
    ("GraphQL API layer", "Medium", "Pending", "Backend", akshith, ou[2], "Backend Squad", 1, 16.0, None, "Strawberry GraphQL on top of REST"),
    ("Multi-language support (i18n)", "Low", "Pending", "Frontend", ou[1], ou[6], "Frontend Crew", 1, 12.0, None, "react-intl, Hindi and Spanish"),
    ("SSO with Google/GitHub OAuth", "High", "Pending", "Backend", akshith, ou[0], "Backend Squad", 1, 8.0, None, "OAuth2 flow for Google and GitHub"),
    ("Automated backup and DR", "High", "Pending", "DevOps", akshith, ou[4], "DevOps & Infra", 0, 6.0, None, "Geo-replication, blob versioning"),
    ("Analytics export to PDF", "Low", "Pending", "Frontend", ou[1], ou[3], "Frontend Crew", 0, 5.0, None, "PDF reports from analytics charts"),
    ("Slack integration", "Medium", "Pending", "Backend", ou[0], ou[5], "Backend Squad", 0, 8.0, None, "Slack webhook for task updates"),
    ("WCAG 2.1 AA accessibility audit", "Medium", "Pending", "QA", ou[4], ou[6], "QA & Testing", 0, 6.0, None, "Screen reader, keyboard nav, ARIA"),
]

created_tasks = []
for name, pri, status, cat, creator, assignee, team_name, days, est, actual, desc in tasks_data:
    existing = db.query(Task).filter(Task.task_name == name, Task.org_id == org.org_id).first()
    if existing:
        created_tasks.append(existing)
        continue
    deadline = dt(days - random.randint(3, 15)) if status != "Completed" else None
    t = Task(
        task_name=name, priority=pri, deadline=deadline,
        estimated_time=est, actual_time=actual,
        status=status, category=cat, description=desc,
        created_at=dt(days), user_id=creator.user_id, assigned_to=assignee.user_id,
        team_id=teams[team_name].team_id, org_id=org.org_id, is_archived=False
    )
    db.add(t)
    db.flush()
    created_tasks.append(t)

db.commit()
print(f"  Created {len(created_tasks)} tasks")

# ── 7. Add comments ─────────────────────────────────────────────────────────
print("Adding comments...")
comment_templates = [
    "Looks good! Merging this in.",
    "Can we add unit tests for this?",
    "Great progress. Let's ship it by EOD.",
    "I've reviewed the PR - a few minor suggestions inline.",
    "Blocked on the auth middleware changes.",
    "Updated the design mockups in Figma.",
    "This needs refactoring before we scale.",
    "Performance benchmarks look solid - 40% improvement.",
    "Let's discuss in standup tomorrow.",
    "Deployed to staging. Can someone QA this?",
    "Fixed the edge case with null deadlines.",
    "The Azure pipeline is green. All tests passing.",
    "Nice work! This was a tricky one.",
    "Let's split this into two smaller tasks.",
    "Added error handling for rate limit responses.",
    "The mobile layout looks much better now.",
    "Can we get a code review before merging?",
    "Updated the API docs for new endpoints.",
    "This closes the issue from last sprint.",
    "The ML model accuracy improved to 87%.",
    "Database migration ran successfully on staging.",
    "Customer feedback has been positive on the dashboard.",
    "Smoke tests passing. Promoting to production.",
]

comment_count = 0
for task in created_tasks:
    num_comments = random.choices([0, 1, 2, 3, 4, 5], weights=[10, 25, 25, 20, 15, 5])[0]
    for _ in range(num_comments):
        commenter = random.choice(all_users)
        content = random.choice(comment_templates)
        days_ago = random.randint(0, 60)
        c = TaskComment(task_id=task.task_id, user_id=commenter.user_id,
                        content=content, created_at=dt(days_ago), updated_at=dt(days_ago))
        db.add(c)
        comment_count += 1

db.commit()
print(f"  Added {comment_count} comments")

# ── 8. Add reactions ────────────────────────────────────────────────────────
print("Adding reactions...")
emojis = ["👍", "❤️", "🔥", "✅", "🎯"]
reaction_count = 0
for task in created_tasks:
    num_reactions = random.choices([0, 1, 2, 3, 4], weights=[15, 30, 25, 20, 10])[0]
    used_combos = set()
    for _ in range(num_reactions):
        user = random.choice(all_users)
        emoji = random.choice(emojis)
        combo = (task.task_id, user.user_id, emoji)
        if combo in used_combos:
            continue
        used_combos.add(combo)
        db.add(TaskReaction(task_id=task.task_id, user_id=user.user_id,
                            emoji=emoji, created_at=dt(random.randint(0, 60))))
        reaction_count += 1

db.commit()
print(f"  Added {reaction_count} reactions")

# ── 9. Add notifications ────────────────────────────────────────────────────
print("Adding notifications...")
notif_types = [
    ("mention", "You were mentioned", "{user} mentioned you in {task}"),
    ("comment", "New comment", "{user} commented on {task}"),
    ("reaction", "New reaction", "{user} reacted to {task}"),
    ("assignment", "Task assigned", "You were assigned to {task}"),
    ("deadline", "Deadline approaching", "{task} is due soon"),
]

notif_count = 0
for user in all_users:
    num_notifs = random.randint(8, 20)
    for _ in range(num_notifs):
        ntype, title, msg_template = random.choice(notif_types)
        task = random.choice(created_tasks)
        other = random.choice([u for u in all_users if u.user_id != user.user_id])
        msg = msg_template.format(user=other.full_name, task=task.task_name)
        days_ago = random.randint(0, 90)
        is_read = True if days_ago > 3 else random.choice([False, False, False, True])
        db.add(Notification(user_id=user.user_id, type=ntype, title=title, message=msg,
                            task_id=task.task_id, is_read=is_read, created_at=dt(days_ago)))
        notif_count += 1

db.commit()
print(f"  Added {notif_count} notifications")

# ── 10. Add activity logs ───────────────────────────────────────────────────
print("Adding activity logs...")
actions = [
    ("created_task", "task"), ("completed_task", "task"), ("updated_task", "task"),
    ("assigned_task", "task"), ("added_comment", "comment"), ("created_team", "team"),
    ("added_member", "team"), ("joined_org", "user"), ("deployed", "deployment"),
]

log_count = 0
task_names = [t.task_name for t in created_tasks]
team_names = list(teams.keys())

for days_ago in range(180, -1, -1):
    if random.random() < 0.3:
        continue
    for _ in range(random.randint(1, 5)):
        action, entity_type = random.choice(actions)
        user = random.choice(all_users)
        metadata = json.dumps({"description": f"{action}: {random.choice(task_names)}"})
        team_id = random.choice(list(teams.values())).team_id if random.random() > 0.3 else None
        db.add(ActivityLog(
            org_id=org.org_id, team_id=team_id, user_id=user.user_id,
            action=action, entity_type=entity_type, entity_id=random.randint(1, 100),
            metadata_json=metadata, created_at=dt(days_ago)
        ))
        log_count += 1

db.commit()
print(f"  Added {log_count} activity logs")

# ── Summary ─────────────────────────────────────────────────────────────────
print(f"\n=== Seed Complete ===")
print(f"  Organization: {org.name}")
print(f"  Users: {len(all_users) + 1} (including superadmin)")
print(f"  Teams: {len(teams)}")
print(f"  Tasks: {len(created_tasks)}")
print(f"  Comments: {comment_count}")
print(f"  Reactions: {reaction_count}")
print(f"  Notifications: {notif_count}")
print(f"  Activity logs: {log_count}")
print(f"\n  Login as: akshith@nexuswave.com / Akshith@2024")
print(f"  Superadmin: admin@taskoptimizer.com / Admin@2024")

db.close()
