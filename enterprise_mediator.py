from __future__ import annotations

import csv
import datetime
import hashlib
import json
import os
import re
import sqlite3
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

try:
    import bcrypt as _bcrypt
    _HAS_BCRYPT = True
except ImportError:  # pragma: no cover
    _HAS_BCRYPT = False

try:
    import jwt as _jwt
    _HAS_JWT = True
except ImportError:  # pragma: no cover
    _HAS_JWT = False


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SOURCES_DIR = BASE_DIR / "sources"
LEGACY_CSV = DATA_DIR / "employees_legacy.csv"
XML_PATH = SOURCES_DIR / "api_evaluations" / "evaluations.xml"
GRAPH_PATH = SOURCES_DIR / "neo4j_skills" / "skills_graph.json"

USE_DOCKER = os.environ.get("USE_DOCKER", "False").lower() in ("true", "1", "yes")

EUR_TO_USD = 1.08
DZD_TO_USD = 0.0074


GLOBAL_SCHEMA: dict[str, list[dict[str, str]]] = {
    "GlobalEmployee": [
        {"name": "employee_id", "type": "string"},
        {"name": "national_id", "type": "string"},
        {"name": "matricule", "type": "string"},
        {"name": "full_name", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "birth_date", "type": "date"},
        {"name": "department_id", "type": "string"},
        {"name": "department_name", "type": "string"},
        {"name": "country", "type": "string"},
        {"name": "salary_usd", "type": "number"},
        {"name": "status", "type": "string"},
        {"name": "performance_score", "type": "number"},
        {"name": "skills", "type": "string"},
        {"name": "source_confidence", "type": "number"},
    ],
    "GlobalDepartment": [
        {"name": "department_id", "type": "string"},
        {"name": "department_code", "type": "string"},
        {"name": "department_name", "type": "string"},
        {"name": "country", "type": "string"},
    ],
    "GlobalProject": [
        {"name": "project_id", "type": "string"},
        {"name": "project_name", "type": "string"},
        {"name": "client_name", "type": "string"},
        {"name": "status", "type": "string"},
        {"name": "start_date", "type": "date"},
        {"name": "end_date", "type": "date"},
    ],
    "GlobalAssignment": [
        {"name": "employee_id", "type": "string"},
        {"name": "project_id", "type": "string"},
        {"name": "role", "type": "string"},
        {"name": "allocation_rate", "type": "number"},
    ],
    "GlobalPayroll": [
        {"name": "employee_id", "type": "string"},
        {"name": "salary_usd", "type": "number"},
        {"name": "bonus_usd", "type": "number"},
        {"name": "risk_level", "type": "string"},
    ],
}


ROLE_POLICIES = {
    "ADMIN": {"tables": "*", "columns": "*"},
    "HR_MANAGER": {
        "tables": ["GlobalEmployee", "GlobalDepartment", "GlobalProject", "GlobalAssignment", "GlobalPayroll"],
        "columns": "*",
        "blocked_columns": ["risk_level"],
    },
    "PROJECT_MANAGER": {
        "tables": ["GlobalEmployee", "GlobalDepartment", "GlobalProject", "GlobalAssignment"],
        "columns": "*",
        "blocked_columns": ["salary_usd", "bonus_usd", "risk_level", "national_id"],
    },
    "FINANCE_OFFICER": {
        "tables": ["GlobalEmployee", "GlobalPayroll", "GlobalDepartment"],
        "columns": "*",
    },
    "EMPLOYEE_VIEWER": {
        "tables": ["GlobalEmployee", "GlobalDepartment", "GlobalProject", "GlobalAssignment"],
        "columns": ["employee_id", "full_name", "email", "department_name", "country", "status", "project_name", "role"],
    },
}


JWT_SECRET = os.environ.get("DATAMEDIATOR_JWT_SECRET", "datamediator-soutenance-secret-CHANGE-ME")
JWT_ALGO = "HS256"
JWT_TTL_HOURS = 8


def _hash_password(plain: str) -> str:
    """Hash un mot de passe avec bcrypt si disponible, sinon SHA-256 salé.
    Le hash bcrypt commence par '$2b$', le hash de secours par 'sha256$'."""
    if _HAS_BCRYPT:
        return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt(rounds=10)).decode("utf-8")
    salt = os.urandom(16).hex()
    return "sha256$" + salt + "$" + hashlib.sha256((salt + plain).encode("utf-8")).hexdigest()


def _verify_password(plain: str, stored: str) -> bool:
    if not stored:
        return False
    if stored.startswith("$2") and _HAS_BCRYPT:
        try:
            return _bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except Exception:
            return False
    if stored.startswith("sha256$"):
        try:
            _, salt, digest = stored.split("$", 2)
            return hashlib.sha256((salt + plain).encode("utf-8")).hexdigest() == digest
        except Exception:
            return False
    # legacy plaintext fallback (pour anciens tests)
    return stored == plain


# Mots de passe stockés en bcrypt — équivalents fonctionnels aux anciens
# admin/admin123, hr/hr123, project/project123, finance/finance123, viewer/viewer123
USERS = {
    "admin":   {"password_hash": _hash_password("admin123"),   "role": "ADMIN",            "name": "Administrateur"},
    "hr":      {"password_hash": _hash_password("hr123"),      "role": "HR_MANAGER",       "name": "Responsable RH"},
    "project": {"password_hash": _hash_password("project123"), "role": "PROJECT_MANAGER",  "name": "Chef de projet"},
    "finance": {"password_hash": _hash_password("finance123"), "role": "FINANCE_OFFICER",  "name": "Finance Officer"},
    "viewer":  {"password_hash": _hash_password("viewer123"),  "role": "EMPLOYEE_VIEWER",  "name": "Lecteur"},
}


CONFLICT_RULES = [
    {"type": "Nommage", "local": "employees / consultants", "global": "GlobalEmployee", "resolution": "Synonymes metier unifies dans une entite globale."},
    {"type": "Attribut", "local": "first_name + last_name / complete_name / nom_prenom", "global": "full_name", "resolution": "Concatener ou parser le nom complet."},
    {"type": "Unite", "local": "salary_eur / monthlySalaryDzd", "global": "salary_usd", "resolution": "Conversion EUR et DZD vers USD."},
    {"type": "Structure", "local": "department table / business_unit text", "global": "department_name", "resolution": "Normalisation par dictionnaire."},
    {"type": "Identifiant", "local": "emp_id / consultant_code / nationalId / legacy_id", "global": "employee_id", "resolution": "Reconciliation par email, matricule et similarite du nom."},
    {"type": "Type", "local": "allocation_percent INT", "global": "allocation_rate FLOAT", "resolution": "Division par 100."},
    {"type": "Securite", "local": "visibleToRoles", "global": "RBAC", "resolution": "Filtrage avant rewriting et execution."},
    {"type": "Modèle", "local": "Graphe (Noeuds/Arcs) / XML (Arbre)", "global": "Relationnel plat", "resolution": "Aplatissement et jointure par traversée de graphe et parsing DOM."},
]


SOURCE_INFO = [
    {"id": "S1", "name": "PostgreSQL RH", "kind": "SQL relationnel", "path": str(DATA_DIR / "postgres_hr.db")},
    {"id": "S2", "name": "MySQL Projets", "kind": "SQL relationnel", "path": str(DATA_DIR / "mysql_projects.db")},
    {"id": "S3", "name": "MongoDB Finance", "kind": "Documents simules", "path": str(DATA_DIR / "mongo_finance.db")},
    {"id": "S4", "name": "CSV Legacy", "kind": "Fichier plat", "path": str(LEGACY_CSV)},
    {"id": "S5", "name": "API Evaluations", "kind": "XML imbriqué", "path": str(XML_PATH)},
    {"id": "S6", "name": "Neo4j Skills", "kind": "Graphe JSON", "path": str(GRAPH_PATH)},
]


GAV_RULES = {
    "GlobalEmployee": [
        {
            "source": "S1",
            "description": "GlobalEmployee est construit depuis employees JOIN departments.",
            "sql": "SELECT e.emp_id, e.matricule, e.first_name, e.last_name, e.email, e.birth_date, e.salary_eur, e.status, d.dept_id, d.dept_name, d.country FROM employees e JOIN departments d ON e.dept_id = d.dept_id",
        },
        {
            "source": "S2",
            "description": "Les consultants actifs/inactifs sont vus comme employes globaux partiels.",
            "sql": "SELECT consultant_code, complete_name, mail, business_unit, active FROM consultants",
        },
        {
            "source": "S4",
            "description": "Le CSV legacy complete le schema global avec des donnees anciennes.",
            "sql": "CSV employees_legacy.csv",
        },
        {
            "source": "S5",
            "description": "L'API XML fournit les scores de performance des employés par email.",
            "sql": "XPATH //Eval",
        },
        {
            "source": "S6",
            "description": "Le graphe associe des compétences aux employés (MATCH e-KNOWS->s).",
            "sql": "GRAPH TRAVERSAL (Employee)-[:KNOWS]->(Skill)",
        },
    ],
    "GlobalDepartment": [
        {"source": "S1", "description": "Departements normalises depuis la source RH.", "sql": "SELECT * FROM departments"},
        {"source": "S2", "description": "business_unit est restructure en departement global.", "sql": "SELECT DISTINCT business_unit FROM consultants"},
    ],
    "GlobalProject": [
        {"source": "S2", "description": "Les projets viennent du systeme projets.", "sql": "SELECT * FROM projects"},
    ],
    "GlobalAssignment": [
        {"source": "S2", "description": "Les affectations projets sont transformees en allocations globales.", "sql": "SELECT * FROM assignments"},
    ],
    "GlobalPayroll": [
        {"source": "S3", "description": "Les documents payroll Mongo sont aplatis et convertis en USD.", "sql": "SELECT document_json FROM payroll"},
    ],
}


LAV_VIEWS = [
    {"view": "S1_HR_EMPLOYEE_VIEW", "source": "S1", "predicate": "GlobalEmployee", "provides": ["employee_id", "matricule", "full_name", "email", "birth_date", "department_id", "department_name", "country", "salary_usd", "status"], "constraints": {"country": ["DZ", "FR", "TN"], "status": ["ACTIVE", "INACTIVE"]}},
    {"view": "S1_HR_DEPARTMENT_VIEW", "source": "S1", "predicate": "GlobalDepartment", "provides": ["department_id", "department_code", "department_name", "country"], "constraints": {"country": ["DZ", "FR", "TN"]}},
    {"view": "S2_PROJECT_CONSULTANT_VIEW", "source": "S2", "predicate": "GlobalEmployee", "provides": ["employee_id", "matricule", "full_name", "email", "department_name", "status"], "constraints": {"status": ["ACTIVE", "INACTIVE"]}},
    {"view": "S2_PROJECT_VIEW", "source": "S2", "predicate": "GlobalProject", "provides": ["project_id", "project_name", "client_name", "status", "start_date", "end_date"], "constraints": {"status": ["ACTIVE", "CLOSED", "PAUSED"]}},
    {"view": "S2_ASSIGNMENT_VIEW", "source": "S2", "predicate": "GlobalAssignment", "provides": ["employee_id", "project_id", "role", "allocation_rate"], "constraints": {}},
    {"view": "S3_FINANCE_PAYROLL_VIEW", "source": "S3", "predicate": "GlobalPayroll", "provides": ["employee_id", "salary_usd", "bonus_usd", "risk_level"], "constraints": {"roles": ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]}},
    {"view": "S4_LEGACY_EMPLOYEE_VIEW", "source": "S4", "predicate": "GlobalEmployee", "provides": ["employee_id", "full_name", "email", "department_name", "country"], "constraints": {}},
    {"view": "S5_EVAL_VIEW", "source": "S5", "predicate": "GlobalEmployee", "provides": ["employee_id", "email", "performance_score"], "constraints": {}},
    {"view": "S6_SKILLS_VIEW", "source": "S6", "predicate": "GlobalEmployee", "provides": ["employee_id", "matricule", "skills"], "constraints": {}},
]


DEPARTMENT_NORMALIZER = {
    "IT": "Dép. Génie Logiciel",
    "IA": "Dép. Intelligence Artificielle",
    "SEC": "Dép. Cybersécurité",
    "DEV": "Dép. Génie Logiciel",
    "NET": "Dép. Réseaux & Systèmes",
    "DATA": "Dép. Data Science",
    "Génie Logiciel": "Dép. Génie Logiciel",
    "CyberSec": "Dép. Cybersécurité",
    "Sécurité": "Dép. Cybersécurité",
}


def query_postgres(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    if USE_DOCKER:
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            with psycopg2.connect(host="localhost", port=5433, dbname="hr_db", user="mediator_hr", password="mediator_hr_pwd") as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(sql, params)
                    if sql.strip().upper().startswith("SELECT"):
                        return [dict(r) for r in cur.fetchall()]
                    conn.commit()
                    return []
        except Exception as e:
            print(f"PostgreSQL Error: {e}, falling back to SQLite")
            
    con = sqlite3.connect(DATA_DIR / "postgres_hr.db")
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(sql, params)
    if sql.strip().upper().startswith("SELECT"):
        rows = [dict(r) for r in cur.fetchall()]
        con.close()
        return rows
    con.commit()
    con.close()
    return []

def query_mysql(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    if USE_DOCKER:
        try:
            import pymysql
            conn = pymysql.connect(host="localhost", port=3307, database="project_db", user="mediator_projects", password="mediator_projects_pwd", cursorclass=pymysql.cursors.DictCursor)
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if sql.strip().upper().startswith("SELECT"):
                    rows = cur.fetchall()
                    conn.close()
                    return rows
                conn.commit()
                conn.close()
                return []
        except Exception as e:
            print(f"MySQL Error: {e}, falling back to SQLite")

    con = sqlite3.connect(DATA_DIR / "mysql_projects.db")
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(sql, params)
    if sql.strip().upper().startswith("SELECT"):
        rows = [dict(r) for r in cur.fetchall()]
        con.close()
        return rows
    con.commit()
    con.close()
    return []

def query_mongo() -> list[dict[str, Any]]:
    if USE_DOCKER:
        try:
            import pymongo
            client = pymongo.MongoClient("mongodb://localhost:27018/")
            db = client["finance_db"]
            collection = db["payroll"]
            docs = []
            for doc in collection.find({}):
                doc.pop("_id", None)
                docs.append({"document_json": json.dumps(doc)})
            return docs
        except Exception as e:
            print(f"MongoDB Error: {e}, falling back to SQLite")

    con = sqlite3.connect(DATA_DIR / "mongo_finance.db")
    con.row_factory = sqlite3.Row
    rows = [{"document_json": r["document_json"]} for r in con.execute("SELECT document_json FROM payroll")]
    con.close()
    return rows


def _issue_jwt(username: str, role: str) -> str:
    """Émet un JWT signé HS256 avec exp à JWT_TTL_HOURS."""
    if _HAS_JWT:
        now = datetime.datetime.utcnow()
        payload = {
            "sub": username,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int((now + datetime.timedelta(hours=JWT_TTL_HOURS)).timestamp()),
        }
        return _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    # Fallback : hash signé du nom (compatibilité avec l'ancien comportement)
    return hashlib.sha256(f"datamediator:{username}:{JWT_SECRET}".encode()).hexdigest()


def _decode_jwt(token: str) -> dict[str, Any] | None:
    if not _HAS_JWT:
        return None
    try:
        return _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None


def resolve_user(token: str | None) -> dict[str, Any]:
    """Résout l'utilisateur à partir du token.
    - Sans token : retourne admin (mode démo locale sans auth).
    - Avec token invalide/expiré : lève ValueError (l'appelant doit renvoyer 401).
    """
    if not token:
        return {"username": "admin", **{k: v for k, v in USERS["admin"].items() if k != "password_hash"}}

    # Cas 1 : JWT signé valide
    payload = _decode_jwt(token)
    if payload:
        username = payload.get("sub")
        user = USERS.get(username)
        if user:
            return {"username": username, "role": user["role"], "name": user["name"]}

    # Cas 2 : ancien token SHA-256 (rétrocompatibilité tests)
    for username in USERS:
        signed = hashlib.sha256(f"datamediator:{username}:{JWT_SECRET}".encode()).hexdigest()
        if token == signed:
            user = USERS[username]
            return {"username": username, "role": user["role"], "name": user["name"]}

    # Token fourni mais non reconnu → accès refusé
    raise ValueError("Token invalide ou expiré")


def login(username: str, password: str) -> dict[str, Any] | None:
    user = USERS.get(username)
    if not user or not _verify_password(password, user.get("password_hash", "")):
        return None
    token = _issue_jwt(username, user["role"])
    return {
        "token": token,
        "username": username,
        "role": user["role"],
        "name": user["name"],
        "expires_in_hours": JWT_TTL_HOURS,
    }


def seed_enterprise_sources() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    _seed_hr()
    _seed_projects()
    _seed_finance()
    _seed_csv()
    _seed_xml_graph()


def _seed_xml_graph() -> None:
    xml_data = """<?xml version="1.0" encoding="UTF-8"?>
<Evaluations>
    <Eval employeeMail="amine.brahimi@univ-dz.dz">
        <Score>98</Score>
        <Feedback>Expert IA exceptionnel, leader sur E-Djazair</Feedback>
    </Eval>
    <Eval employeeMail="s.mansouri@it-dz.com">
        <Score>85</Score>
        <Feedback>Très bonne gestion de la cybersécurité</Feedback>
    </Eval>
    <Eval employeeMail="m.khelifi@tech-algerie.dz">
        <Score>90</Score>
        <Feedback>Excellente maîtrise du génie logiciel</Feedback>
    </Eval>
</Evaluations>
"""
    XML_PATH.parent.mkdir(parents=True, exist_ok=True)
    with XML_PATH.open("w", encoding="utf-8") as f:
        f.write(xml_data)

    graph_data = {
        "nodes": [
            {"id": "EMP-001", "label": "Employee", "name": "Amine Brahimi"},
            {"id": "EMP-003", "label": "Employee", "name": "Mohamed Khelifi"},
            {"id": "CONS-01", "label": "Employee", "name": "Ryad Mahrez"},
            {"id": "ML", "label": "Skill", "name": "Machine Learning"},
            {"id": "K8S", "label": "Skill", "name": "Kubernetes"},
            {"id": "SEC", "label": "Skill", "name": "Pentest"},
        ],
        "edges": [
            {"source": "EMP-001", "target": "ML", "type": "KNOWS", "weight": "Expert"},
            {"source": "EMP-001", "target": "K8S", "type": "KNOWS", "weight": "Senior"},
            {"source": "EMP-003", "target": "SEC", "type": "KNOWS", "weight": "Advanced"},
            {"source": "CONS-01", "target": "SEC", "type": "KNOWS", "weight": "Expert"},
        ]
    }
    GRAPH_PATH.parent.mkdir(parents=True, exist_ok=True)
    with GRAPH_PATH.open("w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2)


def _seed_hr() -> None:
    con = sqlite3.connect(DATA_DIR / "postgres_hr.db")
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;
        CREATE TABLE departments (
          dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
          dept_code TEXT UNIQUE,
          dept_name TEXT,
          country TEXT
        );
        CREATE TABLE employees (
          emp_id INTEGER PRIMARY KEY AUTOINCREMENT,
          matricule TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          email TEXT,
          birth_date TEXT,
          salary_eur REAL,
          dept_id INTEGER,
          status TEXT,
          FOREIGN KEY(dept_id) REFERENCES departments(dept_id)
        );
        """
    )
    departments = [
        ("IA", "Dép. Intelligence Artificielle", "DZ"),
        ("SEC", "Dép. Cybersécurité", "DZ"),
        ("DEV", "Dép. Génie Logiciel", "DZ"),
        ("NET", "Dép. Réseaux & Systèmes", "DZ"),
        ("DATA", "Dép. Data Science", "DZ"),
    ]
    cur.executemany("INSERT INTO departments(dept_code, dept_name, country) VALUES (?,?,?)", departments)
    employees = [
        ("EMP-001", "Amine", "Brahimi", "amine.brahimi@univ-dz.dz", "1990-05-15", 2500, 1, "ACTIVE"),
        ("EMP-002", "Sarah", "Mansouri", "s.mansouri@it-dz.com", "1992-11-20", 2800, 2, "ACTIVE"),
        ("EMP-003", "Mohamed", "Khelifi", "m.khelifi@tech-algerie.dz", "1988-03-10", 3200, 3, "ACTIVE"),
        ("EMP-004", "Yasmine", "Ziani", "yasmine.z@startup-dz.com", "1995-07-30", 2100, 4, "ACTIVE"),
        ("EMP-005", "Karim", "Belkacem", "k.belkacem@esi.dz", "1985-12-12", 4000, 1, "INACTIVE"),
    ]
    cur.executemany(
        "INSERT INTO employees(matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status) VALUES (?,?,?,?,?,?,?,?)",
        employees,
    )
    con.commit()
    con.close()


def _seed_projects() -> None:
    con = sqlite3.connect(DATA_DIR / "mysql_projects.db")
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS assignments;
        DROP TABLE IF EXISTS projects;
        DROP TABLE IF EXISTS consultants;
        CREATE TABLE consultants (
          consultant_code TEXT PRIMARY KEY,
          complete_name TEXT,
          mail TEXT,
          business_unit TEXT,
          active INTEGER
        );
        CREATE TABLE projects (
          project_code TEXT PRIMARY KEY,
          label TEXT,
          client_name TEXT,
          state TEXT,
          start_dt TEXT,
          end_dt TEXT
        );
        CREATE TABLE assignments (
          consultant_code TEXT,
          project_code TEXT,
          job_title TEXT,
          allocation_percent INTEGER,
          PRIMARY KEY (consultant_code, project_code)
        );
        """
    )
    consultants = [
        ("EMP-001", "Amine Brahimi", "amine.brahimi@univ-dz.dz", "IA", 1),
        ("EMP-003", "Mohamed Khelifi", "m.khelifi@tech-algerie.dz", "Génie Logiciel", 1),
        ("CONS-01", "Ryad Mahrez", "r.mahrez@freelance.dz", "Sécurité", 1),
        ("CONS-02", "Lina Boutefarka", "lina.b@it-consulting.dz", "Cloud", 1),
    ]
    projects = [
        ("PRJ-EDJ", "Système E-Djazair", "Gouvernement DZ", "ACTIVE", "2024-01-01", "2025-12-31"),
        ("PRJ-CLD", "Infrastructure Cloud DZ", "Algérie Télécom", "ACTIVE", "2024-06-01", "2025-06-01"),
        ("PRJ-SEC", "Audit Cybersécurité", "Ministère Finances", "ACTIVE", "2024-03-01", "2024-09-01"),
    ]
    assignments = [
        ("EMP-001", "PRJ-EDJ", "Lead Expert IA", 80),
        ("EMP-003", "PRJ-CLD", "Ingénieur Cloud", 70),
        ("CONS-01", "PRJ-SEC", "Expert Pentest", 90),
        ("CONS-02", "PRJ-CLD", "Architecte Réseaux", 50),
    ]
    cur.executemany("INSERT INTO consultants VALUES (?,?,?,?,?)", consultants)
    cur.executemany("INSERT INTO projects VALUES (?,?,?,?,?,?)", projects)
    cur.executemany("INSERT INTO assignments VALUES (?,?,?,?)", assignments)
    con.commit()
    con.close()


def _seed_finance() -> None:
    con = sqlite3.connect(DATA_DIR / "mongo_finance.db")
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS payroll;
        CREATE TABLE payroll (
          doc_id TEXT PRIMARY KEY,
          document_json TEXT
        );
        """
    )
    docs = [
        {"docId": "PAY-001", "nationalId": "DZ-1001", "employeeMatricule": "EMP-001", "name": {"first": "Amine", "last": "Brahimi"}, "monthlySalaryDzd": 455000, "bonusDzd": 80000, "currency": "DZD", "riskLevel": "LOW", "visibleToRoles": ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]},
        {"docId": "PAY-002", "nationalId": "DZ-2022", "employeeMatricule": "EMP-002", "name": {"first": "Sarah", "last": "Mansouri"}, "monthlySalaryDzd": 610000, "bonusDzd": 120000, "currency": "DZD", "riskLevel": "MEDIUM", "visibleToRoles": ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]},
        {"docId": "PAY-003", "nationalId": "DZ-3003", "employeeMatricule": "EMP-003", "name": {"first": "Mohamed", "last": "Khelifi"}, "monthlySalaryDzd": 350000, "bonusDzd": 55000, "currency": "DZD", "riskLevel": "LOW", "visibleToRoles": ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]},
        {"docId": "PAY-004", "nationalId": "DZ-4004", "employeeMatricule": "CONS-01", "name": {"first": "Ryad", "last": "Mahrez"}, "monthlySalaryDzd": 750000, "bonusDzd": 150000, "currency": "DZD", "riskLevel": "HIGH", "visibleToRoles": ["ADMIN", "FINANCE_OFFICER"]},
    ]
    cur.executemany("INSERT INTO payroll VALUES (?,?)", [(d["docId"], json.dumps(d)) for d in docs])
    con.commit()
    con.close()


def _seed_csv() -> None:
    rows = [
        ["legacy_id", "nom_prenom", "email", "dept", "pays", "grade"],
        ["L-001", "BOUZID Salim", "salim.bouzid@corp.dz", "IT", "DZ", "Expert"],
        ["L-002", "HAMIDI Fatma", "fatma.h@corp.dz", "Finance", "DZ", "Chef de bureau"],
        ["L-003", "KADI Omar", "omar.kadi@corp.dz", "Dév", "DZ", "Ingénieur"],
    ]
    with LEGACY_CSV.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)


def ensure_sources() -> None:
    required = [DATA_DIR / "postgres_hr.db", DATA_DIR / "mysql_projects.db", DATA_DIR / "mongo_finance.db", LEGACY_CSV, XML_PATH, GRAPH_PATH]
    if not all(p.exists() for p in required):
        seed_enterprise_sources()


def _norm_dept(value: str | None) -> str | None:
    if not value:
        return None
    return DEPARTMENT_NORMALIZER.get(value, value)


def _name_from_legacy(value: str) -> str:
    parts = value.strip().split()
    if len(parts) >= 2 and parts[0].isupper():
        return " ".join([parts[-1].capitalize(), " ".join(p.capitalize() for p in parts[:-1])])
    return value


def fetch_global_table(table: str, user: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ensure_sources()
    if table == "GlobalEmployee":
        return fetch_employees(user)
    if table == "GlobalDepartment":
        return fetch_departments(), []
    if table == "GlobalProject":
        return fetch_projects(), []
    if table == "GlobalAssignment":
        return fetch_assignments(), []
    if table == "GlobalPayroll":
        return fetch_payroll(user)
    raise ValueError(f"Table globale inconnue: {table}")


def fetch_employees(user: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rows: list[dict[str, Any]] = []
    for r in query_postgres(GAV_RULES["GlobalEmployee"][0]["sql"]):
        rows.append({
            "employee_id": f"S1:{r['emp_id']}",
            "national_id": None,
            "matricule": r["matricule"],
            "full_name": f"{r['first_name']} {r['last_name']}",
            "email": r["email"],
            "birth_date": str(r["birth_date"]) if r["birth_date"] else None,
            "department_id": f"S1:{r['dept_id']}",
            "department_name": _norm_dept(r["dept_name"]),
            "country": r["country"],
            "salary_usd": round(float(r["salary_eur"]) * EUR_TO_USD, 2) if r["salary_eur"] else None,
            "status": "ACTIVE" if r["status"] == "ACTIVE" else "INACTIVE",
            "source_confidence": 0.95,
            "_source": "S1",
            "_local_id": str(r["emp_id"]),
        })

    for r in query_mysql(GAV_RULES["GlobalEmployee"][1]["sql"]):
        rows.append({
            "employee_id": f"S2:{r['consultant_code']}",
            "national_id": None,
            "matricule": r["consultant_code"],
            "full_name": r["complete_name"],
            "email": r["mail"],
            "birth_date": None,
            "department_id": None,
            "department_name": _norm_dept(r["business_unit"]),
            "country": None,
            "salary_usd": None,
            "status": "ACTIVE" if r["active"] else "INACTIVE",
            "source_confidence": 0.80,
            "_source": "S2",
            "_local_id": r["consultant_code"],
        })

    if LEGACY_CSV.exists():
        with LEGACY_CSV.open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                rows.append({
                    "employee_id": f"S4:{r['legacy_id']}",
                    "national_id": None,
                    "matricule": None,
                    "full_name": _name_from_legacy(r["nom_prenom"]),
                    "email": r["email"],
                    "birth_date": None,
                    "department_id": None,
                    "department_name": _norm_dept(r["dept"]),
                    "country": r["pays"],
                    "salary_usd": None,
                    "status": "ACTIVE",
                    "source_confidence": 0.60,
                    "_source": "S4",
                    "_local_id": r["legacy_id"],
                })
                
    if XML_PATH.exists():
        tree = ET.parse(XML_PATH)
        root = tree.getroot()
        for i, eval_node in enumerate(root.findall("Eval")):
            mail = eval_node.get("employeeMail")
            score_node = eval_node.find("Score")
            score = float(score_node.text) if score_node is not None else None
            rows.append({
                "employee_id": f"S5:{i}",
                "email": mail,
                "performance_score": score,
                "source_confidence": 0.90,
                "_source": "S5",
                "_local_id": str(i),
            })

    if GRAPH_PATH.exists():
        with GRAPH_PATH.open(encoding="utf-8") as f:
            graph = json.load(f)
            skills_by_emp = {}
            for edge in graph.get("edges", []):
                if edge["type"] == "KNOWS":
                    skills_by_emp.setdefault(edge["source"], []).append(edge["target"])
            
            for emp_id, skills in skills_by_emp.items():
                rows.append({
                    "employee_id": f"S6:{emp_id}",
                    "matricule": emp_id,
                    "skills": ", ".join(skills),
                    "source_confidence": 0.85,
                    "_source": "S6",
                    "_local_id": emp_id,
                })

    return reconcile_employees(rows)


def fetch_departments() -> list[dict[str, Any]]:
    ensure_sources()
    rows: list[dict[str, Any]] = []
    for r in query_postgres("SELECT * FROM departments"):
        rows.append({"department_id": f"S1:{r['dept_id']}", "department_code": r["dept_code"], "department_name": _norm_dept(r["dept_name"]), "country": r["country"], "_source": "S1"})
        
    seen = {r["department_name"] for r in rows}
    for r in query_mysql("SELECT DISTINCT business_unit FROM consultants"):
        dept = _norm_dept(r["business_unit"])
        if dept not in seen:
            rows.append({"department_id": f"S2:{r['business_unit']}", "department_code": r["business_unit"], "department_name": dept, "country": None, "_source": "S2"})
            seen.add(dept)
    return rows


def fetch_projects() -> list[dict[str, Any]]:
    ensure_sources()
    rows = [{
        "project_id": f"S2:{r['project_code']}",
        "project_name": r["label"],
        "client_name": r["client_name"],
        "status": r["state"],
        "start_date": str(r["start_dt"]) if r["start_dt"] else None,
        "end_date": str(r["end_dt"]) if r["end_dt"] else None,
        "_source": "S2",
    } for r in query_mysql("SELECT * FROM projects")]
    return rows


def _canonical_employee_map(user: dict[str, Any]) -> dict[str, str]:
    employees, _ = fetch_employees(user)
    mapping: dict[str, str] = {}
    for e in employees:
        cid = e["employee_id"]
        if e.get("matricule"):
            mapping[e["matricule"]] = cid
        if e.get("email"):
            mapping[e["email"].lower()] = cid
        for src in e.get("_merged_from", []):
            if src.startswith("S2:"):
                mapping[src.split(":", 1)[1]] = cid
    return mapping


def fetch_assignments() -> list[dict[str, Any]]:
    ensure_sources()
    user = {"role": "ADMIN"}
    emp_map = _canonical_employee_map(user)
    rows = []
    for r in query_mysql("SELECT * FROM assignments"):
        rows.append({
            "employee_id": emp_map.get(r["consultant_code"], f"S2:{r['consultant_code']}"),
            "project_id": f"S2:{r['project_code']}",
            "role": r["job_title"],
            "allocation_rate": round(int(r["allocation_percent"]) / 100, 2),
            "_source": "S2",
        })
    return rows


def fetch_payroll(user: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ensure_sources()
    role = user.get("role", "ADMIN")
    emp_map = _canonical_employee_map({"role": "ADMIN"})
    rows: list[dict[str, Any]] = []
    for r in query_mongo():
        doc = json.loads(r["document_json"])
        if role not in doc.get("visibleToRoles", []) and role != "ADMIN":
            continue
        matricule = doc.get("employeeMatricule")
        rows.append({
            "employee_id": emp_map.get(matricule, f"S3:{matricule}"),
            "salary_usd": round(float(doc["monthlySalaryDzd"]) * DZD_TO_USD, 2),
            "bonus_usd": round(float(doc["bonusDzd"]) * DZD_TO_USD, 2),
            "risk_level": doc["riskLevel"],
            "national_id": doc.get("nationalId"),
            "_source": "S3",
        })
    return rows, []


RESOLUTIONS_FILE = DATA_DIR / "conflict_resolutions.json"

def get_conflict_resolutions() -> dict[str, str]:
    if RESOLUTIONS_FILE.exists():
        try:
            with RESOLUTIONS_FILE.open(encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_conflict_resolution(canonical_id: str, field: str, chosen_source: str) -> None:
    resolutions = get_conflict_resolutions()
    resolutions[f"{canonical_id}:{field}"] = chosen_source
    DATA_DIR.mkdir(exist_ok=True)
    with RESOLUTIONS_FILE.open("w", encoding="utf-8") as f:
        json.dump(resolutions, f, indent=2)


def _similar(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _match_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    score = 0.0
    if a.get("email") and a.get("email") == b.get("email"):
        score += 0.50
    if a.get("matricule") and a.get("matricule") == b.get("matricule"):
        score += 0.40
    if _similar(a.get("full_name"), b.get("full_name")) > 0.90:
        score += 0.25
    if a.get("department_name") and a.get("department_name") == b.get("department_name"):
        score += 0.15
    if a.get("country") and a.get("country") == b.get("country"):
        score += 0.10
    return score


def _blocking_key(row: dict[str, Any]) -> str:
    """Génère une clé de blocage simple pour regrouper les candidats potentiels."""
    if row.get("email"):
        return row["email"].strip().lower()[0]
    if row.get("full_name"):
        return row["full_name"].strip().lower()[0]
    if row.get("matricule"):
        cleaned = re.sub(r'[^a-zA-Z]', '', row["matricule"])
        if cleaned:
            return cleaned.lower()[0]
    return "default"


def reconcile_employees(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    # 1. Étape de blocking pour réduire la complexité O(n^2)
    blocks: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        bk = _blocking_key(row)
        blocks.setdefault(bk, []).append(row)

    groups: list[list[dict[str, Any]]] = []
    # Comparaisons uniquement au sein du même bloc de candidats
    for block_key, block_rows in blocks.items():
        block_groups: list[list[dict[str, Any]]] = []
        for row in block_rows:
            placed = False
            for group in block_groups:
                if max(_match_score(row, g) for g in group) >= 0.75:
                    group.append(row)
                    placed = True
                    break
            if not placed:
                block_groups.append([row])
        groups.extend(block_groups)

    # Récupérer les résolutions manuelles d'arbitrage
    resolutions = get_conflict_resolutions()

    reconciled = []
    events = []
    for idx, group in enumerate(groups, start=1):
        group.sort(key=lambda r: r.get("source_confidence") or 0, reverse=True)
        base = dict(group[0])
        base["employee_id"] = f"EMP:{idx:04d}"
        base["_merged_from"] = [g["employee_id"] for g in group]
        base["_sources"] = sorted({g["_source"] for g in group})

        detected_conflicts = []
        for g in group[1:]:
            for key, value in g.items():
                if key.startswith("_"):
                    continue
                if value not in (None, ""):
                    base_val = base.get(key)
                    if base_val not in (None, ""):
                        # Si les valeurs diffèrent significativement
                        if str(base_val).strip().lower() != str(value).strip().lower():
                            detected_conflicts.append({
                                "field": key,
                                "base_val": base_val,
                                "other_val": value,
                                "base_source": base["_source"],
                                "other_source": g["_source"]
                            })
                    else:
                        base[key] = value

        # Appliquer les arbitrages enregistrés si des conflits existent
        for conf in detected_conflicts:
            field_name = conf["field"]
            res_key = f"{base['employee_id']}:{field_name}"
            if res_key in resolutions:
                chosen_src = resolutions[res_key]
                # Trouver la valeur correspondante dans la source choisie
                matching_g = next((g for g in group if g["_source"] == chosen_src), None)
                if matching_g and matching_g.get(field_name) not in (None, ""):
                    base[field_name] = matching_g[field_name]

        if len(group) > 1:
            events.append({
                "canonical_id": base["employee_id"],
                "merged_from": base["_merged_from"],
                "score": round(max(_match_score(group[0], g) for g in group[1:]), 2),
                "chosen_source": group[0]["_source"],
                "reason": "Fusion par email/matricule/similarite avec priorite de confiance.",
                "conflicts": detected_conflicts
            })
        reconciled.append(base)
    return reconciled, events



@dataclass
class ParsedQuery:
    sql: str
    select_items: list[str]
    tables: list[str]
    aliases: dict[str, str]
    joins: list[tuple[str, str, str]]
    where: str | None
    group_by: list[str]
    order_by: str | None
    limit: int | None
    parser: str = "regex"   # 'sqlglot' ou 'regex'
    warnings: list[str] = None


def _parse_with_sqlglot(sql: str) -> ParsedQuery | None:
    """Tente de parser avec sqlglot et convertit en ParsedQuery legacy.
    Retourne None si sqlglot indisponible ou si le SQL n'est pas supporté."""
    try:
        from sql_parser import parse_sql as _sg_parse
    except ImportError:
        return None
    try:
        rpq = _sg_parse(sql)
    except Exception:
        return None

    # Convert select items back to strings (compat with QueryEngine internals)
    select_items: list[str] = []
    for si in rpq.select_items:
        if si.is_count:
            txt = "COUNT(*)"
            if si.alias:
                txt = f"COUNT(*) AS {si.alias}"
            select_items.append(txt)
        elif si.column:
            txt = f"{si.table_alias}.{si.column}" if si.table_alias else si.column
            if si.alias:
                txt = f"{txt} AS {si.alias}"
            select_items.append(txt)
        else:
            select_items.append(si.expr if not si.alias else f"{si.expr} AS {si.alias}")

    # Convert joins (drop the right_ref position to match legacy 3-tuple)
    legacy_joins = [(t, a, f"{lref} = {rref}") for (t, a, lref, rref) in rpq.joins]

    # WHERE: keep raw text — QueryEngine uses its own re-evaluator
    where_text = rpq.where.raw if rpq.where else None

    # ORDER BY: keep first as text
    order_by_text = None
    if rpq.order_by:
        col, direction = rpq.order_by[0]
        order_by_text = f"{col} {direction}" if direction == "DESC" else col

    return ParsedQuery(
        sql=rpq.sql,
        select_items=select_items,
        tables=rpq.tables,
        aliases=rpq.aliases,
        joins=legacy_joins,
        where=where_text,
        group_by=rpq.group_by,
        order_by=order_by_text,
        limit=rpq.limit,
        parser="sqlglot",
        warnings=list(rpq.warnings),
    )


class QueryEngine:
    def execute(self, sql: str, mode: str, user: dict[str, Any]) -> dict[str, Any]:
        start = time.perf_counter()
        
        # Vérifier le cache
        try:
            from cache_manager import cache_manager, monitor_performance
            cache_key = cache_manager._generate_key(
                "query_execution",
                sql=sql,
                mode=mode,
                user=user.get("username", "anonymous")
            )
            
            cached_result = cache_manager.get(cache_key)
            if cached_result:
                cached_result["cached"] = True
                cached_result["execution_ms"] = round((time.perf_counter() - start) * 1000, 2)
                return cached_result
        except ImportError:
            pass
        
        # Exécuter la requête
        parsed = self.parse(sql)
        self._authorize(parsed, user)
        plan = self._plan(parsed, mode, user)
        datasets: dict[str, list[dict[str, Any]]] = {}
        reconciliation_events: list[dict[str, Any]] = []
        for table in parsed.tables:
            # Utiliser les versions cachées des fonctions
            try:
                from cache_manager import fetch_employees_cached, fetch_departments_cached, fetch_projects_cached
                if table == "GlobalEmployee":
                    data, events = fetch_employees_cached(user)
                elif table == "GlobalDepartment":
                    data, events = fetch_departments_cached(user)
                elif table == "GlobalProject":
                    data, events = fetch_projects_cached(user)
                else:
                    data, events = fetch_global_table(table, user)
            except ImportError:
                data, events = fetch_global_table(table, user)
            
            datasets[table] = data
            reconciliation_events.extend(events)
        rows = self._combine(parsed, datasets)
        rows = [r for r in rows if self._where_matches(r, parsed.where)]
        rows = self._project(parsed, rows)
        if parsed.group_by:
            rows = self._group(parsed, rows)
        if parsed.order_by:
            key = parsed.order_by.split(".")[-1].strip()
            rows = sorted(rows, key=lambda r: str(r.get(key, "")))
        if parsed.limit:
            rows = rows[: parsed.limit]
        columns = list(rows[0].keys()) if rows else [self._display_name(c) for c in parsed.select_items]
        
        result = {
            "mode": mode,
            "global_sql": sql,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "plan": plan,
            "reconciliation": reconciliation_events,
            "execution_ms": round((time.perf_counter() - start) * 1000, 2),
            "cached": False
        }
        
        # Mettre en cache le résultat (sauf pour les requêtes très petites ou si désactivé)
        if os.environ.get("DISABLE_CACHE") != "True":
            try:
                if len(rows) > 0 and len(rows) < 1000:
                    from cache_manager import cache_manager
                    cache_manager.set(cache_key, result, ttl=1800)
            except ImportError:
                pass
        
        # Monitorer la performance
        try:
            from cache_manager import performance_monitor
            performance_monitor.record_query(sql, result["execution_ms"] / 1000, user.get("username", "anonymous"))
        except ImportError:
            pass
        
        return result

    def parse(self, sql: str) -> ParsedQuery:
        # 1. Première tentative : parser robuste sqlglot
        sg = _parse_with_sqlglot(sql)
        if sg is not None:
            return sg

        # 2. Fallback : ancien parser regex (compat ascendante)
        clean = " ".join(sql.strip().rstrip(";").split())
        if not clean.lower().startswith("select "):
            raise ValueError("Seules les requetes SELECT sont autorisees.")
        select_match = re.search(r"select\s+(.*?)\s+from\s+", clean, re.I)
        if not select_match:
            raise ValueError("Requete SELECT invalide.")
        select_items = [x.strip() for x in select_match.group(1).split(",")]
        where = self._extract_clause(clean, "where", ["group by", "order by", "limit"])
        group_text = self._extract_clause(clean, "group by", ["order by", "limit"])
        order_by = self._extract_clause(clean, "order by", ["limit"])
        limit_text = self._extract_clause(clean, "limit", [])
        limit = int(limit_text) if limit_text and limit_text.isdigit() else None

        from_to = re.split(r"\s+where\s+|\s+group by\s+|\s+order by\s+|\s+limit\s+", clean, flags=re.I)[0]
        from_part = re.split(r"\s+from\s+", from_to, flags=re.I)[1]
        segments = re.split(r"\s+join\s+", from_part, flags=re.I)
        aliases: dict[str, str] = {}
        tables: list[str] = []
        joins: list[tuple[str, str, str]] = []
        first_table, first_alias = self._parse_table_alias(segments[0])
        aliases[first_alias] = first_table
        tables.append(first_table)
        for seg in segments[1:]:
            table_part, on_part = re.split(r"\s+on\s+", seg, maxsplit=1, flags=re.I)
            table, alias = self._parse_table_alias(table_part)
            aliases[alias] = table
            tables.append(table)
            joins.append((table, alias, on_part.strip()))
        return ParsedQuery(clean, select_items, tables, aliases, joins, where, [x.strip() for x in group_text.split(",")] if group_text else [], order_by, limit)

    def _extract_clause(self, sql: str, clause: str, stops: list[str]) -> str | None:
        pattern = rf"\s{clause}\s+"
        m = re.search(pattern, sql, re.I)
        if not m:
            return None
        start = m.end()
        end = len(sql)
        for stop in stops:
            sm = re.search(rf"\s{stop}\s+", sql[start:], re.I)
            if sm:
                end = min(end, start + sm.start())
        return sql[start:end].strip()

    def _parse_table_alias(self, text: str) -> tuple[str, str]:
        parts = text.strip().split()
        table = parts[0]
        alias = parts[-1] if len(parts) > 1 and parts[-2].lower() != "as" else table
        if len(parts) == 3 and parts[1].lower() == "as":
            alias = parts[2]
        return table, alias

    def _authorize(self, parsed: ParsedQuery, user: dict[str, Any]) -> None:
        role = user.get("role", "ADMIN")
        policy = ROLE_POLICIES.get(role, ROLE_POLICIES["EMPLOYEE_VIEWER"])
        if policy["tables"] != "*":
            denied = [t for t in parsed.tables if t not in policy["tables"]]
            if denied:
                raise PermissionError(f"Role {role} ne peut pas interroger: {', '.join(denied)}")
        selected = [self._display_name(x) for x in parsed.select_items if not x.lower().startswith("count(")]
        if policy.get("columns") != "*":
            denied_cols = [c for c in selected if c != "*" and c not in policy["columns"]]
            if denied_cols:
                raise PermissionError(f"Colonnes interdites pour {role}: {', '.join(denied_cols)}")
        blocked = set(policy.get("blocked_columns", []))
        denied_blocked = [c for c in selected if c in blocked]
        if denied_blocked:
            raise PermissionError(f"Colonnes sensibles interdites pour {role}: {', '.join(denied_blocked)}")

    def _plan(self, parsed: ParsedQuery, mode: str, user: dict[str, Any]) -> dict[str, Any]:
        if mode.upper() == "LAV":
            return self._lav_plan(parsed, user)
        return self._gav_plan(parsed, user)

    def _gav_plan(self, parsed: ParsedQuery, user: dict[str, Any]) -> dict[str, Any]:
        local_queries = []
        steps = ["Parser la requete SQL globale", "Remplacer chaque relation globale par ses vues GAV", "Executer les sources", "Joindre et reconcilier au mediateur", "Appliquer projection, filtres et droits"]
        for table in parsed.tables:
            for rule in GAV_RULES.get(table, []):
                local_queries.append({"table": table, "source": rule["source"], "query": rule["sql"], "description": rule["description"]})
        return {"strategy": "GAV", "steps": steps, "local_queries": local_queries}

    def _lav_plan(self, parsed: ParsedQuery, user: dict[str, Any]) -> dict[str, Any]:
        buckets: dict[str, list[dict[str, Any]]] = {}
        trace = ["Phase 1: construction des buckets par sous-but global."]
        required_by_table = self._required_columns(parsed)
        for table in parsed.tables:
            buckets[table] = []
            for view in LAV_VIEWS:
                if view["predicate"] != table:
                    continue
                role_constraint = view.get("constraints", {}).get("roles")
                if role_constraint and user.get("role") not in role_constraint and user.get("role") != "ADMIN":
                    trace.append(f"REJET {view['view']}: role {user.get('role')} non autorise.")
                    continue
                required = required_by_table.get(table, set())
                if required and not required.issubset(set(view["provides"])):
                    trace.append(f"REJET {view['view']}: couverture insuffisante pour {sorted(required)}.")
                    continue
                buckets[table].append(view)
                trace.append(f"bucket[{table}] += {view['view']}")
        trace.append("Phase 2: combinaison des buckets et validation des jointures.")
        
        # Intégration algorithme MiniCon réel
        minicon_details = None
        try:
            from mini_con import Query, View, Subgoal, minicon_rewrite
            body = []
            pred_args = {
                "GlobalEmployee":    ("eid", "name", "status"),
                "GlobalProject":     ("pid", "pname", "state"),
                "GlobalAssignment":  ("eid", "pid"),
                "GlobalDepartment":  ("did", "dept", "country"),
                "GlobalPayroll":     ("eid", "sal", "bonus"),
            }
            for t in parsed.tables:
                args = pred_args.get(t, ("x",))
                body.append(Subgoal(t, args))
            head_vars = tuple(self._display_name(item) for item in parsed.select_items if not item.lower().startswith("count("))
            Q = Query(name="Q", head_vars=head_vars or ("x",), body=tuple(body))
            
            views = []
            for v in LAV_VIEWS:
                pred = v["predicate"]
                args = pred_args.get(pred, ("x",))
                views.append(View(name=v["view"], head_vars=args, body=(Subgoal(pred, args),)))
            
            minicon_details = minicon_rewrite(Q, views)
        except Exception:
            pass

        chosen = [{k: v for k, v in view.items() if k != "constraints"} for views in buckets.values() for view in views]
        plan_res = {
            "strategy": "LAV_MINICON" if minicon_details else "LAV_BUCKET",
            "buckets": buckets,
            "chosen_views": chosen,
            "trace": minicon_details["trace"] if minicon_details else trace,
        }
        if minicon_details:
            plan_res["minicon"] = minicon_details
        return plan_res

    def _required_columns(self, parsed: ParsedQuery) -> dict[str, set[str]]:
        required = {t: set() for t in parsed.tables}
        for item in parsed.select_items:
            if item == "*" or item.lower().startswith("count("):
                continue
            alias, col = self._split_ref(item)
            table = parsed.aliases.get(alias) if alias else (parsed.tables[0] if len(parsed.tables) == 1 else None)
            if table:
                required[table].add(col)
        return required

    def _combine(self, parsed: ParsedQuery, datasets: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
        first = parsed.tables[0]
        first_alias = next(a for a, t in parsed.aliases.items() if t == first)
        rows = [self._prefix(row, first_alias) for row in datasets[first]]
        for table, alias, on_expr in parsed.joins:
            right_rows = [self._prefix(row, alias) for row in datasets[table]]
            left_ref, right_ref = [x.strip() for x in on_expr.split("=")]
            joined = []
            for lrow in rows:
                for rrow in right_rows:
                    direct = left_ref in lrow and right_ref in rrow and lrow[left_ref] == rrow[right_ref]
                    reverse = right_ref in lrow and left_ref in rrow and lrow[right_ref] == rrow[left_ref]
                    if direct or reverse:
                        joined.append({**lrow, **rrow})
            rows = joined
        if not parsed.joins:
            return [self._unprefix(row) for row in rows]
        return rows

    def _prefix(self, row: dict[str, Any], alias: str) -> dict[str, Any]:
        out = {}
        for k, v in row.items():
            out[f"{alias}.{k}"] = v
            out.setdefault(k, v)
        return out

    def _unprefix(self, row: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in row.items() if "." not in k}

    def _where_matches(self, row: dict[str, Any], where: str | None) -> bool:
        if not where:
            return True
        clauses = re.split(r"\s+and\s+", where, flags=re.I)
        for clause in clauses:
            m = re.match(r"([\w.]+)\s*(=|>|<|>=|<=)\s*'?(.*?)'?$", clause.strip())
            if not m:
                continue
            col, op, raw = m.groups()
            value = row.get(col, row.get(col.split(".")[-1]))
            wanted: Any = raw
            try:
                value_num = float(value)
                wanted_num = float(raw)
                value, wanted = value_num, wanted_num
            except Exception:
                pass
            if op == "=" and str(value) != str(wanted):
                return False
            if op == ">" and not (value > wanted):
                return False
            if op == "<" and not (value < wanted):
                return False
            if op == ">=" and not (value >= wanted):
                return False
            if op == "<=" and not (value <= wanted):
                return False
        return True

    def _project(self, parsed: ParsedQuery, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if parsed.select_items == ["*"]:
            return rows
        projected = []
        for row in rows:
            item = {}
            for sel in parsed.select_items:
                if sel.lower().startswith("count("):
                    continue
                name = self._display_name(sel)
                item[name] = row.get(sel, row.get(name))
            projected.append(item)
        return projected

    def _group(self, parsed: ParsedQuery, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        group_col = self._display_name(parsed.group_by[0])
        counter_name = "employee_count"
        for sel in parsed.select_items:
            if " as " in sel.lower() and sel.lower().startswith("count("):
                counter_name = re.split(r"\s+as\s+", sel, flags=re.I)[1].strip()
        grouped: dict[Any, int] = {}
        for row in rows:
            grouped[row.get(group_col)] = grouped.get(row.get(group_col), 0) + 1
        return [{group_col: k, counter_name: v} for k, v in grouped.items()]

    def _split_ref(self, item: str) -> tuple[str | None, str]:
        item = re.split(r"\s+as\s+", item, flags=re.I)[0].strip()
        if "." in item:
            alias, col = item.split(".", 1)
            return alias, col
        return None, item

    def _display_name(self, item: str) -> str:
        if " as " in item.lower():
            return re.split(r"\s+as\s+", item, flags=re.I)[1].strip()
        return item.split(".")[-1].strip()


def add_demo_employee() -> dict[str, Any]:
    ensure_sources()
    dept = query_postgres("SELECT dept_id FROM departments WHERE dept_code = 'AI'")
    if not dept:
        query_postgres("INSERT INTO departments(dept_code, dept_name, country) VALUES ('AI', 'AI Lab', 'DZ')")
        dept = query_postgres("SELECT dept_id FROM departments WHERE dept_code = 'AI'")

    dept_id = dept[0]["dept_id"]
    stamp = int(time.time())
    matricule = f"EMP-T{stamp}"

    query_postgres(
        "INSERT INTO employees(matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)" if USE_DOCKER else "INSERT INTO employees(matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status) VALUES (?,?,?,?,?,?,?,?)",
        (matricule, "Test", "Integration", f"test.integration.{stamp}@corp.dz", "1999-05-10", 3000, dept_id, "ACTIVE"),
    )

    # Invalider le cache pour que les prochaines requêtes voient le nouvel employé
    try:
        from cache_manager import invalidate_table_cache
        invalidate_table_cache("GlobalEmployee")
    except ImportError:
        pass

    return {"matricule": matricule, "department_name": "AI Lab", "message": "Employe ajoute dans la source S1 PostgreSQL RH !"}



