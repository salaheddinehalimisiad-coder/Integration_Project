"""
DataMediator Pro - Tests API Complets
Suite de tests complète pour l'API REST
"""

import pytest
import asyncio
import json
import time
from typing import Dict, Any
import httpx
from fastapi.testclient import TestClient

# Import de l'application
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

class TestAPIComplete:
    """Suite de tests complète pour l'API DataMediator Pro"""
    
    @pytest.fixture
    def client(self):
        """Fixture pour le client de test"""
        return TestClient(app)
    
    @pytest.fixture
    def admin_token(self, client):
        """Fixture pour le token admin"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def hr_token(self, client):
        """Fixture pour le token HR"""
        response = client.post("/api/auth/login", json={
            "username": "hr",
            "password": "hr123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def project_token(self, client):
        """Fixture pour le token Project Manager"""
        response = client.post("/api/auth/login", json={
            "username": "project",
            "password": "project123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def get_auth_headers(self, token: str) -> Dict[str, str]:
        """Retourne les headers d'authentification"""
        return {"Authorization": f"Bearer {token}"}
    
    # Tests d'authentification
    def test_auth_login_success(self, client):
        """Test login réussi"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "ADMIN"
    
    def test_auth_login_invalid_credentials(self, client):
        """Test login avec identifiants invalides"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "wrong"
        })
        
        assert response.status_code == 401
    
    def test_auth_me(self, client, admin_token):
        """Test récupération infos utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert "policy" in data
    
    # Tests des schémas et sources
    def test_schema_global(self, client, admin_token):
        """Test récupération schéma global"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/schema/global", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "GlobalEmployee" in data["schema"]
        assert "GlobalDepartment" in data["schema"]
    
    def test_schema_sources(self, client, admin_token):
        """Test récupération schéma sources"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/schema/sources", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        assert len(data["sources"]) > 0
    
    # Tests de requêtes GAV/LAV
    def test_query_gav_simple(self, client, admin_token):
        """Test requête GAV simple"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 3",
            "mode": "GAV"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data
        assert "columns" in data
        assert "row_count" in data
        assert data["mode"] == "GAV"
        assert len(data["rows"]) <= 3
    
    def test_query_lav_simple(self, client, admin_token):
        """Test requête LAV simple"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 2",
            "mode": "LAV"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data
        assert data["mode"] == "LAV"
    
    def test_query_with_filter(self, client, admin_token):
        """Test requête avec filtre"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "SELECT employee_id, full_name FROM GlobalEmployee WHERE status = 'ACTIVE'",
            "mode": "GAV"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["rows"]) > 0
    
    def test_query_explain(self, client, admin_token):
        """Test expliquer requête"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "SELECT * FROM GlobalEmployee LIMIT 5",
            "mode": "GAV"
        }
        
        response = client.post("/api/query/explain", headers=headers, json=query_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data
        assert "reconciliation" in data
    
    # Tests du dashboard
    def test_dashboard_metrics(self, client, admin_token):
        """Test métriques dashboard"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/dashboard/metrics", headers=headers, json={
            "timeRange": "7d",
            "department": "all"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "charts" in data
        assert "alerts" in data
        
        # Vérifier les métriques attendues
        metrics = data["metrics"]
        assert "totalEmployees" in metrics
        assert "activeProjects" in metrics
        assert "reconciliationRate" in metrics
    
    def test_dashboard_export(self, client, admin_token):
        """Test export dashboard"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/dashboard/export", headers=headers, json={
            "format": "csv",
            "timeRange": "7d"
        })
        
        assert response.status_code == 200
        # Vérifier que c'est bien un CSV
        assert "text/csv" in response.headers["content-type"]
    
    # Tests de gestion des conflits
    def test_conflicts_list(self, client, admin_token):
        """Test liste des conflits"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/conflicts/list", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "conflicts" in data
        assert isinstance(data["conflicts"], list)
    
    def test_conflicts_rules(self, client, admin_token):
        """Test règles de résolution"""
        response = client.get("/api/conflicts/rules")
        
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        assert len(data["rules"]) > 0
    
    def test_conflicts_resolve(self, client, admin_token):
        """Test résolution de conflit"""
        headers = self.get_auth_headers(admin_token)
        
        # D'abord récupérer les conflits
        conflicts_response = client.post("/api/conflicts/list", headers=headers)
        conflicts = conflicts_response.json()["conflicts"]
        
        if conflicts:
            conflict_id = conflicts[0]["id"]
            resolve_data = {
                "conflictId": conflict_id,
                "resolution": "highest_confidence",
                "chosenSource": "S1"
            }
            
            response = client.post("/api/conflicts/resolve", headers=headers, json=resolve_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_conflicts_auto_resolve(self, client, admin_token):
        """Test résolution automatique"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/conflicts/auto-resolve", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "resolved" in data
        assert "total" in data
    
    # Tests du cache
    def test_cache_stats(self, client, admin_token):
        """Test statistiques cache"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/cache/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "cache" in data
        assert "performance" in data
        
        cache_stats = data["cache"]
        assert "hits" in cache_stats
        assert "misses" in cache_stats
        assert "hit_rate" in cache_stats
    
    def test_cache_clear(self, client, admin_token):
        """Test vidage cache (admin uniquement)"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/cache/clear", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
    
    def test_cache_invalidate(self, client, admin_token):
        """Test invalidation cache"""
        headers = self.get_auth_headers(admin_token)
        response = client.post("/api/cache/invalidate", headers=headers, json={
            "pattern": "*"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "invalidated" in data
    
    # Tests du monitoring
    def test_monitoring_health(self, client):
        """Test health check monitoring"""
        response = client.get("/api/monitoring/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data
        assert "timestamp" in data
    
    def test_monitoring_metrics(self, client, admin_token):
        """Test métriques monitoring"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/monitoring/metrics", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "system" in data
        assert "application" in data
        assert "health" in data
        assert "alerts" in data
    
    def test_monitoring_alerts(self, client, admin_token):
        """Test alertes monitoring"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/monitoring/alerts", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "active" in data
        assert "recent" in data
    
    # Tests du profil utilisateur
    def test_user_profile(self, client, admin_token):
        """Test profil utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/user/profile", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        
        profile = data["profile"]
        assert "username" in profile
        assert "name" in profile
        assert "role" in profile
        assert profile["username"] == "admin"
    
    def test_user_preferences(self, client, admin_token):
        """Test préférences utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/user/preferences", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "preferences" in data
        
        preferences = data["preferences"]
        assert "theme" in preferences
        assert "notifications" in preferences
        assert "dashboard" in preferences
    
    def test_user_favorites(self, client, admin_token):
        """Test favoris utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/user/favorites", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "favorites" in data
        assert isinstance(data["favorites"], list)
    
    def test_user_activity(self, client, admin_token):
        """Test activité utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/user/activity", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "activity" in data
        assert isinstance(data["activity"], list)
    
    def test_user_export(self, client, admin_token):
        """Test export données utilisateur"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/user/export", headers=headers)
        
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
    
    # Tests du reporting
    def test_reports_formats(self, client, admin_token):
        """Test formats de rapports disponibles"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/reports/formats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "formats" in data
        assert "templates" in data
        assert "dependencies" in data
        
        # Vérifier les formats de base
        formats = data["formats"]
        assert "csv" in formats
        assert "json" in formats
        assert "html" in formats
    
    def test_reports_generate_analytics(self, client, admin_token):
        """Test génération rapport analytics"""
        headers = self.get_auth_headers(admin_token)
        report_data = {
            "report_type": "analytics",
            "format": "json",
            "title": "Test Analytics Report"
        }
        
        response = client.post("/api/reports/generate", headers=headers, json=report_data)
        
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
    
    def test_reports_generate_data_export(self, client, admin_token):
        """Test génération export données"""
        headers = self.get_auth_headers(admin_token)
        report_data = {
            "report_type": "data_export",
            "format": "csv",
            "table_name": "GlobalEmployee",
            "columns": ["employee_id", "full_name", "department"]
        }
        
        response = client.post("/api/reports/generate", headers=headers, json=report_data)
        
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
    
    def test_reports_schedule(self, client, admin_token):
        """Test planification rapport"""
        headers = self.get_auth_headers(admin_token)
        schedule_data = {
            "report_id": "test_daily_report",
            "schedule": "daily",
            "recipients": ["admin@datamediator.pro"],
            "config": {
                "report_type": "analytics",
                "format": "html",
                "title": "Rapport quotidien"
            }
        }
        
        response = client.post("/api/reports/schedule", headers=headers, json=schedule_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] is True
    
    def test_reports_scheduled_list(self, client, admin_token):
        """Test liste rapports planifiés"""
        headers = self.get_auth_headers(admin_token)
        response = client.get("/api/reports/scheduled", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "scheduled_reports" in data
        assert isinstance(data["scheduled_reports"], list)
    
    # Tests de permissions
    def test_permissions_admin_only(self, client, project_token):
        """Test permissions admin uniquement"""
        headers = self.get_auth_headers(project_token)

        # Ces endpoints devraient être refusés pour un project manager
        # Tuple: (endpoint, method, body)
        admin_only_endpoints = [
            ("/api/cache/clear",          "POST", {}),
            ("/api/monitoring/metrics",   "GET",  None),
            ("/api/monitoring/alerts",    "GET",  None),
            ("/api/reports/schedule",     "POST", {}),
            ("/api/reports/scheduled",    "GET",  None),
        ]

        for endpoint, method, body in admin_only_endpoints:
            if method == "POST":
                response = client.post(endpoint, headers=headers, json=body)
            else:
                response = client.get(endpoint, headers=headers)

            assert response.status_code == 403, (
                f"{method} {endpoint} → attendu 403, reçu {response.status_code}"
            )
    
    def test_permissions_hr_manager(self, client, hr_token):
        """Test permissions HR manager"""
        headers = self.get_auth_headers(hr_token)
        
        # HR manager peut accéder à certains endpoints admin
        allowed_endpoints = [
            "/api/monitoring/metrics",
            "/api/reports/schedule",
            "/api/reports/scheduled"
        ]
        
        for endpoint in allowed_endpoints:
            if "POST" in endpoint:
                response = client.post(endpoint, headers=headers, json={})
            else:
                response = client.get(endpoint, headers=headers)
            
            # HR manager ne devrait pas avoir 403
            assert response.status_code != 403
    
    # Tests de performance
    def test_performance_concurrent_queries(self, client, admin_token):
        """Test performance requêtes concurrentes"""
        import threading
        import queue
        
        results = queue.Queue()
        headers = self.get_auth_headers(admin_token)
        
        def run_query():
            query_data = {
                "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 2",
                "mode": "GAV"
            }
            response = client.post("/api/query/execute", headers=headers, json=query_data)
            results.put(response.status_code)
        
        # Lancer 5 requêtes concurrentes
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=run_query)
            threads.append(thread)
            thread.start()
        
        # Attendre la fin
        for thread in threads:
            thread.join()
        
        # Vérifier que toutes ont réussi
        while not results.empty():
            status = results.get()
            assert status == 200
    
    def test_performance_large_result_set(self, client, admin_token):
        """Test performance gros jeu de résultats"""
        headers = self.get_auth_headers(admin_token)
        
        start_time = time.time()
        
        query_data = {
            "sql": "SELECT * FROM GlobalEmployee",
            "mode": "GAV"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        assert response.status_code == 200
        assert execution_time < 5.0  # Moins de 5 secondes
    
    # Tests d'erreurs
    def test_invalid_sql_syntax(self, client, admin_token):
        """Test syntaxe SQL invalide"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "INVALID SQL QUERY",
            "mode": "GAV"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        assert response.status_code == 400
    
    def test_invalid_mode(self, client, admin_token):
        """Test mode invalide"""
        headers = self.get_auth_headers(admin_token)
        query_data = {
            "sql": "SELECT * FROM GlobalEmployee",
            "mode": "INVALID"
        }
        
        response = client.post("/api/query/execute", headers=headers, json=query_data)
        
        assert response.status_code == 400
    
    def test_unauthorized_access(self, client):
        """Test accès non autorisé"""
        response = client.get("/api/schema/global")
        
        assert response.status_code == 401
    
    def test_invalid_token(self, client):
        """Test token invalide"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/schema/global", headers=headers)
        
        assert response.status_code == 401

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
