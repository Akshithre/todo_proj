# Smart To-Do Task Optimizer

An intelligent task management application that uses Azure cloud services and machine learning to help teams prioritize tasks, predict completion times, and analyze productivity patterns.

## Architecture

```
React (TypeScript + Tailwind CSS)
  |
  | REST API (axios + JWT auth)
  v
FastAPI (Python)
  |
  |--- SQLAlchemy ORM ---> Azure SQL Database
  |--- bcrypt + JWT -----> Authentication
  |--- joblib models ----> ML Models (.pkl files)
  |
Azure Data Factory Pipeline
  |--- Reads completed tasks from Azure SQL
  |--- Transforms data (normalize, clean, calculate metrics)
  |--- Writes processed CSV to Azure Blob Storage
  |
Azure ML (scoring endpoint)
  |--- Loads trained models
  |--- Serves predictions via REST
```

**Frontend:** React 18 + TypeScript + Tailwind CSS + Recharts + Framer Motion + lucide-react
**Backend:** FastAPI + SQLAlchemy + Pydantic + JWT Auth (python-jose + bcrypt)
**ML:** scikit-learn (RandomForest for completion time, GradientBoosting for priority)
**Data Pipeline:** Azure Data Factory (SQL -> Blob with ETL transformations)
**Deployment:** GitHub Actions -> Azure App Service (backend) + Azure Static Web Apps (frontend)

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
# Runs on http://localhost:8001
# API docs at http://localhost:8001/docs
```

### Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### Train ML Models
```bash
cd ml
python train_priority_model.py
python train_completion_model.py
# Produces priority_model.pkl and completion_model.pkl in ml/
```

## Running Tests

```bash
# Backend tests (from project root)
cd backend && python -m pytest tests/ -v

# Frontend tests (from project root)
cd frontend && npm test
```

## Database Schema

### Tables
| Table | Description |
|---|---|
| `organizations` | Multi-tenant orgs with plans (free/pro/enterprise) |
| `users` | Users with email/password auth, roles (superadmin/admin/member) |
| `teams` | Teams within organizations, with color and icon |
| `team_members` | Team membership with roles (owner/admin/member) |
| `tasks` | Tasks with user/team/org ownership, assignment, dependencies |
| `task_comments` | Threaded comments with @mentions |
| `task_reactions` | Emoji reactions (unique per user/task/emoji) |
| `task_mentions` | @mention tracking for notifications |
| `notifications` | User notifications (mention/comment/reaction/assignment/deadline) |
| `activity_log` | Org/team activity feed with JSON metadata |
| `invite_tokens` | Organization invite tokens for member onboarding |

### Seeded Data
- Superadmin: `admin@taskoptimizer.com` / `Admin@2024`

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string for Azure SQL. Falls back to `sqlite:///./todo.db` if unset. |
| `JWT_SECRET_KEY` | Secret for JWT tokens (default: built-in dev key) |
| `AZURE_SQL_CONNECTION_STRING` | ODBC connection string for Azure SQL Server |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | Blob container name (default: `tododata`) |
| `AZURE_ML_ENDPOINT` | Azure ML scoring endpoint URL |
| `AZURE_ML_KEY` | API key for the Azure ML endpoint |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000`) |
| `FRONTEND_URL` | Frontend URL for invite links (default: `http://localhost:3000`) |
| `REACT_APP_API_URL` | Backend API base URL for the frontend (default: `http://localhost:8001`) |

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register user (creates org if org_name provided) |
| `POST` | `/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Get current user profile |
| `PUT` | `/auth/me` | Update profile (name, avatar) |
| `POST` | `/auth/change-password` | Change password |
| `POST` | `/auth/accept-invite/{token}` | Accept org invite |

### Tasks (JWT protected, backward-compatible without auth)
| Method | Path | Description |
|---|---|---|
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks` | List tasks (filters: team_id, assigned_to, status, archived) |
| `GET` | `/tasks/{id}` | Get a single task with counts |
| `PUT` | `/tasks/{id}` | Update a task |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `POST` | `/tasks/{id}/duplicate` | Duplicate a task |
| `POST` | `/tasks/bulk-assign` | Bulk assign tasks |
| `GET` | `/tasks/suggestions` | ML-based priority suggestions |
| `GET` | `/tasks/{id}/predict-time` | Predict completion time |

### Social Features
| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks/{id}/comments` | Get threaded comments |
| `POST` | `/tasks/{id}/comments` | Add comment (parses @mentions) |
| `PUT` | `/tasks/{id}/comments/{cid}` | Edit own comment |
| `DELETE` | `/tasks/{id}/comments/{cid}` | Delete own comment |
| `GET` | `/tasks/{id}/reactions` | Get reactions with counts |
| `POST` | `/tasks/{id}/reactions` | Add reaction |
| `DELETE` | `/tasks/{id}/reactions/{emoji}` | Remove reaction |

### Notifications
| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications` | Get user notifications |
| `GET` | `/notifications/unread-count` | Unread count for badge |
| `PUT` | `/notifications/{id}/read` | Mark as read |
| `PUT` | `/notifications/read-all` | Mark all as read |

### Organizations
| Method | Path | Description |
|---|---|---|
| `GET` | `/organizations/me` | Get user's org |
| `PUT` | `/organizations/me` | Update org (admin) |
| `GET` | `/organizations/me/stats` | Org stats |
| `GET` | `/organizations/me/members` | List org members |
| `POST` | `/organizations/me/invite` | Generate invite link |
| `GET` | `/organizations/me/activity` | Org activity feed |

### Teams
| Method | Path | Description |
|---|---|---|
| `GET` | `/teams` | List teams |
| `POST` | `/teams` | Create team (admin) |
| `GET` | `/teams/{id}` | Team detail with members |
| `PUT` | `/teams/{id}` | Update team |
| `DELETE` | `/teams/{id}` | Delete team (admin) |
| `POST` | `/teams/{id}/members` | Add member by email |
| `DELETE` | `/teams/{id}/members/{uid}` | Remove member |
| `PUT` | `/teams/{id}/members/{uid}/role` | Change member role |
| `GET` | `/teams/{id}/activity` | Team activity feed |
| `GET` | `/teams/{id}/workload` | Team workload visualization data |

### AI & Analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/ai/weekly-digest` | AI weekly digest with insights |

### Admin (superadmin only)
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Platform-wide stats |
| `GET` | `/admin/organizations` | List all orgs |
| `POST` | `/admin/organizations` | Create org |
| `GET` | `/admin/users` | List all users |

## Frontend Pages & Features

| Page | Route | Description |
|---|---|---|
| Landing | `/` (unauthenticated) | SaaS landing page with hero, features, pricing, testimonials |
| Login | `/login` | Split-layout auth with floating cards, shake on error |
| Register | `/register` | 3-step form: details, organization setup, welcome |
| Accept Invite | `/accept-invite/:token` | Accept organization invite |
| Dashboard | `/` | Stats, priority tasks, AI suggestions, weekly digest |
| My Tasks | `/tasks` | List + Kanban views, search, filters, task drawer |
| Add Task | `/add` | Form with progress, priority picker, live preview |
| Analytics | `/analytics` | Charts: completion trend, priority dist, avg time, heatmap |
| Smart AI | `/suggestions` | ML recommendations, predictions, productivity score |
| Teams | `/teams` | Team cards grid, create team modal |
| Team Detail | `/teams/:id` | Members, workload bars, activity feed |
| Admin | `/admin` | Superadmin panel: org/user tables, platform stats |
| Notifications | `/notifications` | Full notification list with filters |
| Settings | `/settings` | Profile, org settings, preferences, password, export, theme |

### UI/UX Features
- **Landing page:** Professional SaaS landing with hero, features grid, how it works, testimonials, pricing tiers, CTA
- **Real JWT auth:** No more demo accounts - bcrypt password hashing, JWT access/refresh tokens
- **Multi-tenant:** Organizations, teams, role-based access control
- **Task drawer:** Slide-in panel with comments, reactions, assignment, AI prediction
- **Comments:** Threaded replies, @mention autocomplete, highlighted mentions
- **Reactions:** Emoji reactions (thumbs up, heart, fire, check, target) with counts
- **Notifications:** Bell icon with unread badge, dropdown panel, polling every 30s
- **Command palette:** Ctrl+K to open, search commands, keyboard navigation
- **Initials avatars:** Colored gradient avatars generated from user names
- **Loading bar:** Top page loading indicator
- **Workload view:** Horizontal bar charts showing team member task distribution
- **Weekly digest:** AI-generated team productivity summary
- **Task duplication:** One-click task copy
- **CSV export:** Download all tasks as CSV
- **Invite system:** Generate invite links for organization onboarding
- **Activity feeds:** Org-wide and team-level activity logs
- **Design system:** Dark theme, glass morphism, noise texture, Inter + JetBrains Mono fonts
- **Keyboard shortcuts:** `n` = quick add, `/` = search, `Ctrl+K` = command palette, `Esc` = close
- **Responsive:** Desktop sidebar, mobile bottom tab bar
- **Animations:** Page transitions, staggered cards, confetti on completion

## Deployment

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`):

1. Push to `main` branch triggers the workflow
2. **Backend job:** installs Python deps, runs pytest, deploys to Azure App Service (`todo-optimizer-api`)
3. **Frontend job:** installs Node deps, builds React app, deploys to Azure Static Web Apps

Required GitHub secrets: `AZURE_CREDENTIALS`, `API_URL`, `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Infrastructure

Azure resources can be provisioned using the Bicep template in `infra/main.bicep`:
```bash
az deployment group create --resource-group <rg-name> --template-file infra/main.bicep --parameters infra/main.parameters.json
```

## Troubleshooting

- **ODBC Driver not found:** Install [Microsoft ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server). Without it, the backend falls back to SQLite.
- **Missing .pkl model files:** Run the ML training scripts (see above). Without them, prediction endpoints use rule-based fallbacks.
- **CORS errors:** Set `ALLOWED_ORIGINS` in `.env` to your frontend URL. Multiple origins can be comma-separated.
- **Frontend can't reach backend:** Set `REACT_APP_API_URL` in `.env` or as an environment variable before running `npm start`.
- **bcrypt errors on Windows:** Ensure you have `bcrypt>=4.0.0` installed. The app uses bcrypt directly (not passlib).
