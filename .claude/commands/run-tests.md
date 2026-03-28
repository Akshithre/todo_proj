Run all project tests (backend + frontend).

Backend tests (pytest):
```bash
cd backend && python -m pytest tests/ -v
```

Frontend tests (Jest):
```bash
cd frontend && npm test -- --watchAll=false
```
