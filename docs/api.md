# API Reference - DataMediator

## Overview

DataMediator expose deux API principales :
- **REST API** : `/api/*` - FastAPI avec documentation Swagger
- **GraphQL API** : `/graphql` - Strawberry GraphQL

## Authentification

Toutes les requêtes API nécessitent un token JWT :

```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Utilisation du token
curl -X GET http://localhost:5001/api/schema/global \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

## Utilisateurs de Démo

| Username | Password | Role |
|----------|-----------|------|
| admin | admin123 | ADMIN |
| hr | hr123 | HR_MANAGER |
| project | project123 | PROJECT_MANAGER |
| finance | finance123 | FINANCE_MANAGER |
| viewer | viewer123 | VIEWER |

## REST API Endpoints

### Authentification

#### POST `/api/auth/login`
Authentifie un utilisateur et retourne un token JWT.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "username": "admin",
    "name": "Administrator",
    "role": "ADMIN"
  }
}
```

#### GET `/api/auth/me`
Retourne les informations de l'utilisateur authentifié.

**Headers:**
```
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "username": "admin",
  "name": "Administrator",
  "role": "ADMIN",
  "policy": {
    "read": ["*"],
    "write": ["*"],
    "delete": ["*"]
  }
}
```

### Schéma

#### GET `/api/schema/global`
Retourne le schéma global des tables.

**Response:**
```json
{
  "schema": {
    "GlobalEmployee": [
      {"name": "employee_id", "type": "VARCHAR"},
      {"name": "full_name", "type": "VARCHAR"},
      {"name": "department_id", "type": "VARCHAR"},
      {"name": "salary_usd", "type": "DECIMAL"}
    ],
    "GlobalDepartment": [
      {"name": "department_id", "type": "VARCHAR"},
      {"name": "department_name", "type": "VARCHAR"}
    ]
  }
}
```

#### GET `/api/schema/sources`
Retourne les informations sur les sources de données.

**Response:**
```json
{
  "sources": [
    {
      "source_id": "S1",
      "name": "PostgreSQL HR",
      "type": "postgresql",
      "online": true,
      "tables": ["employees", "departments"]
    }
  ]
}
```

### Requêtes

#### POST `/api/query/execute`
Exécute une requête SQL sur les données globales.

**Request:**
```json
{
  "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 5",
  "mode": "GAV"
}
```

**Response:**
```json
{
  "mode": "GAV",
  "global_sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 5",
  "columns": ["employee_id", "full_name"],
  "rows": [
    {"employee_id": "EMP:0001", "full_name": "Amine Bensaid"},
    {"employee_id": "EMP:0002", "full_name": "Claire Martin"}
  ],
  "row_count": 5,
  "plan": {
    "strategy": "GAV",
    "sources": ["S1", "S2"],
    "estimated_cost": 15
  },
  "reconciliation": [
    {
      "canonical_id": "EMP:0001",
      "merged_from": ["S1", "S2"],
      "chosen_source": "S1",
      "score": 0.95
    }
  ],
  "execution_ms": 245,
  "cached": false
}
```

#### POST `/api/query/explain`
Retourne le plan d'exécution sans exécuter la requête.

**Request:**
```json
{
  "sql": "SELECT * FROM GlobalEmployee WHERE status = 'ACTIVE'",
  "mode": "LAV"
}
```

**Response:**
```json
{
  "plan": {
    "strategy": "LAV",
    "sources": ["S1", "S2"],
    "joins": [],
    "estimated_cost": 25
  },
  "reconciliation": []
}
```

### Dashboard

#### POST `/api/dashboard/metrics`
Retourne les métriques pour le tableau de bord.

**Request:**
```json
{
  "timeRange": "7d",
  "department": "all"
}
```

**Response:**
```json
{
  "metrics": {
    "totalEmployees": 150,
    "activeProjects": 12,
    "reconciliationRate": 87,
    "avgSalary": 45000,
    "conflictsResolved": 23,
    "dataFreshness": 2
  },
  "charts": {
    "departmentDistribution": [
      {"department": "IT", "count": 45},
      {"department": "Finance", "count": 30}
    ],
    "projectStatus": [
      {"status": "ACTIVE", "count": 12},
      {"status": "COMPLETED", "count": 8}
    ]
  },
  "alerts": [
    {
      "type": "warning",
      "message": "Taux de réconciliation < 90%",
      "severity": "medium"
    }
  ]
}
```

#### POST `/api/dashboard/export`
Exporte les données du dashboard.

**Request:**
```json
{
  "format": "csv",
  "timeRange": "7d"
}
```

**Response:** Fichier CSV/PDF selon le format demandé.

### Conflits

#### POST `/api/conflicts/list`
Liste tous les conflits de données.

**Response:**
```json
{
  "conflicts": [
    {
      "id": "conflict_001",
      "canonical_id": "EMP:0001",
      "type": "duplicate",
      "reason": "Employé trouvé dans plusieurs sources",
      "score": 0.75,
      "merged_from": ["S1", "S2"],
      "chosen_source": "",
      "timestamp": "2026-05-12T14:00:00Z"
    }
  ]
}
```

#### GET `/api/conflicts/rules`
Retourne les règles de résolution de conflits.

**Response:**
```json
{
  "rules": [
    {
      "id": "highest_confidence",
      "name": "Plus haute confiance",
      "description": "Choisir la source avec le score de confiance le plus élevé",
      "priority": 1,
      "enabled": true
    }
  ]
}
```

#### POST `/api/conflicts/resolve`
Résout un conflit spécifique.

**Request:**
```json
{
  "conflictId": "conflict_001",
  "resolution": "highest_confidence",
  "chosenSource": "S1"
}
```

**Response:**
```json
{
  "success": true,
  "conflictId": "conflict_001",
  "resolution": "highest_confidence",
  "chosenSource": "S1",
  "resolvedBy": "admin",
  "timestamp": "2026-05-12T14:30:00Z"
}
```

#### POST `/api/conflicts/auto-resolve`
Résout automatiquement les conflits.

**Response:**
```json
{
  "success": true,
  "resolved": 15,
  "total": 20,
  "resolvedBy": "auto",
  "timestamp": "2026-05-12T14:00:00Z"
}
```

### Cache

#### GET `/api/cache/stats`
Retourne les statistiques du cache.

**Response:**
```json
{
  "cache": {
    "hits": 1250,
    "misses": 180,
    "hit_rate": 87.4,
    "memory_entries": 45,
    "redis_connected": true
  },
  "performance": {
    "total_queries": 1430,
    "avg_query_time": 0.245,
    "slow_queries": []
  }
}
```

#### POST `/api/cache/clear**
Vide tout le cache (admin uniquement).

**Response:**
```json
{
  "success": true,
  "message": "Cache vidé avec succès"
}
```

#### POST `/api/cache/invalidate`
Invalide des entrées de cache spécifiques.

**Request:**
```json
{
  "pattern": "GlobalEmployee*",
  "table": "GlobalEmployee"
}
```

**Response:**
```json
{
  "success": true,
  "invalidated": 23
}
```

### Monitoring

#### GET `/api/monitoring/health`
Health check principal du système.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-12T14:00:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection OK",
      "response_time": 15
    },
    "cache": {
      "status": "healthy",
      "message": "Redis cache OK",
      "response_time": 5
    }
  }
}
```

#### GET `/api/monitoring/metrics`
Retourne les métriques complètes (admin/hr_manager uniquement).

**Response:**
```json
{
  "system": {
    "cpu": {"percent": 25.5, "count": 8},
    "memory": {"percent": 45.2, "used": 8192000000, "total": 17179869184},
    "disk": {"percent": 65.8, "free": 50000000000, "total": 150000000000}
  },
  "application": {
    "cache": {"hit_rate": 87.4},
    "performance": {"total_queries": 1430, "avg_query_time": 0.245}
  },
  "health": {
    "overall": "healthy",
    "checks": {...}
  }
}
```

### Profil Utilisateur

#### GET `/api/user/profile`
Retourne le profil de l'utilisateur.

**Response:**
```json
{
  "profile": {
    "username": "admin",
    "name": "Administrator",
    "role": "ADMIN",
    "email": "admin@datamediator.pro",
    "avatar": "",
    "bio": "Administrator - ADMIN chez DataMediator",
    "location": "Alger, Algérie",
    "timezone": "Africa/Algiers",
    "language": "fr"
  }
}
```

#### PUT `/api/user/profile`
Met à jour le profil de l'utilisateur.

**Request:**
```json
{
  "profile": {
    "name": "Admin Updated",
    "email": "admin.updated@datamediator.pro",
    "location": "Paris, France"
  }
}
```

#### GET `/api/user/preferences`
Retourne les préférences de l'utilisateur.

**Response:**
```json
{
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": true,
      "desktop": false,
      "sound": true
    },
    "dashboard": {
      "defaultView": "analytics",
      "refreshInterval": 30,
      "compactMode": false
    }
  }
}
```

#### GET `/api/user/export`
Exporte toutes les données de l'utilisateur.

**Response:** Fichier JSON avec toutes les données utilisateur.

### Reporting

#### GET `/api/reports/formats`
Retourne les formats de rapport disponibles.

**Response:**
```json
{
  "formats": ["csv", "json", "html", "pdf", "xlsx"],
  "templates": ["analytics", "simple"],
  "dependencies": {
    "pdf_available": true,
    "excel_available": true
  }
}
```

#### POST `/api/reports/generate`
Génère un rapport selon les spécifications.

**Request:**
```json
{
  "report_type": "analytics",
  "format": "pdf",
  "title": "Rapport Analytics Mensuel",
  "filters": {
    "timeRange": "30d",
    "department": "IT"
  }
}
```

**Response:** Fichier généré selon le format.

#### POST `/api/reports/schedule`
Planifie un rapport récurrent (admin/hr_manager uniquement).

**Request:**
```json
{
  "report_id": "monthly_analytics",
  "schedule": "monthly",
  "recipients": ["admin@datamediator.pro"],
  "config": {
    "report_type": "analytics",
    "format": "pdf",
    "title": "Rapport Mensuel"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rapport monthly_analytics planifié avec succès",
  "next_run": "2026-06-01T09:00:00Z"
}
```

## GraphQL API

### Endpoint
```
http://localhost:5002/graphql
```

### Schema
Le schema GraphQL est disponible à `/graphql/schema`.

### Requêtes Exemples

#### Obtenir des employés
```graphql
query {
  employees(limit: 10) {
    employee_id
    full_name
    email
    department_name
    salary_usd
    status
  }
}
```

#### Obtenir un employé spécifique
```graphql
query {
  employee(employeeId: "EMP:0001") {
    employee_id
    full_name
    email
    department_name
    salary_usd
    source_confidence
  }
}
```

#### Obtenir les métriques
```graphql
query {
  metrics {
    totalEmployees
    activeProjects
    avgSalary
    conflictsResolved
  }
}
```

#### Filtres et pagination
```graphql
query {
  employees(
    filter: {departmentId: "DEPT:001", status: "ACTIVE"}
    limit: 20
    offset: 0
  ) {
    employee_id
    full_name
    department_name
    salary_usd
  }
}
```

### Mutations

#### Résoudre un conflit
```graphql
mutation {
  resolveConflict(
    conflictId: "conflict_001"
    resolution: "highest_confidence"
    chosenSource: "S1"
  )
}
```

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Permission refusée |
| 404 | Ressource non trouvée |
| 422 | Validation échouée |
| 429 | Trop de requêtes |
| 500 | Erreur serveur |

## Rate Limiting

- **Utilisateurs authentifiés**: 1000 requêtes/heure
- **Utilisateurs anonymes**: 100 requêtes/heure
- **Endpoints sensibles**: 100 requêtes/heure

## Pagination

Pour les endpoints retournant des listes, utilisez :
- `limit`: Nombre d'éléments par page (max 100)
- `offset`: Décalage pour la pagination

## Filtres

Les filtres supportés varient selon l'endpoint :

### Filtres temporels
- `timeRange`: `1d`, `7d`, `30d`, `90d`, `1y`
- `startDate`, `endDate`: Format ISO 8601

### Filtres de données
- `department`: ID du département
- `status`: `ACTIVE`, `INACTIVE`, `PENDING`
- `source`: ID de la source (`S1`, `S2`, etc.)

## SDKs

### Python
```python
from datamediator_client import DataMediatorClient

client = DataMediatorClient(
    base_url="http://localhost:5001",
    token="VOTRE_TOKEN"
)

# Exécuter une requête
result = client.query.execute(
    sql="SELECT * FROM GlobalEmployee LIMIT 10",
    mode="GAV"
)

# Obtenir les métriques
metrics = client.dashboard.get_metrics(time_range="7d")
```

### JavaScript
```javascript
import { DataMediatorClient } from 'datamediator-js';

const client = new DataMediatorClient({
  baseURL: 'http://localhost:5001',
  token: 'VOTRE_TOKEN'
});

// Exécuter une requête
const result = await client.query.execute({
  sql: 'SELECT * FROM GlobalEmployee LIMIT 10',
  mode: 'GAV'
});

// Obtenir les métriques
const metrics = await client.dashboard.getMetrics({ timeRange: '7d' });
```

## Webhooks

Configurez des webhooks pour recevoir des notifications :

```bash
curl -X POST http://localhost:5001/api/webhooks/configure \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["conflict.resolved", "query.completed"],
    "secret": "webhook-secret"
  }'
```

## Support

- **Documentation complète**: http://localhost:5001/docs
- **GraphQL Playground**: http://localhost:5002/graphql
- **Status API**: http://localhost:5001/api/health
- **Support**: support@datamediator.pro
