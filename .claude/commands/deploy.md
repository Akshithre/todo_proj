Deployment is automated via GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

**Trigger:** Push to `main` branch.

**Backend deployment:**
1. Sets up Python 3.11
2. Installs pip dependencies from `backend/requirements.txt`
3. Runs pytest
4. Logs into Azure using `AZURE_CREDENTIALS` secret
5. Deploys `backend/` to Azure App Service (`todo-optimizer-api`)

**Frontend deployment:**
1. Sets up Node.js 18
2. Runs `npm ci` and `npm run build` in `frontend/`
3. Deploys to Azure Static Web Apps using `AZURE_STATIC_WEB_APPS_API_TOKEN` secret

**Required GitHub Secrets:**
- `AZURE_CREDENTIALS` — Azure service principal JSON
- `API_URL` — Backend API URL for the React build
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — Static Web Apps deployment token
