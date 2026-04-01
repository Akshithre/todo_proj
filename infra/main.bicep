@description('Base name for all resources')
param projectName string = 'todo-optimizer'

@description('Azure region for deployment')
param location string = resourceGroup().location

@description('SQL Server admin username')
param sqlAdminUser string

@description('SQL Server admin password')
@secure()
param sqlAdminPassword string

@description('App Service Plan SKU')
param appServiceSku string = 'B1'

@description('JWT secret key for token signing')
@secure()
param jwtSecretKey string

// ── Variables ────────────────────────────────────────────────────────────────

var uniqueSuffix = uniqueString(resourceGroup().id)
var appServicePlanName = '${projectName}-plan'
var webAppName = '${projectName}-api'
var sqlServerName = '${projectName}-sql-${uniqueSuffix}'
var sqlDatabaseName = '${projectName}-db'
var storageAccountName = replace('${projectName}store${uniqueSuffix}', '-', '')
var staticWebAppName = '${projectName}-frontend'
var mlWorkspaceName = '${projectName}-ml'
var blobContainerName = 'tododata'

// ── App Service Plan ─────────────────────────────────────────────────────────

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSku
  }
  properties: {
    reserved: true
  }
}

// ── Web App (FastAPI Backend) ────────────────────────────────────────────────

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appCommandLine: 'gunicorn -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 app.main:app'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '8000'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'DATABASE_URL'
          value: 'mssql+pyodbc://${sqlAdminUser}:${sqlAdminPassword}@${sqlServer.properties.fullyQualifiedDomainName}/${sqlDatabaseName}?driver=ODBC+Driver+18+for+SQL+Server'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: blobContainerName
        }
        {
          name: 'JWT_SECRET_KEY'
          value: jwtSecretKey
        }
        {
          name: 'ALLOWED_ORIGINS'
          value: 'https://${staticWebApp.properties.defaultHostname}'
        }
      ]
    }
  }
}

// ── Static Web App (React Frontend) ─────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
  }
  properties: {}
}

// ── SQL Server + Database ────────────────────────────────────────────────────

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminUser
    administratorLoginPassword: sqlAdminPassword
  }
}

resource sqlFirewallAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
}

// ── Storage Account + Blob Container ─────────────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take(storageAccountName, 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: blobContainerName
}

// ── Azure ML Workspace ───────────────────────────────────────────────────────

resource mlWorkspace 'Microsoft.MachineLearningServices/workspaces@2023-10-01' = {
  name: mlWorkspaceName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    storageAccount: storageAccount.id
    friendlyName: 'Todo Optimizer ML'
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output storageAccountName string = storageAccount.name
output mlWorkspaceId string = mlWorkspace.id
