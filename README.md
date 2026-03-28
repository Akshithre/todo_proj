# Smart To-Do Task Optimizer

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript)
![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?logo=microsoftazure)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)

An intelligent task management application powered by Azure cloud services and machine learning. It helps users prioritize tasks, predicts completion times, and provides productivity analytics.

## Architecture

```
┌─────────────────────┐     REST API      ┌─────────────────────┐
│   React Frontend    │ ───────────────── │   FastAPI Backend   │
│  (TypeScript + TW)  │    axios / JSON    │  (Python 3.11)      │
└─────────────────────┘                    └────────┬────────────┘
        │                                           │
        │                                  ┌────────┴────────────┐
        │                                  │   SQLAlchemy ORM    │
        │                                  └────────┬────────────┘
        │                                           │
        │                                  ┌────────┴────────────┐
        │                                  │  Azure SQL Database │
        │                                  └────────┬────────────┘
        │                                           │
        │                              ┌────────────┴──────────────┐
        │                              │  Azure Data Factory (ETL) │
        │                              │  SQL → Transform → Blob   │
        │                              └────────────┬──────────────┘
        │                                           │
        │                              ┌────────────┴──────────────┐
        │                              │  Azure Blob Storage       │
        │                              │  (raw + processed CSVs)   │
        │                              └────────────┬──────────────┘
        │                                           │
        │                              ┌────────────┴──────────────┐
        │                              │  Azure ML (sklearn models)│
        │                              │  Priority + Completion    │
        │                              └───────────────────────────┘
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **ODBC Driver 18 for SQL Server** ([download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)) — optional, falls back to SQLite
- **Azure subscription** — for cloud features (optional for local dev)

## Local Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd todo_proj
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Start the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

4. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Train ML models** (optional)
   ```bash
   cd ml
   python train_priority_model.py
   python train_completion_model.py
   ```

6. **Using Docker Compose** (alternative)
   ```bash
   docker-compose up --build
   ```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | SQLAlchemy DB URL (defaults to SQLite) |
| `AZURE_STORAGE_CONNECTION_STRING` | For ML training | Azure Blob Storage connection |
| `AZURE_STORAGE_CONTAINER` | For ML training | Blob container name |
| `AZURE_ML_ENDPOINT` | For cloud ML | Azure ML scoring endpoint |
| `AZURE_ML_KEY` | For cloud ML | Azure ML API key |
| `ALLOWED_ORIGINS` | No | CORS origins (defaults to localhost:3000) |
| `REACT_APP_API_URL` | No | Backend URL (defaults to localhost:8000) |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks` | List all tasks |
| `GET` | `/tasks/{id}` | Get task by ID |
| `PUT` | `/tasks/{id}` | Update a task |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `GET` | `/tasks/suggestions` | Get priority re-prioritization suggestions |
| `GET` | `/tasks/{id}/predict-time` | Predict completion time for a task |

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

## Project Structure

```
todo_proj/
├── backend/                  # FastAPI REST API
│   ├── app/
│   │   ├── main.py           # API routes and ML integration
│   │   ├── models.py         # SQLAlchemy Task model
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   └── database.py       # DB engine and session setup
│   ├── tests/
│   │   └── test_api.py       # API endpoint tests (pytest)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React + TypeScript UI
│   ├── src/
│   │   ├── components/       # Navbar, TaskCard, TaskForm, SmartSuggestions
│   │   ├── pages/            # Dashboard, AddTask, TaskList, Analytics
│   │   ├── services/api.ts   # Axios API client
│   │   └── types.ts          # TypeScript interfaces
│   └── package.json
├── ml/                       # Machine learning
│   ├── train_priority_model.py    # GradientBoosting classifier
│   ├── train_completion_model.py  # RandomForest regressor
│   ├── score.py                   # Azure ML scoring script
│   └── upload_models.py          # Upload .pkl to Blob Storage
├── pipeline/
│   └── adf_pipeline.json    # Azure Data Factory pipeline definition
├── infra/
│   ├── main.bicep            # Azure Bicep IaC template
│   └── main.parameters.json  # Bicep parameters
├── .github/workflows/
│   └── deploy.yml            # CI/CD to Azure
├── docker-compose.yml        # Local dev with Docker
├── CLAUDE.md                 # Claude Code project instructions
├── .env.example              # Environment variable template
└── .gitignore
```

## Deployment

Push to `main` triggers GitHub Actions:
1. Backend: pytest -> deploy to Azure App Service
2. Frontend: npm build -> deploy to Azure Static Web Apps

See `.github/workflows/deploy.yml` for details.

## Screenshots

<!-- Add screenshots of Dashboard, Task List, Analytics pages here -->

## License

This project is for educational purposes.
