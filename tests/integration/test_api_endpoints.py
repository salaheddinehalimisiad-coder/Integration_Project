import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/monitoring/health")
    assert response.status_code == 200
    assert response.json()["status"] in ["healthy", "degraded", "stopped", "unhealthy"]

def test_login_success():
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "ADMIN"

def test_login_failure():
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert response.status_code == 401

def test_execute_query_gav_unauthorized():
    # Test sans token
    response = client.post("/api/query/execute", json={"sql": "SELECT * FROM GlobalEmployee", "mode": "GAV"})
    assert response.status_code == 401

def test_execute_query_gav_authorized():
    # Login d'abord
    login_resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["token"]
    
    # Requête avec token
    response = client.post(
        "/api/query/execute", 
        json={"sql": "SELECT full_name FROM GlobalEmployee LIMIT 1", "mode": "GAV"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "rows" in response.json()
