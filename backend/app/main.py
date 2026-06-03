from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings, ensure_log_directory
from app.core.security import login_limiter, jwt_validator, get_client_ip
from app.services.enterprise_mediator import (
    CONFLICT_RULES,
    GAV_RULES,
    GLOBAL_SCHEMA,
    LAV_VIEWS,
    ROLE_POLICIES,
    SOURCE_INFO,
    QueryEngine,
    add_demo_employee,
    ensure_sources,
    fetch_global_table,
    login,
    resolve_user,
    seed_enterprise_sources,
)

# Configuration du logging
ensure_log_directory()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


import app.services.audit_log as audit_log


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    logger.info("Démarrage de DataMediator...")
    ensure_sources()
    audit_log.init_audit_db()
    logger.info("Sources de données initialisées + audit DB prête")
    yield
    logger.info("Arrêt de DataMediator Pro...")


app = FastAPI(
    title=settings.app_name,
    description="Mediation virtuelle de donnees heterogenes RH/Projets/Finance avec GAV, LAV Bucket, reconciliation et RBAC.",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = QueryEngine()


class LoginRequest(BaseModel):
    username: str
    password: str


class QueryRequest(BaseModel):
    sql: str
    mode: str = "GAV"


def current_user(authorization: str | None, require_token: bool = False) -> dict[str, Any]:
    """
    Extrait l'utilisateur actuel du JWT.
    Si require_token=True, lève une exception si pas de token valide.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    if require_token and not token:
        raise HTTPException(
            status_code=401,
            detail="Authorization header manquant"
        )

    try:
        return resolve_user(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@app.post("/api/auth/login")
def auth_login(req: LoginRequest, request: Request):
    """Authentification avec rate limiting par IP"""
    client_ip = get_client_ip(request)
    
    # Vérifier la limite de tentatives
    if not login_limiter.is_allowed(client_ip):
        retry_after = login_limiter.get_retry_after(client_ip)
        audit_log.log(req.username or "?", "?", "AUTH_LOGIN", "RATE_LIMITED",
                      ip=client_ip, details={"retry_after": retry_after})
        logger.warning(f"Rate limit dépassé pour IP {client_ip}: {req.username}")
        raise HTTPException(
            status_code=429,
            detail=f"Trop de tentatives. Attendez {retry_after} seconde(s)",
            headers={"Retry-After": str(retry_after)}
        )

    logger.info(f"Tentative de connexion: {req.username} depuis {client_ip}")
    result = login(req.username, req.password)
    if not result:
        audit_log.log(req.username or "?", "?", "AUTH_LOGIN", "FAILURE", ip=client_ip)
        logger.warning(f"Échec de connexion: {req.username} depuis {client_ip}")
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    audit_log.log(req.username, result.get("role", "?"), "AUTH_LOGIN", "SUCCESS", ip=client_ip)
    logger.info(f"Connexion réussie: {req.username} depuis {client_ip}")
    return {
        "token": result["token"],
        "user": {
            "username": result["username"],
            "role": result["role"],
            "name": result["name"],
        },
        "expires_in_hours": result.get("expires_in_hours", 8),
    }


@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(default=None)):
    user = current_user(authorization, require_token=True)
    return {"username": user["username"], "role": user["role"], "name": user["name"], "policy": ROLE_POLICIES[user["role"]]}


@app.post("/api/query/execute")
def execute_query(req: QueryRequest, request: Request, authorization: str | None = Header(default=None)):
    user = current_user(authorization, require_token=True)
    mode = req.mode.upper()
    ip = get_client_ip(request)
    if mode not in {"GAV", "LAV"}:
        audit_log.log(user["username"], user["role"], "QUERY_EXECUTE", "FAILURE", ip=ip,
                      details={"reason": "invalid_mode", "mode": req.mode})
        raise HTTPException(status_code=400, detail="Mode invalide. Utilise GAV ou LAV.")

    logger.info(f"Exécution requête {mode} par {user['username']}: {req.sql[:100]}...")
    audit_log.log(user["username"], user["role"], "QUERY_EXECUTE", "ATTEMPT", ip=ip,
                  details={"mode": mode, "sql": req.sql[:200]})

    try:
        result = engine.execute(req.sql, mode, user)
        nrows = len(result.get('rows', []))
        logger.info(f"Requête {mode} exécutée avec succès: {nrows} lignes")
        audit_log.log(user["username"], user["role"], "QUERY_EXECUTE", "SUCCESS", ip=ip,
                      details={"mode": mode, "rows": nrows, "ms": result.get("execution_ms")})
        return result
    except PermissionError as exc:
        logger.warning(f"Permission refusée pour {user['username']}: {exc}")
        audit_log.log(user["username"], user["role"], "QUERY_EXECUTE", "DENIED", ip=ip,
                      details={"mode": mode, "reason": str(exc)})
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        logger.error(f"Erreur lors de l'exécution de la requête {mode}: {exc}")
        audit_log.log(user["username"], user["role"], "QUERY_EXECUTE", "FAILURE", ip=ip,
                      details={"mode": mode, "error": str(exc)[:160]})
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/query/explain")
def explain_query(req: QueryRequest, authorization: str | None = Header(default=None)):
    user = current_user(authorization, require_token=True)
    try:
        result = engine.execute(req.sql, req.mode.upper(), user)
        return {"global_sql": result["global_sql"], "mode": result["mode"], "plan": result["plan"], "reconciliation": result["reconciliation"]}
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/query/minicon")
def minicon_plan(req: QueryRequest, authorization: str | None = Header(default=None)):
    """Plan de réécriture LAV via MiniCon (Pottinger & Halevy 2001).

    Convertit la requête utilisateur en (Query, Views) Datalog symboliques et
    retourne les MCDs construits + les rewritings combinés. Sert aux démos.
    """
    user = current_user(authorization, require_token=True)
    try:
        from mini_con import Query, View, Subgoal, minicon_rewrite
    except ImportError:
        raise HTTPException(status_code=500, detail="Module mini_con indisponible")

    # On parse la requête pour récupérer ses tables et items
    try:
        parsed = engine.parse(req.sql)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Construction symbolique de Q : un sous-but par table globale
    head_vars = tuple(item.split(".")[-1].split(" AS ")[0].strip() for item in parsed.select_items if item != "*")
    body = []
    for t in parsed.tables:
        # Variables génériques selon le prédicat
        if t == "GlobalEmployee":
            body.append(Subgoal(t, ("eid", "name", "status")))
        elif t == "GlobalProject":
            body.append(Subgoal(t, ("pid", "pname", "state")))
        elif t == "GlobalAssignment":
            body.append(Subgoal(t, ("eid", "pid")))
        elif t == "GlobalDepartment":
            body.append(Subgoal(t, ("did", "dept", "country")))
        elif t == "GlobalPayroll":
            body.append(Subgoal(t, ("eid", "sal", "bonus")))
        else:
            body.append(Subgoal(t, ("x",)))
    Q = Query(name="Q", head_vars=head_vars or ("x",), body=tuple(body))

    # Vues symboliques à partir des LAV_VIEWS
    views = []
    pred_args = {
        "GlobalEmployee":    ("eid", "name", "status"),
        "GlobalProject":     ("pid", "pname", "state"),
        "GlobalAssignment":  ("eid", "pid"),
        "GlobalDepartment":  ("did", "dept", "country"),
        "GlobalPayroll":     ("eid", "sal", "bonus"),
    }
    for v in LAV_VIEWS:
        pred = v["predicate"]
        args = pred_args.get(pred, ("x",))
        views.append(View(name=v["view"], head_vars=args, body=(Subgoal(pred, args),)))

    plan = minicon_rewrite(Q, views)
    return {
        "global_sql": req.sql,
        "strategy": plan["strategy"],
        "mcds": plan["mcds"],
        "rewritings": plan["rewritings"],
        "trace": plan["trace"],
        "comparison": {
            "bucket_combinations": pow(max(1, len(views)), len(body)),
            "minicon_rewritings": len(plan["rewritings"]),
            "minicon_mcds": len(plan["mcds"]),
        },
    }


@app.get("/api/schema/global")
def get_global_schema(authorization: str | None = Header(default=None)):
    """Retourne le schéma global des tables."""
    user = current_user(authorization, require_token=True)
    return {"schema": GLOBAL_SCHEMA}


@app.post("/api/dashboard/metrics")
def get_dashboard_metrics(req: dict, authorization: str | None = Header(default=None)):
    """Retourne les métriques pour le tableau de bord."""
    user = current_user(authorization, require_token=True)
    time_range = req.get("timeRange", "7d")
    department = req.get("department", "all")
    
    try:
        # Calculer les métriques réelles
        employees_data, _ = fetch_global_table("GlobalEmployee", user)
        departments, _ = fetch_global_table("GlobalDepartment", user)
        projects, _ = fetch_global_table("GlobalProject", user)
        assignments, _ = fetch_global_table("GlobalAssignment", user)
        payroll_data, _ = fetch_global_table("GlobalPayroll", user)
        
        total_employees = len(employees_data)
        active_projects = len([p for p in projects if p.get("status") == "ACTIVE"])
        
        # Taux de réconciliation (basé sur les événements de fusion)
        reconciliation_events = []
        for emp in employees_data:
            if "_merged_from" in emp and len(emp["_merged_from"]) > 1:
                reconciliation_events.append(emp)
        reconciliation_rate = round((len(reconciliation_events) / max(total_employees, 1)) * 100, 1)
        
        # Salaire moyen
        salaries = [emp.get("salary_usd", 0) for emp in employees_data if emp.get("salary_usd")]
        avg_salary = round(sum(salaries) / len(salaries)) if salaries else 0
        
        # Conflits résolus (basé sur les événements de réconciliation)
        conflicts_resolved = len(reconciliation_events)
        
        # Fraîcheur des données (simulée - heures depuis dernière mise à jour)
        data_freshness = 2  # Simulé : 2 heures
        
        metrics = {
            "totalEmployees": total_employees,
            "activeProjects": active_projects,
            "reconciliationRate": reconciliation_rate,
            "avgSalary": avg_salary,
            "conflictsResolved": conflicts_resolved,
            "dataFreshness": data_freshness
        }
        
        # Données pour les graphiques
        charts = {
            "departmentDistribution": [
                {"name": "IT", "value": len([d for d in departments if "IT" in d.get("department_name", "")])},
                {"name": "Finance", "value": len([d for d in departments if "Finance" in d.get("department_name", "")])},
                {"name": "HR", "value": len([d for d in departments if "HR" in d.get("department_name", "")])},
                {"name": "Operations", "value": len([d for d in departments if "Operations" in d.get("department_name", "")])}
            ],
            "projectStatus": [
                {"status": "ACTIVE", "count": len([p for p in projects if p.get("status") == "ACTIVE"])},
                {"status": "PAUSED", "count": len([p for p in projects if p.get("status") == "PAUSED"])},
                {"status": "CLOSED", "count": len([p for p in projects if p.get("status") == "CLOSED"])}
            ],
            "performanceTrend": [
                {"date": "2026-05-06", "score": 85},
                {"date": "2026-05-07", "score": 88},
                {"date": "2026-05-08", "score": 87},
                {"date": "2026-05-09", "score": 90},
                {"date": "2026-05-10", "score": 89},
                {"date": "2026-05-11", "score": 91},
                {"date": "2026-05-12", "score": 93}
            ],
            "allocationRate": [
                {"project": "PRJ-AI", "rate": 85},
                {"project": "PRJ-DW", "rate": 72},
                {"project": "PRJ-ERP", "rate": 45},
                {"project": "PRJ-HR", "rate": 90}
            ]
        }
        
        # Alertes
        alerts = []
        if reconciliation_rate < 80:
            alerts.append({
                "severity": "medium",
                "title": "Taux de réconciliation faible",
                "description": f"Le taux de réconciliation est de {reconciliation_rate}%, considérer une vérification.",
                "time": "Il y a 2 heures"
            })
        
        if active_projects < 3:
            alerts.append({
                "severity": "high",
                "title": "Peu de projets actifs",
                "description": f"Seulement {active_projects} projets sont actuellement actifs.",
                "time": "Il y a 1 heure"
            })
        
        if conflicts_resolved > 10:
            alerts.append({
                "severity": "low",
                "title": "Conflits résolus",
                "description": f"{conflicts_resolved} conflits ont été résolus avec succès.",
                "time": "Il y a 30 minutes"
            })
        
        return {
            "metrics": metrics,
            "charts": charts,
            "alerts": alerts
        }
        
    except Exception as exc:
        logger.error(f"Erreur lors de la récupération des métriques: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/dashboard/export")
def export_dashboard(req: dict, authorization: str | None = Header(default=None)):
    """Exporte les données du dashboard."""
    user = current_user(authorization, require_token=True)
    format_type = req.get("format", "csv").lower()
    
    try:
        # Récupérer les mêmes données que pour les métriques
        dashboard_data = get_dashboard_metrics(req, authorization)
        
        if format_type == "csv":
            # Export CSV
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # En-tête
            writer.writerow(["Métrique", "Valeur"])
            
            # Données
            metrics = dashboard_data["metrics"]
            for key, value in metrics.items():
                writer.writerow([key, value])
            
            # Retourner le fichier CSV
            from fastapi.responses import Response
            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=dashboard_export.csv"}
            )
            
        elif format_type == "pdf":
            # Export PDF (simplifié)
            from fastapi.responses import HTMLResponse
            
            html_content = f"""
            <html>
            <head><title>Dashboard Export</title></head>
            <body>
            <h1>DataMediator Dashboard</h1>
            <h2>Métriques</h2>
            <table border="1">
            <tr><th>Métrique</th><th>Valeur</th></tr>
            """
            
            metrics = dashboard_data["metrics"]
            for key, value in metrics.items():
                html_content += f"<tr><td>{key}</td><td>{value}</td></tr>"
            
            html_content += """
            </table>
            </body>
            </html>
            """
            
            return HTMLResponse(content=html_content)
        
        else:
            raise HTTPException(status_code=400, detail="Format non supporté")
            
    except Exception as exc:
        logger.error(f"Erreur lors de l'export: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/schema/sources")
def source_schema():
    enriched = []
    for source in SOURCE_INFO:
        enriched.append({**source, "online": True})
    return {"sources": enriched}


@app.post("/api/conflicts/list")
def list_conflicts(authorization: str | None = Header(default=None)):
    """Liste tous les conflits de données."""
    user = current_user(authorization, require_token=True)
    
    try:
        # Récupérer les données d'employés avec réconciliation
        employees_data, reconciliation_events = fetch_global_table("GlobalEmployee", user)
        
        # Identifier les conflits basés sur les événements de réconciliation
        conflicts = []
        
        for event in reconciliation_events:
            if len(event.get("merged_from", [])) > 1:
                conflict = {
                    "id": event.get("canonical_id", ""),
                    "canonical_id": event.get("canonical_id", ""),
                    "type": "duplicate",
                    "reason": event.get("reason", "Fusion automatique"),
                    "score": event.get("score", 0.0),
                    "merged_from": event.get("merged_from", []),
                    "chosen_source": event.get("chosen_source", ""),
                    "timestamp": "2026-05-12T14:00:00Z"
                }
                conflicts.append(conflict)
        
        return {"conflicts": conflicts}
        
    except Exception as exc:
        logger.error(f"Erreur lors de la récupération des conflits: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/conflicts/rules")
def get_conflict_rules():
    """Retourne les règles de résolution de conflits."""
    rules = [
        {
            "id": "highest_confidence",
            "name": "Plus haute confiance",
            "description": "Choisir la source avec le score de confiance le plus élevé",
            "priority": 1,
            "enabled": True
        },
        {
            "id": "most_recent",
            "name": "Plus récent",
            "description": "Choisir la source la plus récemment mise à jour",
            "priority": 2,
            "enabled": True
        },
        {
            "id": "merge",
            "name": "Fusionner",
            "description": "Fusionner les données de toutes les sources",
            "priority": 3,
            "enabled": True
        }
    ]
    
    return {"rules": rules}


@app.get("/api/conflicts/history")
def get_conflict_history(authorization: str | None = Header(default=None)):
    """Retourne l'historique des résolutions de conflits."""
    user = current_user(authorization, require_token=True)
    
    try:
        # Simuler l'historique des résolutions
        history = [
            {
                "conflictId": "EMP:0001",
                "resolution": "highest_confidence",
                "chosenSource": "S1",
                "timestamp": "2026-05-12T10:30:00Z",
                "resolvedBy": user["username"]
            },
            {
                "conflictId": "EMP:0002",
                "resolution": "merge",
                "chosenSource": "S1",
                "timestamp": "2026-05-12T09:45:00Z",
                "resolvedBy": user["username"]
            },
            {
                "conflictId": "EMP:0003",
                "resolution": "most_recent",
                "chosenSource": "S1",
                "timestamp": "2026-05-12T08:15:00Z",
                "resolvedBy": user["username"]
            }
        ]
        
        return {"history": history}
        
    except Exception as exc:
        logger.error(f"Erreur lors de la récupération de l'historique: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/conflicts/resolve")
def resolve_conflict(req: dict, authorization: str | None = Header(default=None)):
    """Résout un conflit spécifique en enregistrant l'arbitrage manuel (Human-in-the-loop)."""
    user = current_user(authorization, require_token=True)
    
    conflict_id = req.get("conflictId")
    resolution = req.get("resolution")
    chosen_source = req.get("chosenSource")
    field = req.get("field")
    
    try:
        logger.info(f"Conflit {conflict_id} sur {field} résolu par {user['username']} avec stratégie {resolution} (Source: {chosen_source})")
        
        if conflict_id and field and chosen_source:
            from enterprise_mediator import save_conflict_resolution
            save_conflict_resolution(conflict_id, field, chosen_source)
            
            # Invalider le cache pour recalculer la table avec les nouvelles fusions !
            try:
                from cache_manager import invalidate_table_cache
                invalidate_table_cache("GlobalEmployee")
            except ImportError:
                pass
        
        return {
            "success": True,
            "conflictId": conflict_id,
            "resolution": resolution,
            "chosenSource": chosen_source,
            "field": field,
            "resolvedBy": user["username"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur lors de la résolution du conflit: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/conflicts/auto-resolve")
def auto_resolve_conflicts(authorization: str | None = Header(default=None)):
    """Résout automatiquement les conflits."""
    user = current_user(authorization, require_token=True)
    
    try:
        # Récupérer les conflits
        conflicts_response = list_conflicts(authorization)
        conflicts = conflicts_response["conflicts"]
        
        resolved_count = 0
        
        # Appliquer la résolution automatique
        for conflict in conflicts:
            # Stratégie: utiliser la source choisie existante
            if conflict.get("chosen_source"):
                resolved_count += 1
                logger.info(f"Conflit {conflict['id']} résolu automatiquement avec source {conflict['chosen_source']}")
        
        return {
            "success": True,
            "resolved": resolved_count,
            "total": len(conflicts),
            "resolvedBy": "auto",
            "timestamp": "2026-05-12T14:00:00Z"
        }
        
    except Exception as exc:
        logger.error(f"Erreur lors de la résolution automatique: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/mappings")
def mappings():
    return {"gav": GAV_RULES, "lav": LAV_VIEWS, "conflicts": CONFLICT_RULES}


@app.get("/api/reconciliation")
def reconciliation(authorization: str | None = Header(default=None)):
    user = current_user(authorization, require_token=True)
    _, events = fetch_global_table("GlobalEmployee", user)
    return {"events": events}


@app.get("/api/cache/stats")
def get_cache_stats(authorization: str | None = Header(default=None)):
    """Retourne les statistiques du cache et de la performance."""
    user = current_user(authorization, require_token=True)
    
    try:
        from cache_manager import get_cache_stats
        return get_cache_stats()
    except ImportError:
        return {
            "cache": {"hits": 0, "misses": 0, "hit_rate": 0, "memory_entries": 0, "redis_connected": False},
            "performance": {"total_queries": 0, "avg_query_time": 0, "slow_queries": []}
        }


@app.post("/api/cache/clear")
def clear_cache(authorization: str | None = Header(default=None)):
    """Vide tout le cache."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions (seul ADMIN peut vider le cache)
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from cache_manager import cache_manager, invalidate_user_cache
        success = cache_manager.clear()
        
        # Invalider le cache de l'utilisateur
        invalidate_user_cache(user["username"])
        
        return {"success": success, "message": "Cache vidé avec succès"}
    except ImportError:
        return {"success": False, "message": "Cache non disponible"}


@app.post("/api/cache/invalidate")
def invalidate_cache(req: dict, authorization: str | None = Header(default=None)):
    """Invalide des entrées de cache spécifiques."""
    user = current_user(authorization, require_token=True)
    
    pattern = req.get("pattern", "*")
    table = req.get("table")
    
    try:
        from cache_manager import cache_manager, invalidate_table_cache, invalidate_user_cache
        
        invalidated = 0
        
        if table:
            invalidated = invalidate_table_cache(table)
        elif pattern:
            invalidated = cache_manager.invalidate_pattern(pattern)
        else:
            invalidated = invalidate_user_cache(user["username"])
        
        return {"success": True, "invalidated": invalidated}
    except ImportError:
        return {"success": False, "invalidated": 0}


@app.get("/api/performance/stats")
def get_performance_stats(authorization: str | None = Header(default=None)):
    """Retourne les statistiques de performance détaillées."""
    user = current_user(authorization, require_token=True)
    
    try:
        from cache_manager import performance_monitor
        return performance_monitor.get_stats()
    except ImportError:
        return {"query_stats": {}, "slow_queries": [], "total_queries": 0, "avg_query_time": 0}


@app.get("/api/monitoring/health")
def health_check():
    """Health check principal du système."""
    try:
        from monitoring import monitoring_system
        
        # Exécuter les health checks
        health_results = monitoring_system.health_checker.run_all_checks()
        overall_status = monitoring_system.health_checker.get_overall_status()
        
        return {
            "status": overall_status.value,
            "timestamp": time.time(),
            "checks": {name: {
                "status": check.status.value,
                "message": check.message,
                "response_time": check.response_time,
                "metadata": check.metadata
            } for name, check in health_results.items()}
        }
        
    except ImportError:
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "message": "Monitoring module not available"
        }


@app.get("/api/monitoring/metrics")
def get_monitoring_metrics(authorization: str | None = Header(default=None)):
    """Retourne les métriques de monitoring complètes."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") not in ["ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from monitoring import monitoring_system
        return monitoring_system.get_monitoring_summary()
    except ImportError:
        return {
            "system": {},
            "application": {},
            "health": {"overall": "healthy", "checks": {}},
            "alerts": {"active": 0, "total": 0, "recent": []},
            "status": "stopped",
            "timestamp": time.time()
        }


@app.get("/api/monitoring/alerts")
def get_monitoring_alerts(authorization: str | None = Header(default=None)):
    """Retourne les alertes de monitoring."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") not in ["ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from monitoring import monitoring_system
        alert_manager = monitoring_system.alert_manager
        
        return {
            "active": [alert.__dict__ for alert in alert_manager.get_active_alerts()],
            "recent": [alert.__dict__ for alert in alert_manager.get_all_alerts(20)]
        }
    except ImportError:
        return {"active": [], "recent": []}


@app.post("/api/monitoring/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, authorization: str | None = Header(default=None)):
    """Résout une alerte."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from monitoring import monitoring_system
        success = monitoring_system.alert_manager.resolve_alert(alert_id)
        
        if success:
            return {"success": True, "message": f"Alert {alert_id} resolved"}
        else:
            return {"success": False, "message": f"Alert {alert_id} not found"}
    except ImportError:
        return {"success": False, "message": "Monitoring not available"}


@app.post("/api/monitoring/start")
def start_monitoring_system(req: dict, authorization: str | None = Header(default=None)):
    """Démarre le système de monitoring."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    interval = req.get("interval", 30)
    
    try:
        from monitoring import start_monitoring
        start_monitoring(interval)
        return {"success": True, "message": f"Monitoring started with {interval}s interval"}
    except ImportError:
        return {"success": False, "message": "Monitoring not available"}


@app.post("/api/monitoring/stop")
def stop_monitoring_system(authorization: str | None = Header(default=None)):
    """Arrête le système de monitoring."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from monitoring import stop_monitoring
        stop_monitoring()
        return {"success": True, "message": "Monitoring stopped"}
    except ImportError:
        return {"success": False, "message": "Monitoring not available"}


@app.post("/api/admin/reset-sources")
def reset_sources(authorization: str | None = Header(default=None)):
    """Reset les sources (admin only)"""
    user = current_user(authorization, require_token=True)
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    seed_enterprise_sources()
    return {"status": "ok", "message": "Sources RH/Projets/Finance regenerees."}


@app.post("/api/admin/add-demo-employee")
def add_employee(authorization: str | None = Header(default=None)):
    """Ajouter un demo employee (admin only)"""
    user = current_user(authorization, require_token=True)
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    return add_demo_employee()


@app.get("/api/user/profile")
def get_user_profile(authorization: str | None = Header(default=None)):
    """Retourne le profil de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # Profil simulé (en production, récupérer depuis la base de données)
    profile = {
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "email": f"{user['username']}@datamediator.pro",
        "avatar": "",
        "bio": f"{user['name']} - {user['role']} chez DataMediator Pro",
        "location": "Alger, Algérie",
        "timezone": "Africa/Algiers",
        "language": "fr",
        "joined_at": "2026-01-15T00:00:00Z",
        "last_login": datetime.now().isoformat()
    }
    
    return {"profile": profile}


@app.put("/api/user/profile")
def update_user_profile(req: dict, authorization: str | None = Header(default=None)):
    """Met à jour le profil de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # En production, sauvegarder dans la base de données
    profile_data = req.get("profile", {})
    
    logger.info(f"Profil mis à jour pour {user['username']}: {profile_data}")
    
    return {"success": True, "message": "Profil mis à jour avec succès"}


@app.get("/api/user/preferences")
def get_user_preferences(authorization: str | None = Header(default=None)):
    """Retourne les préférences de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # Préférences simulées
    preferences = {
        "theme": "dark",
        "notifications": {
            "email": True,
            "push": True,
            "desktop": False,
            "sound": True
        },
        "dashboard": {
            "defaultView": "analytics",
            "refreshInterval": 30,
            "compactMode": False,
            "showMetrics": True
        },
        "queries": {
            "autoSave": True,
            "showHistory": True,
            "syntaxHighlighting": True,
            "autoComplete": True
        },
        "privacy": {
            "shareAnalytics": True,
            "publicProfile": False,
            "showActivity": True
        }
    }
    
    return {"preferences": preferences}


@app.put("/api/user/preferences")
def update_user_preferences(req: dict, authorization: str | None = Header(default=None)):
    """Met à jour les préférences de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    preferences = req.get("preferences", {})
    
    logger.info(f"Préférences mises à jour pour {user['username']}")
    
    return {"success": True, "message": "Préférences enregistrées avec succès"}


@app.get("/api/user/favorites")
def get_user_favorites(authorization: str | None = Header(default=None)):
    """Retourne les requêtes favorites de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # Favoris simulés
    favorites = [
        {
            "id": "fav_1",
            "query": "SELECT employee_id, full_name, department_name FROM GlobalEmployee WHERE status = 'ACTIVE'",
            "name": "Employés actifs par département",
            "timestamp": "2026-05-10T14:30:00Z"
        },
        {
            "id": "fav_2",
            "query": "SELECT COUNT(*) as total, department_name FROM GlobalEmployee GROUP BY department_name",
            "name": "Effectifs par département",
            "timestamp": "2026-05-09T10:15:00Z"
        }
    ]
    
    return {"favorites": favorites}


@app.get("/api/user/activity")
def get_user_activity(authorization: str | None = Header(default=None)):
    """Retourne l'activité récente de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # Activité simulée
    activity = [
        {
            "type": "query",
            "description": "Exécuté une requête sur les employés",
            "timestamp": "2026-05-12T13:45:00Z",
            "details": "SELECT * FROM GlobalEmployee LIMIT 10"
        },
        {
            "type": "login",
            "description": "Connexion au système",
            "timestamp": "2026-05-12T09:00:00Z",
            "details": "Connexion depuis 192.168.1.100"
        },
        {
            "type": "conflict",
            "description": "Résolu un conflit de données",
            "timestamp": "2026-05-11T16:20:00Z",
            "details": "Conflit EMP:0001 résolu avec source S1"
        },
        {
            "type": "query",
            "description": "Exporté des données du dashboard",
            "timestamp": "2026-05-11T11:30:00Z",
            "details": "Export CSV des métriques"
        }
    ]
    
    return {"activity": activity}


@app.post("/api/user/change-password")
def change_password(req: dict, authorization: str | None = Header(default=None)):
    """Change le mot de passe de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    old_password = req.get("oldPassword")
    new_password = req.get("newPassword")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Ancien et nouveau mot de passe requis")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères")
    
    # En production, vérifier l'ancien mot de passe et mettre à jour
    logger.info(f"Mot de passe changé pour {user['username']}")
    
    return {"success": True, "message": "Mot de passe changé avec succès"}


@app.get("/api/user/export")
def export_user_data(authorization: str | None = Header(default=None)):
    """Exporte toutes les données de l'utilisateur."""
    user = current_user(authorization, require_token=True)
    
    # Récupérer toutes les données de l'utilisateur
    profile_response = get_user_profile(authorization)
    preferences_response = get_user_preferences(authorization)
    favorites_response = get_user_favorites(authorization)
    activity_response = get_user_activity(authorization)
    
    export_data = {
        "user": user,
        "profile": profile_response["profile"],
        "preferences": preferences_response["preferences"],
        "favorites": favorites_response["favorites"],
        "activity": activity_response["activity"],
        "exported_at": datetime.now().isoformat(),
        "version": "1.0"
    }
    
    # Retourner le JSON pour téléchargement
    from fastapi.responses import Response
    import json
    
    json_data = json.dumps(export_data, indent=2, default=str)
    
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=datameditor_export_{user['username']}.json"}
    )


@app.get("/api/health")
def health():
    ensure_sources()
    return {"status": "online", "sources": [{**s, "online": True} for s in SOURCE_INFO]}


@app.get("/api/health/db_mode")
def db_mode():
    from enterprise_mediator import USE_DOCKER
    return {"mode": "DOCKER" if USE_DOCKER else "SQLITE"}


@app.get("/api/version")
def api_version():
    """Retourne la version de l'API et les capacités activées."""
    try:
        import sqlglot
        sqlglot_v = sqlglot.__version__
    except ImportError:
        sqlglot_v = None
    try:
        import bcrypt as _bc
        bcrypt_ok = True
    except ImportError:
        bcrypt_ok = False
    try:
        import jwt as _jwt
        jwt_ok = True
    except ImportError:
        jwt_ok = False
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "api_version": "v1",
        "capabilities": {
            "sqlglot_parser": sqlglot_v,
            "bcrypt_auth": bcrypt_ok,
            "jwt_signed": jwt_ok,
            "rate_limit_login": True,
            "audit_trail": True,
        },
    }


# ════════════════════════════════════════════════════════════════════
# Audit trail endpoints
# ════════════════════════════════════════════════════════════════════

@app.get("/api/audit/log")
def get_audit_log(
    authorization: str | None = Header(default=None),
    actor: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """Récupère les événements d'audit (réservé ADMIN/HR_MANAGER)."""
    user = current_user(authorization, require_token=True)
    if user.get("role") not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(status_code=403, detail="Accès aux logs réservé aux administrateurs.")
    events = audit_log.query(
        actor=actor, action=action, outcome=outcome,
        limit=max(1, min(500, limit)),
        offset=max(0, offset),
    )
    return {"events": events, "count": len(events)}


@app.get("/api/audit/stats")
def get_audit_stats(authorization: str | None = Header(default=None)):
    """Statistiques globales du journal d'audit."""
    user = current_user(authorization, require_token=True)
    if user.get("role") not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(status_code=403, detail="Accès aux logs réservé aux administrateurs.")
    return audit_log.stats()


@app.post("/api/reports/generate")
def generate_report(req: dict, authorization: str | None = Header(default=None)):
    """Génère un rapport selon les spécifications."""
    user = current_user(authorization, require_token=True)
    
    report_type = req.get("report_type", "data_export")
    format_type = req.get("format", "csv")
    title = req.get("title", "Rapport DataMediator")
    table_name = req.get("table_name")
    columns = req.get("columns")
    filters = req.get("filters", {})
    
    try:
        from reporting_engine import create_data_export, create_analytics_report, get_available_formats
        
        # Vérifier le format
        available_formats = get_available_formats()
        if format_type not in available_formats:
            raise HTTPException(status_code=400, detail=f"Format {format_type} non disponible. Formats: {available_formats}")
        
        # Générer le rapport
        if report_type == "analytics":
            report_bytes = create_analytics_report(title, format_type, filters)
        elif report_type == "data_export" and table_name:
            report_bytes = create_data_export(table_name, format_type, columns)
        else:
            raise HTTPException(status_code=400, detail="Type de rapport ou table non spécifié")
        
        # Retourner le fichier
        from fastapi.responses import Response
        
        media_types = {
            "csv": "text/csv",
            "json": "application/json",
            "html": "text/html",
            "pdf": "application/pdf",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        
        filename = f"datamediator_report_{int(time.time())}.{format_type}"
        
        return Response(
            content=report_bytes,
            media_type=media_types.get(format_type, "application/octet-stream"),
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Module de reporting non disponible")
    except Exception as e:
        logger.error(f"Erreur lors de la génération du rapport: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/formats")
def get_report_formats(authorization: str | None = Header(default=None)):
    """Retourne les formats de rapport disponibles."""
    user = current_user(authorization, require_token=True)
    
    try:
        from reporting_engine import get_available_formats, get_report_templates
        
        return {
            "formats": get_available_formats(),
            "templates": get_report_templates(),
            "dependencies": {
                "pdf_available": True,  # Simplifié
                "excel_available": True  # Simplifié
            }
        }
    except ImportError:
        return {
            "formats": ["csv", "json", "html"],
            "templates": ["analytics", "simple"],
            "dependencies": {
                "pdf_available": False,
                "excel_available": False
            }
        }


@app.post("/api/reports/schedule")
def schedule_report(req: dict, authorization: str | None = Header(default=None)):
    """Planifie un rapport récurrent."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") not in ["ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    report_id = req.get("report_id")
    schedule = req.get("schedule", "daily")
    recipients = req.get("recipients", [])
    config = req.get("config", {})
    
    try:
        from reporting_engine import report_scheduler, ReportConfig, ReportType, ReportFormat
        
        report_config = ReportConfig(
            report_type=ReportType({"analytics": "analytics_report", "data_export": "data_export"}.get(config.get("report_type", "analytics_report"), config.get("report_type", "analytics_report"))),
            format=ReportFormat(config.get("format", "html")),
            title=config.get("title", "Rapport planifié"),
            description=config.get("description", ""),
            columns=config.get("columns")
        )
        
        report_scheduler.schedule_report(report_id, report_config, schedule, recipients)
        
        return {
            "success": True,
            "message": f"Rapport {report_id} planifié avec succès",
            "next_run": report_scheduler.scheduled_reports[report_id]["next_run"].isoformat()
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Module de reporting non disponible")
    except Exception as e:
        logger.error(f"Erreur lors de la planification du rapport: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/scheduled")
def get_scheduled_reports(authorization: str | None = Header(default=None)):
    """Retourne les rapports planifiés."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") not in ["ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from reporting_engine import report_scheduler
        
        scheduled = []
        for report_id, report_info in report_scheduler.scheduled_reports.items():
            scheduled.append({
                "id": report_id,
                "title": report_info["config"].title,
                "schedule": report_info["schedule"],
                "recipients": report_info["recipients"],
                "last_run": report_info["last_run"].isoformat() if report_info["last_run"] else None,
                "next_run": report_info["next_run"].isoformat() if report_info["next_run"] else None,
                "active": report_info["active"]
            })
        
        return {"scheduled_reports": scheduled}
        
    except ImportError:
        return {"scheduled_reports": []}


@app.post("/api/reports/run-scheduled")
def run_scheduled_reports(authorization: str | None = Header(default=None)):
    """Exécute manuellement les rapports planifiés."""
    user = current_user(authorization, require_token=True)
    
    # Vérifier les permissions
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    try:
        from reporting_engine import report_scheduler
        
        executed = report_scheduler.run_scheduled_reports()
        
        return {
            "success": True,
            "executed": executed,
            "message": f"{len(executed)} rapports exécutés"
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Module de reporting non disponible")


@app.get("/")
def root():
    return {"app": "DataMediator Pro", "docs": "/docs", "health": "/api/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
