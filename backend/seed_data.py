"""
Seed Azure SQL with rich historical data for Akshith's org (org_id=7).
Makes the account look like it's been actively used for ~6 months.
Run from project root: py backend/seed_data.py
"""
import os, sys, random, bcrypt, json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set"); sys.exit(1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
Session = sessionmaker(bind=engine)
db = Session()

# ─── Helpers ──────────────────────────────────────────────────────────────────
NOW = datetime.now(timezone.utc)

def dt(days_ago, hour=10, minute=0):
    """Return a UTC datetime `days_ago` days in the past."""
    return NOW - timedelta(days=days_ago, hours=random.randint(0,12), minutes=random.randint(0,59))

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()

def ins(table, **kw):
    cols = ", ".join(f"[{c}]" for c in kw)
    params = ", ".join(f":{c}" for c in kw)
    db.execute(text(f"INSERT INTO {table} ({cols}) VALUES ({params})"), kw)

# ─── 1. Upgrade Akshith's org ────────────────────────────────────────────────
print("Upgrading org 7...")
db.execute(text("""
    UPDATE organizations
    SET name='NexusWave Technologies', slug='nexuswave', [plan]='pro',
        description='Product development and innovation team',
        created_at=:ca
    WHERE org_id=7
"""), {"ca": dt(180)})

# Update Akshith's account to look older
db.execute(text("""
    UPDATE users SET created_at=:ca, role='admin', last_login=:ll
    WHERE user_id=7
"""), {"ca": dt(180), "ll": dt(0)})

# ─── 2. Add users to org 7 ───────────────────────────────────────────────────
print("Adding users to org 7...")
new_users = [
    ("ravi.kumar@gmail.com",   "Ravi Kumar",     "admin",  hash_pw("Ravi@2026"),    dt(170)),
    ("meera.shah@gmail.com",   "Meera Shah",     "member", hash_pw("Meera@2026"),   dt(165)),
    ("arjun.reddy@gmail.com",  "Arjun Reddy",    "member", hash_pw("Arjun@2026"),   dt(150)),
    ("sneha.patel@gmail.com",  "Sneha Patel",    "member", hash_pw("Sneha@2026"),   dt(140)),
    ("vikram.singh@gmail.com", "Vikram Singh",   "member", hash_pw("Vikram@2026"),  dt(120)),
    ("ananya.joshi@gmail.com", "Ananya Joshi",   "member", hash_pw("Ananya@2026"),  dt(90)),
    ("karthik.m@gmail.com",   "Karthik Menon",  "member", hash_pw("Karthik@2026"), dt(60)),
]

user_ids = {}  # email -> user_id
for email, name, role, pw_hash, created in new_users:
    existing = db.execute(text("SELECT user_id FROM users WHERE email=:e"), {"e": email}).first()
    if existing:
        user_ids[email] = existing[0]
        continue
    ins("users", email=email, password_hash=pw_hash, full_name=name, role=role,
        org_id=7, is_active=1, created_at=created, last_login=dt(random.randint(0,3)))
    uid = db.execute(text("SELECT user_id FROM users WHERE email=:e"), {"e": email}).first()[0]
    user_ids[email] = uid
    print(f"  Created user {name} (id={uid})")

db.commit()

# Refresh user_ids with all org 7 users
all_org7 = db.execute(text("SELECT user_id, email, full_name FROM users WHERE org_id=7")).fetchall()
ORG7_USERS = [(r[0], r[1], r[2]) for r in all_org7]
ORG7_UIDS = [r[0] for r in ORG7_USERS]
print(f"  Org 7 now has {len(ORG7_USERS)} users: {[u[2] for u in ORG7_USERS]}")

AKSHITH = 7

# ─── 3. Create teams in org 7 ────────────────────────────────────────────────
print("Creating teams...")
db.execute(text("UPDATE teams SET created_at=:ca WHERE team_id=6"), {"ca": dt(178)})

teams_to_create = [
    ("Backend Squad",    "API, database, and server-side development",    "#3B82F6", "code",     dt(175)),
    ("Frontend Crew",    "UI/UX implementation and React development",    "#10B981", "monitor",  dt(175)),
    ("DevOps & Infra",   "CI/CD, cloud infrastructure, and monitoring",   "#F59E0B", "server",   dt(170)),
    ("Product & Design", "Product strategy, UX research, and design",     "#EC4899", "palette",  dt(160)),
    ("QA & Testing",     "Quality assurance and test automation",         "#8B5CF6", "shield",   dt(140)),
]

team_ids = {}
for tname, desc, color, icon, created in teams_to_create:
    existing = db.execute(text("SELECT team_id FROM teams WHERE org_id=7 AND name=:n"), {"n": tname}).first()
    if existing:
        team_ids[tname] = existing[0]
        continue
    ins("teams", org_id=7, name=tname, description=desc, color=color, icon=icon,
        created_at=created, created_by=AKSHITH)
    tid = db.execute(text("SELECT team_id FROM teams WHERE org_id=7 AND name=:n"), {"n": tname}).first()[0]
    team_ids[tname] = tid
    print(f"  Created team '{tname}' (id={tid})")

db.commit()

# ─── 4. Add team members ─────────────────────────────────────────────────────
print("Adding team members...")
team_list = db.execute(text("SELECT team_id, name FROM teams WHERE org_id=7")).fetchall()
all_team_ids = {r[1]: r[0] for r in team_list}

# Clear existing memberships for new teams
for tid in all_team_ids.values():
    if tid != 6:
        db.execute(text("DELETE FROM team_members WHERE team_id=:t"), {"t": tid})

# Akshith owns all teams
for tname, tid in all_team_ids.items():
    if tid == 6:
        continue
    existing = db.execute(text("SELECT id FROM team_members WHERE team_id=:t AND user_id=:u"),
                          {"t": tid, "u": AKSHITH}).first()
    if not existing:
        ins("team_members", team_id=tid, user_id=AKSHITH, role="owner", joined_at=dt(175))

other_uids = [u for u in ORG7_UIDS if u != AKSHITH]
if len(other_uids) >= 7:
    assignments = {
        "Backend Squad":    [(other_uids[0], "admin"), (other_uids[2], "member"), (other_uids[5], "member")],
        "Frontend Crew":    [(other_uids[1], "admin"), (other_uids[3], "member"), (other_uids[6], "member")],
        "DevOps & Infra":   [(other_uids[0], "admin"), (other_uids[4], "member")],
        "Product & Design": [(other_uids[1], "admin"), (other_uids[3], "member"), (other_uids[5], "member")],
        "QA & Testing":     [(other_uids[4], "admin"), (other_uids[2], "member"), (other_uids[6], "member")],
    }
    for uid in other_uids:
        existing = db.execute(text("SELECT id FROM team_members WHERE team_id=6 AND user_id=:u"), {"u": uid}).first()
        if not existing:
            ins("team_members", team_id=6, user_id=uid, role="member", joined_at=dt(random.randint(90,170)))

    for tname, members in assignments.items():
        tid = all_team_ids.get(tname)
        if not tid:
            continue
        for uid, role in members:
            existing = db.execute(text("SELECT id FROM team_members WHERE team_id=:t AND user_id=:u"),
                                  {"t": tid, "u": uid}).first()
            if not existing:
                ins("team_members", team_id=tid, user_id=uid, role=role, joined_at=dt(random.randint(60,160)))

db.commit()

# ─── 5. Create tasks ─────────────────────────────────────────────────────────
print("Creating tasks...")

backend_tid = all_team_ids.get("Backend Squad", 6)
frontend_tid = all_team_ids.get("Frontend Crew", 6)
devops_tid = all_team_ids.get("DevOps & Infra", 6)
product_tid = all_team_ids.get("Product & Design", 6)
qa_tid = all_team_ids.get("QA & Testing", 6)

tasks_data = [
    # (name, priority, status, category, creator, assignee, team_id, days_ago, est_time, actual_time, description)
    # === Old completed tasks (3-6 months ago) ===
    ("Set up project repository and branch strategy", "High", "Completed", "DevOps", AKSHITH, AKSHITH, devops_tid, 175, 2.0, 1.5, "Initialize Git repo with main/dev/feature branch model and PR templates"),
    ("Design database schema v1", "High", "Completed", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 172, 8.0, 10.0, "ERD for users, orgs, teams, tasks tables with relationships"),
    ("FastAPI project scaffold", "High", "Completed", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 170, 4.0, 3.5, "Set up FastAPI with SQLAlchemy, Pydantic schemas, CORS, and JWT auth skeleton"),
    ("React project setup with TypeScript", "High", "Completed", "Frontend", AKSHITH, other_uids[1] if other_uids else AKSHITH, frontend_tid, 170, 3.0, 2.5, "CRA with TypeScript, Tailwind CSS, React Router, and Axios interceptors"),
    ("User authentication - backend", "High", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 165, 12.0, 14.0, "JWT access/refresh tokens, bcrypt hashing, login/register/logout endpoints"),
    ("User authentication - frontend", "High", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[1] if other_uids else AKSHITH, frontend_tid, 162, 10.0, 8.0, "Login/register pages, auth context, protected routes, token refresh"),
    ("Azure SQL Database provisioning", "High", "Completed", "DevOps", AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, devops_tid, 168, 3.0, 4.0, "Provision Azure SQL, configure firewall, set up connection strings"),
    ("Task CRUD API endpoints", "High", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 155, 8.0, 7.0, "Create, read, update, delete tasks with proper validation"),
    ("Task list and kanban views", "High", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 150, 12.0, 15.0, "Dual view - sortable table list and drag-drop kanban board"),
    ("Organization and team models", "Medium", "Completed", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 148, 6.0, 5.5, "Multi-tenant org model, team CRUD, role-based membership"),
    ("Dashboard stats and charts", "Medium", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 140, 10.0, 12.0, "Recharts integration - completion trends, priority distribution, productivity heatmap"),
    ("Landing page with pricing tiers", "Medium", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, product_tid, 138, 8.0, 9.0, "Hero section, features grid, testimonials, pricing cards, CTA sections"),
    ("CI/CD pipeline with GitHub Actions", "High", "Completed", "DevOps", AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, devops_tid, 135, 6.0, 8.0, "Auto deploy backend to App Service, frontend to Static Web Apps on push to main"),
    ("Comment system with threading", "Medium", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 130, 6.0, 5.0, "Threaded comments with parent_id, @mention parsing, edit/delete own comments"),
    ("Notification system", "Medium", "Completed", "Backend", AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 125, 8.0, 7.5, "Real-time-ish notifications for mentions, comments, reactions, assignments, deadlines"),
    ("Emoji reactions on tasks", "Low", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 122, 3.0, 2.5, "Thumbs up, heart, fire, check, target - unique per user/task/emoji"),
    ("Team management UI", "Medium", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[1] if other_uids else AKSHITH, frontend_tid, 118, 8.0, 7.0, "Team cards grid, member list, role management, invite flow"),
    ("ML priority prediction model", "High", "Completed", "ML", AKSHITH, AKSHITH, backend_tid, 110, 16.0, 20.0, "RandomForest classifier trained on task features to suggest priority levels"),
    ("ML completion time estimator", "High", "Completed", "ML", AKSHITH, other_uids[5] if len(other_uids)>5 else AKSHITH, backend_tid, 105, 12.0, 14.0, "GradientBoosting regressor to predict task completion hours based on category/priority"),
    ("Azure Data Factory ETL pipeline", "Medium", "Completed", "DevOps", AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, devops_tid, 100, 10.0, 12.0, "SQL -> Blob pipeline: normalize, clean, calculate velocity metrics"),
    ("Invite system with token links", "Medium", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 95, 4.0, 3.5, "Generate unique invite tokens, accept flow, email-based team onboarding"),
    ("Settings page - profile and org", "Low", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 90, 6.0, 5.0, "Profile editing, org settings (admin), password change, CSV export, theme toggle"),
    ("Command palette (Ctrl+K)", "Low", "Completed", "Frontend", other_uids[6] if len(other_uids)>6 else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 85, 4.0, 3.0, "Global command palette with search, keyboard navigation, recent commands"),
    ("Activity feed and audit log", "Medium", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 80, 5.0, 4.5, "Org-wide and team-level activity logs with JSON metadata"),
    ("Workload visualization", "Medium", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 75, 4.0, 3.0, "Horizontal bar charts showing task distribution per team member"),
    ("Admin panel for superadmin", "Medium", "Completed", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 70, 6.0, 5.5, "Platform-wide stats, org/user management tables"),
    ("Performance optimization pass", "High", "Completed", "Backend", AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 60, 8.0, 6.0, "N+1 query fixes, combined dashboard endpoint, response caching"),
    ("Responsive mobile layout", "Medium", "Completed", "Frontend", other_uids[3] if len(other_uids)>3 else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 55, 6.0, 7.0, "Mobile bottom tab bar, collapsible sidebar, touch-friendly task drawer"),
    ("E2E test suite with Cypress", "Medium", "Completed", "QA", other_uids[4] if len(other_uids)>4 else AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, qa_tid, 50, 10.0, 9.0, "Auth flow, task CRUD, team management, notifications - 40+ test cases"),
    ("Weekly AI digest feature", "Medium", "Completed", "Backend", AKSHITH, AKSHITH, backend_tid, 45, 6.0, 5.0, "AI-generated weekly productivity summary with insights and recommendations"),
    # === Recent completed (1-4 weeks ago) ===
    ("Task duplication feature", "Low", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 28, 2.0, 1.5, "One-click deep copy of tasks preserving all metadata except status"),
    ("Framer Motion page transitions", "Low", "Completed", "Frontend", other_uids[6] if len(other_uids)>6 else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 25, 4.0, 3.5, "Smooth page transitions, staggered card animations, confetti on task completion"),
    ("Bulk task assignment endpoint", "Medium", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 22, 3.0, 2.5, "Assign multiple tasks to a user in one API call"),
    ("Azure Blob Storage integration", "Medium", "Completed", "DevOps", AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, devops_tid, 18, 4.0, 5.0, "Upload processed CSV data to Azure Blob, download for ML training"),
    ("Search and filter overhaul", "Medium", "Completed", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 14, 5.0, 4.0, "Full-text search, multi-select filters for status/priority/team/assignee"),
    ("Keyboard shortcuts system", "Low", "Completed", "Frontend", other_uids[6] if len(other_uids)>6 else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 10, 3.0, 2.0, "n=quick add, /=search, Ctrl+K=palette, Esc=close - with help overlay"),
    ("API rate limiting middleware", "Medium", "Completed", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[5] if len(other_uids)>5 else AKSHITH, backend_tid, 7, 3.0, 3.0, "Token bucket rate limiter per user, 429 responses with retry-after header"),
    ("Bug fix: JWT refresh race condition", "High", "Completed", "Backend", AKSHITH, AKSHITH, backend_tid, 5, 2.0, 4.0, "Fixed race condition where concurrent requests could invalidate refresh tokens"),
    # === Currently in progress ===
    ("Real-time WebSocket notifications", "High", "In Progress", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 4, 10.0, None, "Replace polling with WebSocket for instant notification delivery"),
    ("Task template library", "Medium", "In Progress", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 3, 6.0, None, "Pre-built task templates for common workflows (sprint planning, bug triage, etc.)"),
    ("Azure ML endpoint scoring integration", "High", "In Progress", "ML", AKSHITH, AKSHITH, backend_tid, 3, 8.0, None, "Connect trained models to Azure ML for production scoring via REST endpoint"),
    ("Dark mode color token refinement", "Medium", "In Progress", "Frontend", other_uids[3] if len(other_uids)>3 else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, product_tid, 2, 4.0, None, "Fine-tune dark mode contrast ratios, fix glassmorphism on light backgrounds"),
    ("Load testing with k6", "Medium", "In Progress", "QA", other_uids[4] if len(other_uids)>4 else AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, qa_tid, 2, 5.0, None, "k6 scripts for API endpoints, establish baseline metrics under 100/500/1000 concurrent users"),
    # === Pending (upcoming) ===
    ("GraphQL API layer", "Medium", "Pending", "Backend", AKSHITH, other_uids[2] if len(other_uids)>2 else AKSHITH, backend_tid, 1, 16.0, None, "Strawberry GraphQL layer on top of existing REST for flexible frontend queries"),
    ("Multi-language support (i18n)", "Low", "Pending", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, frontend_tid, 1, 12.0, None, "react-intl integration, extract all strings, add Hindi and Spanish translations"),
    ("SSO with Google/GitHub OAuth", "High", "Pending", "Backend", AKSHITH, other_uids[0] if other_uids else AKSHITH, backend_tid, 1, 8.0, None, "OAuth2 flow for Google and GitHub, link to existing accounts"),
    ("Automated backup and disaster recovery", "High", "Pending", "DevOps", AKSHITH, other_uids[4] if len(other_uids)>4 else AKSHITH, devops_tid, 0, 6.0, None, "Azure SQL geo-replication, blob versioning, automated restore testing"),
    ("Analytics export to PDF", "Low", "Pending", "Frontend", other_uids[1] if other_uids else AKSHITH, other_uids[3] if len(other_uids)>3 else AKSHITH, frontend_tid, 0, 5.0, None, "Generate downloadable PDF reports from analytics dashboard charts"),
    ("Slack integration for notifications", "Medium", "Pending", "Backend", other_uids[0] if other_uids else AKSHITH, other_uids[5] if len(other_uids)>5 else AKSHITH, backend_tid, 0, 8.0, None, "Slack webhook integration to post task updates and mentions to channels"),
    ("WCAG 2.1 AA accessibility audit", "Medium", "Pending", "QA", other_uids[4] if len(other_uids)>4 else AKSHITH, other_uids[6] if len(other_uids)>6 else AKSHITH, qa_tid, 0, 6.0, None, "Screen reader testing, keyboard navigation, color contrast, ARIA labels"),
]

created_task_ids = []
for t in tasks_data:
    name, pri, status, cat, creator, assignee, tid, days, est, actual, desc = t
    existing = db.execute(text("SELECT task_id FROM tasks WHERE task_name=:n AND org_id=7"), {"n": name}).first()
    if existing:
        created_task_ids.append(existing[0])
        continue
    deadline = dt(days - random.randint(3, 15)) if status != "Completed" else None
    ins("tasks",
        task_name=name, priority=pri, deadline=deadline,
        estimated_time=est, actual_time=actual,
        status=status, category=cat, description=desc,
        created_at=dt(days), user_id=creator, assigned_to=assignee,
        team_id=tid, org_id=7, is_archived=0)
    task_id = db.execute(text("SELECT task_id FROM tasks WHERE task_name=:n AND org_id=7"), {"n": name}).first()[0]
    created_task_ids.append(task_id)

db.commit()
print(f"  Created/found {len(created_task_ids)} tasks")

# ─── 6. Add comments ─────────────────────────────────────────────────────────
print("Adding comments...")

comment_templates = [
    "Looks good! Merging this in.",
    "Can we add unit tests for this?",
    "Great progress on this. Let's ship it by EOD.",
    "I've reviewed the PR - a few minor suggestions inline.",
    "Blocked on the auth middleware changes. @{user} can you prioritize that?",
    "Updated the design mockups in Figma. Please check.",
    "This needs to be refactored before we scale. Creating a follow-up task.",
    "Performance benchmarks look solid - 40% improvement over last sprint.",
    "Let's discuss the approach in standup tomorrow.",
    "Deployed to staging. Can someone QA this?",
    "Fixed the edge case with null deadlines. Ready for re-review.",
    "The Azure pipeline is green now. All tests passing.",
    "Nice work! This was a tricky one.",
    "I think we should split this into two smaller tasks.",
    "Added error handling for the 429 rate limit responses.",
    "The mobile layout looks much better now. Good job @{user}!",
    "Can we get a code review on this before merging?",
    "Updated the API docs to reflect the new endpoints.",
    "This closes the issue from last sprint. Moving to done.",
    "Need to sync with the design team on the color tokens.",
    "The ML model accuracy improved to 87% after the new features.",
    "Let's add this to the sprint retrospective discussion.",
    "Database migration ran successfully on staging.",
    "Customer feedback has been positive on the new dashboard.",
    "Smoke tests are all passing. Promoting to production.",
]

all_org7_tasks = db.execute(text("SELECT task_id FROM tasks WHERE org_id=7")).fetchall()
tasks_for_comments = [r[0] for r in all_org7_tasks]

comment_count = 0
for task_id in tasks_for_comments:
    num_comments = random.choices([0, 1, 2, 3, 4, 5, 6], weights=[10, 20, 25, 20, 15, 7, 3])[0]
    for i in range(num_comments):
        commenter = random.choice(ORG7_UIDS)
        mentioned = random.choice([u[2] for u in ORG7_USERS])
        content = random.choice(comment_templates).format(user=mentioned)
        days_ago = random.randint(0, 60)
        ins("task_comments", task_id=task_id, user_id=commenter, content=content,
            created_at=dt(days_ago), updated_at=dt(days_ago))
        comment_count += 1

db.commit()
print(f"  Added {comment_count} comments")

# ─── 7. Add reactions ────────────────────────────────────────────────────────
print("Adding reactions...")
emojis = ["👍", "❤️", "🔥", "✅", "🎯"]
reaction_count = 0
for task_id in tasks_for_comments:
    num_reactions = random.choices([0, 1, 2, 3, 4, 5], weights=[15, 25, 25, 20, 10, 5])[0]
    used_combos = set()
    for _ in range(num_reactions):
        user = random.choice(ORG7_UIDS)
        emoji = random.choice(emojis)
        combo = (task_id, user, emoji)
        if combo in used_combos:
            continue
        used_combos.add(combo)
        try:
            ins("task_reactions", task_id=task_id, user_id=user, emoji=emoji, created_at=dt(random.randint(0, 60)))
            db.flush()
            reaction_count += 1
        except Exception:
            db.rollback()

db.commit()
print(f"  Added {reaction_count} reactions")

# ─── 8. Add notifications ────────────────────────────────────────────────────
print("Adding notifications...")
notif_types = [
    ("mention", "You were mentioned", "{user} mentioned you in {task}"),
    ("comment", "New comment", "{user} commented on {task}"),
    ("reaction", "New reaction", "{user} reacted to {task}"),
    ("assignment", "Task assigned", "You were assigned to {task}"),
    ("deadline", "Deadline approaching", "{task} is due soon"),
]

notif_count = 0
task_name_map = {}
for r in db.execute(text("SELECT task_id, task_name FROM tasks WHERE org_id=7")).fetchall():
    task_name_map[r[0]] = r[1]

for uid in ORG7_UIDS:
    num_notifs = random.randint(8, 25)
    for _ in range(num_notifs):
        ntype, title, msg_template = random.choice(notif_types)
        task_id = random.choice(tasks_for_comments) if tasks_for_comments else None
        other_user = random.choice([u[2] for u in ORG7_USERS if u[0] != uid]) if len(ORG7_USERS) > 1 else "Someone"
        task_name = task_name_map.get(task_id, "a task")
        msg = msg_template.format(user=other_user, task=task_name)
        days_ago = random.randint(0, 90)
        is_read = 1 if days_ago > 3 else random.choice([0, 0, 0, 1])
        try:
            ins("notifications", user_id=uid, type=ntype, title=title, message=msg,
                task_id=task_id, is_read=is_read, created_at=dt(days_ago))
            db.flush()
            notif_count += 1
        except Exception:
            db.rollback()

db.commit()
print(f"  Added {notif_count} notifications")

# ─── 9. Add activity logs ────────────────────────────────────────────────────
print("Adding activity logs...")
actions = [
    ("created_task", "task", "Created task '{name}'"),
    ("completed_task", "task", "Completed task '{name}'"),
    ("updated_task", "task", "Updated task '{name}'"),
    ("assigned_task", "task", "Assigned '{name}' to {user}"),
    ("added_comment", "comment", "Commented on '{name}'"),
    ("created_team", "team", "Created team '{team}'"),
    ("added_member", "team", "Added {user} to {team}"),
    ("joined_org", "user", "{user} joined the organization"),
    ("deployed", "deployment", "Deployed to production"),
    ("merged_pr", "pull_request", "Merged PR #{pr_num}: {name}"),
]

log_count = 0
task_names = [t[0] for t in tasks_data]
team_names = [t[0] for t in teams_to_create] + ["General"]
user_names = [u[2] for u in ORG7_USERS]

for days_ago in range(180, -1, -1):
    if random.random() < 0.3:
        continue
    num_actions = random.randint(1, 6)
    for _ in range(num_actions):
        action, entity_type, msg_template = random.choice(actions)
        user_id = random.choice(ORG7_UIDS)
        task_name = random.choice(task_names)
        team_name = random.choice(team_names)
        user_name = random.choice(user_names)
        msg = msg_template.format(
            name=task_name, team=team_name, user=user_name, pr_num=random.randint(1, 80))
        team_id_for_log = random.choice(list(all_team_ids.values())) if random.random() > 0.3 else None
        metadata = json.dumps({"description": msg})
        ins("activity_log",
            org_id=7, team_id=team_id_for_log, user_id=user_id,
            action=action, entity_type=entity_type,
            entity_id=random.randint(1, 100),
            metadata_json=metadata, created_at=dt(days_ago))
        log_count += 1

db.commit()
print(f"  Added {log_count} activity log entries")

# ─── Done ─────────────────────────────────────────────────────────────────────
print("\n=== Final counts for org 7 (NexusWave Technologies) ===")
for table, query in [
    ("users",          "SELECT COUNT(*) FROM users WHERE org_id=7"),
    ("teams",          "SELECT COUNT(*) FROM teams WHERE org_id=7"),
    ("team_members",   "SELECT COUNT(*) FROM team_members tm JOIN teams t ON tm.team_id=t.team_id WHERE t.org_id=7"),
    ("tasks",          "SELECT COUNT(*) FROM tasks WHERE org_id=7"),
    ("task_comments",  "SELECT COUNT(*) FROM task_comments tc JOIN tasks t ON tc.task_id=t.task_id WHERE t.org_id=7"),
    ("task_reactions",  "SELECT COUNT(*) FROM task_reactions tr JOIN tasks t ON tr.task_id=t.task_id WHERE t.org_id=7"),
    ("notifications",  "SELECT COUNT(*) FROM notifications WHERE user_id IN (SELECT user_id FROM users WHERE org_id=7)"),
    ("activity_log",   "SELECT COUNT(*) FROM activity_log WHERE org_id=7"),
]:
    r = db.execute(text(query)).scalar()
    print(f"  {table}: {r}")

db.close()
print("\nSeed complete!")
