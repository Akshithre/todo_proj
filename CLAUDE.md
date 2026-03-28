# Smart To-Do Task Optimizer

An intelligent task management application that uses Azure cloud services and machine learning to help users prioritize tasks, predict completion times, and analyze productivity patterns.

## Architecture

```
React (TypeScript + Tailwind CSS)
  |
  | REST API (axios)
  v
FastAPI (Python)
  |
  |--- SQLAlchemy ORM ---> Azure SQL Database
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
**Backend:** FastAPI + SQLAlchemy + Pydantic
**ML:** scikit-learn (RandomForest for completion time, GradientBoosting for priority)
**Data Pipeline:** Azure Data Factory (SQL -> Blob with ETL transformations)
**Deployment:** GitHub Actions -> Azure App Service (backend) + Azure Static Web Apps (frontend)

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs on http://localhost:8000
# API docs at http://localhost:8000/docs
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

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string for Azure SQL. Falls back to `sqlite:///./todo.db` if unset. |
| `AZURE_SQL_CONNECTION_STRING` | ODBC connection string for Azure SQL Server |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string (used by ML training scripts and ADF) |
| `AZURE_STORAGE_CONTAINER` | Blob container name (default: `tododata`) |
| `AZURE_ML_ENDPOINT` | Azure ML scoring endpoint URL |
| `AZURE_ML_KEY` | API key for the Azure ML endpoint |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000`) |
| `REACT_APP_API_URL` | Backend API base URL for the frontend (default: `http://localhost:8000`) |

Copy `.env.example` to `.env` and fill in your values.

## Azure Services

| Service | Purpose |
|---|---|
| **Azure SQL Database** | Primary data store for tasks |
| **Azure Blob Storage** | Stores raw and processed task CSVs for ML training |
| **Azure Data Factory** | ETL pipeline: extracts completed tasks from SQL, transforms, loads to Blob |
| **Azure Machine Learning** | Hosts trained models as REST scoring endpoints |
| **Azure App Service** | Hosts the FastAPI backend |
| **Azure Static Web Apps** | Hosts the React frontend |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks` | List all tasks (newest first) |
| `GET` | `/tasks/{id}` | Get a single task |
| `PUT` | `/tasks/{id}` | Update a task |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `GET` | `/tasks/suggestions` | Get ML-based priority suggestions |
| `GET` | `/tasks/{id}/predict-time` | Predict completion time for a task |

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

## Frontend Pages & Features

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Split-layout auth page with floating decorative cards, shake animation on error |
| Register | `/register` | Account creation with password strength indicator and requirement checklist |
| Dashboard | `/` | Command center with stat cards, circular progress ring, priority tasks, AI suggestions |
| My Tasks | `/tasks` | List + Kanban views, live search (`/` shortcut), filters, sort, drag-and-drop between columns |
| Add Task | `/add` | Form with progress indicator, visual priority picker, live card preview |
| Analytics | `/analytics` | Completion trend (area chart), priority distribution (donut), avg time (bar), 7-day heatmap, AI insights |
| Smart AI | `/suggestions` | ML-powered task recommendations, predicted completion times, productivity score |
| Settings | `/settings` | Profile, preferences (default priority/time, notifications), CSV export, theme toggle, delete account |

### UI/UX Features
- **Design system:** Dark theme with glass morphism, electric violet accent, Inter font
- **Sidebar navigation:** Collapsible desktop sidebar with glowing active indicator, mobile bottom tab bar
- **Quick Add FAB:** Floating action button on every page for rapid task creation (keyboard shortcut: `n`)
- **Keyboard shortcuts:** `n` = quick add, `/` = search, `Esc` = close modals
- **Animations:** Page transitions (framer-motion), staggered card entrances, confetti on task completion
- **Toast notifications:** react-hot-toast for all user feedback (no alert() calls)
- **Skeleton loaders:** Shimmer placeholders during data loading
- **Responsive:** Desktop sidebar, tablet icon sidebar, mobile bottom tab bar
- **Mock auth:** Demo credentials: `demo@todo.com` / `demo1234`
