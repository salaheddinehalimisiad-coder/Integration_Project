"""
DataMediator Pro - GraphQL API Server
Alternative API avec GraphQL pour des requêtes plus flexibles et optimisées
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import strawberry
from strawberry import Schema, field, type
from strawberry.fastapi import GraphQLRouter
from datetime import datetime
import logging

from enterprise_mediator import (
    fetch_global_table, 
    QueryEngine, 
    GLOBAL_SCHEMA, 
    ROLE_POLICIES,
    resolve_user
)

logger = logging.getLogger(__name__)

# Configuration GraphQL
@strawberry.type
class Employee:
    employee_id: str
    full_name: str
    email: str
    birth_date: str
    department_id: str
    department_name: str
    country: str
    salary_usd: float
    status: str
    source_confidence: float
    _source: str
    _local_id: str
    _merged_from: List[str]

@strawberry.type
class Department:
    department_id: str
    department_name: str
    country: str

@strawberry.type
class Project:
    project_id: str
    project_name: str
    status: str
    budget_usd: float

@strawberry.type
class Assignment:
    assignment_id: str
    employee_id: str
    project_id: str
    role: str
    allocation_percentage: float

@strawberry.type
class Payroll:
    payroll_id: str
    employee_id: str
    salary_usd: float
    bonus_usd: float
    risk_level: str
    payment_date: str

@strawberry.type
class QueryMetrics:
    total_employees: int
    active_projects: int
    avg_salary: float
    conflicts_resolved: int

@strawberry.type
class ConflictInfo:
    id: str
    canonical_id: str
    type: str
    reason: str
    score: float
    merged_from: List[str]
    chosen_source: str

@strawberry.input
class EmployeeFilter:
    department_id: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None

@strawberry.input
class ProjectFilter:
    status: Optional[str] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None

@strawberry.type
class Query:
    """Racine des requêtes GraphQL"""
    
    @field
    async def employees(
        self, 
        info, 
        filter: Optional[EmployeeFilter] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Employee]:
        """Récupérer les employés avec filtres optionnels"""
        try:
            # Récupérer l'utilisateur depuis le contexte
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            # Récupérer les données
            employees_data, _ = fetch_global_table("GlobalEmployee", user)
            
            # Appliquer les filtres
            filtered_employees = employees_data
            
            if filter:
                if filter.department_id:
                    filtered_employees = [e for e in filtered_employees if e.get("department_id") == filter.department_id]
                if filter.country:
                    filtered_employees = [e for e in filtered_employees if e.get("country") == filter.country]
                if filter.status:
                    filtered_employees = [e for e in filtered_employees if e.get("status") == filter.status]
                if filter.min_salary:
                    filtered_employees = [e for e in filtered_employees if e.get("salary_usd", 0) >= filter.min_salary]
                if filter.max_salary:
                    filtered_employees = [e for e in filtered_employees if e.get("salary_usd", 0) <= filter.max_salary]
            
            # Appliquer la pagination
            if offset:
                filtered_employees = filtered_employees[offset:]
            if limit:
                filtered_employees = filtered_employees[:limit]
            
            # Convertir en objets GraphQL
            return [
                Employee(
                    employee_id=emp.get("employee_id", ""),
                    full_name=emp.get("full_name", ""),
                    email=emp.get("email", ""),
                    birth_date=emp.get("birth_date", ""),
                    department_id=emp.get("department_id", ""),
                    department_name=emp.get("department_name", ""),
                    country=emp.get("country", ""),
                    salary_usd=emp.get("salary_usd", 0.0),
                    status=emp.get("status", ""),
                    source_confidence=emp.get("source_confidence", 0.0),
                    _source=emp.get("_source", ""),
                    _local_id=emp.get("_local_id", ""),
                    _merged_from=emp.get("_merged_from", [])
                )
                for emp in filtered_employees
            ]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des employés: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def employee(self, info, employee_id: str) -> Optional[Employee]:
        """Récupérer un employé spécifique"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            employees_data, _ = fetch_global_table("GlobalEmployee", user)
            
            emp_data = next((e for e in employees_data if e.get("employee_id") == employee_id), None)
            
            if not emp_data:
                return None
            
            return Employee(
                employee_id=emp_data.get("employee_id", ""),
                full_name=emp_data.get("full_name", ""),
                email=emp_data.get("email", ""),
                birth_date=emp_data.get("birth_date", ""),
                department_id=emp_data.get("department_id", ""),
                department_name=emp_data.get("department_name", ""),
                country=emp_data.get("country", ""),
                salary_usd=emp_data.get("salary_usd", 0.0),
                status=emp_data.get("status", ""),
                source_confidence=emp_data.get("source_confidence", 0.0),
                _source=emp_data.get("_source", ""),
                _local_id=emp_data.get("_local_id", ""),
                _merged_from=emp_data.get("_merged_from", [])
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'employé: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def departments(self, info) -> List[Department]:
        """Récupérer tous les départements"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            departments_data, _ = fetch_global_table("GlobalDepartment", user)
            
            return [
                Department(
                    department_id=dept.get("department_id", ""),
                    department_name=dept.get("department_name", ""),
                    country=dept.get("country", "")
                )
                for dept in departments_data
            ]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des départements: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def projects(
        self, 
        info, 
        filter: Optional[ProjectFilter] = None,
        limit: Optional[int] = None
    ) -> List[Project]:
        """Récupérer les projets avec filtres optionnels"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            projects_data, _ = fetch_global_table("GlobalProject", user)
            
            # Appliquer les filtres
            filtered_projects = projects_data
            
            if filter:
                if filter.status:
                    filtered_projects = [p for p in filtered_projects if p.get("status") == filter.status]
                if filter.min_budget:
                    filtered_projects = [p for p in filtered_projects if p.get("budget_usd", 0) >= filter.min_budget]
                if filter.max_budget:
                    filtered_projects = [p for p in filtered_projects if p.get("budget_usd", 0) <= filter.max_budget]
            
            # Appliquer la limite
            if limit:
                filtered_projects = filtered_projects[:limit]
            
            return [
                Project(
                    project_id=proj.get("project_id", ""),
                    project_name=proj.get("project_name", ""),
                    status=proj.get("status", ""),
                    budget_usd=proj.get("budget_usd", 0.0)
                )
                for proj in filtered_projects
            ]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des projets: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def assignments(self, info, employee_id: Optional[str] = None) -> List[Assignment]:
        """Récupérer les affectations"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            assignments_data, _ = fetch_global_table("GlobalAssignment", user)
            
            # Filtrer par employé si spécifié
            if employee_id:
                assignments_data = [a for a in assignments_data if a.get("employee_id") == employee_id]
            
            return [
                Assignment(
                    assignment_id=assign.get("assignment_id", ""),
                    employee_id=assign.get("employee_id", ""),
                    project_id=assign.get("project_id", ""),
                    role=assign.get("role", ""),
                    allocation_percentage=assign.get("allocation_percentage", 0.0)
                )
                for assign in assignments_data
            ]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des affectations: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def payroll(self, info, employee_id: Optional[str] = None) -> List[Payroll]:
        """Récupérer les données de paie"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            payroll_data, _ = fetch_global_table("GlobalPayroll", user)
            
            # Filtrer par employé si spécifié
            if employee_id:
                payroll_data = [p for p in payroll_data if p.get("employee_id") == employee_id]
            
            return [
                Payroll(
                    payroll_id=pay.get("payroll_id", ""),
                    employee_id=pay.get("employee_id", ""),
                    salary_usd=pay.get("salary_usd", 0.0),
                    bonus_usd=pay.get("bonus_usd", 0.0),
                    risk_level=pay.get("risk_level", ""),
                    payment_date=pay.get("payment_date", "")
                )
                for pay in payroll_data
            ]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des données de paie: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def metrics(self, info) -> QueryMetrics:
        """Récupérer les métriques globales"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            # Récupérer les données pour calculer les métriques
            employees_data, reconciliation_events = fetch_global_table("GlobalEmployee", user)
            projects_data, _ = fetch_global_table("GlobalProject", user)
            
            total_employees = len(employees_data)
            active_projects = len([p for p in projects_data if p.get("status") == "ACTIVE"])
            
            salaries = [emp.get("salary_usd", 0) for emp in employees_data if emp.get("salary_usd")]
            avg_salary = sum(salaries) / len(salaries) if salaries else 0
            
            conflicts_resolved = len([e for e in reconciliation_events if len(e.get("merged_from", [])) > 1])
            
            return QueryMetrics(
                total_employees=total_employees,
                active_projects=active_projects,
                avg_salary=round(avg_salary, 2),
                conflicts_resolved=conflicts_resolved
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des métriques: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @field
    async def conflicts(self, info) -> List[ConflictInfo]:
        """Récupérer les informations sur les conflits"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            _, reconciliation_events = fetch_global_table("GlobalEmployee", user)
            
            conflicts = []
            for event in reconciliation_events:
                if len(event.get("merged_from", [])) > 1:
                    conflicts.append(ConflictInfo(
                        id=event.get("canonical_id", ""),
                        canonical_id=event.get("canonical_id", ""),
                        type="duplicate",
                        reason=event.get("reason", "Fusion automatique"),
                        score=event.get("score", 0.0),
                        merged_from=event.get("merged_from", []),
                        chosen_source=event.get("chosen_source", "")
                    ))
            
            return conflicts
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des conflits: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@strawberry.type
class Mutation:
    """Mutations GraphQL pour les opérations de modification"""
    
    @field
    async def resolve_conflict(self, info, conflict_id: str, resolution: str, chosen_source: str) -> bool:
        """Résoudre un conflit"""
        try:
            request = info.context.get("request")
            authorization = request.headers.get("authorization", "")
            user = resolve_user(authorization.split(" ")[1] if authorization.startswith("Bearer ") else "")
            
            # Log de la résolution
            logger.info(f"Conflit {conflict_id} résolu par {user['username']} avec stratégie {resolution}")
            
            # Dans une vraie implémentation, appliquerait la résolution
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la résolution du conflit: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Créer le schéma GraphQL
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Middleware pour l'authentification
class AuthenticationMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Passer la requête dans le contexte GraphQL
        if scope["type"] == "http":
            request = Request(scope, receive)
            scope["request"] = request
        
        await self.app(scope, receive, send)

# Créer l'application FastAPI pour GraphQL
def create_graphql_app():
    app = FastAPI(
        title="DataMediator Pro GraphQL API",
        description="API GraphQL alternative pour des requêtes flexibles",
        version="1.0.0"
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Middleware d'authentification
    app.add_middleware(AuthenticationMiddleware)
    
    # Router GraphQL
    graphql_app = GraphQLRouter(
        schema,
        graphiql=True,  # Activer GraphiQL pour le développement
        context_getter=lambda request: {"request": request}
    )
    
    app.include_router(graphql_app, prefix="/graphql")
    
    @app.get("/graphql/schema")
    async def get_schema():
        """Retourner le schéma GraphQL"""
        return {"schema": str(schema)}
    
    @app.get("/graphql/health")
    async def health_check():
        """Health check pour l'API GraphQL"""
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    
    return app

# Point d'entrée pour le serveur GraphQL
if __name__ == "__main__":
    import uvicorn
    
    app = create_graphql_app()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5002,
        log_level="info"
    )
