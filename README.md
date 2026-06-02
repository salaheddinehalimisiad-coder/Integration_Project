# DataMediator 🚀

> **Médiation virtuelle de données hétérogènes (RH / Projets / Finance)** — Une solution d'intégration de données à la pointe de l'état de l'art utilisant les approches **GAV**, **LAV (MiniCon)** et la **Réconciliation d'entités**.

[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)]()
[![React](https://img.shields.io/badge/react-19-61dafb.svg)]()
[![FastAPI](https://img.shields.io/badge/fastapi-0.128-009688.svg)]()
[![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)]()

---

## 📖 Sommaire
1. [Présentation](#1-présentation)
2. [Architecture Technique](#2-architecture-technique)
3. [Démarrage Rapide](#3-démarrage-rapide)
4. [Identifiants et Accès](#4-identifiants-et-accès)
5. [Administration des Bases (Docker)](#5-administration-des-bases-docker)
6. [Tests et Qualité](#6-tests-et-qualité)
7. [Fonctionnalités Clés](#7-fonctionnalités-clés)
8. [Sécurité et RBAC](#8-sécurité-et-rbac)
9. [Guide de Démonstration](#9-guide-de-démonstration)

---

## 1. Présentation
**DataMediator** est un médiateur de données virtuel conçu pour unifier des sources d'informations hétérogènes (RH, Projets, Finance) sans duplication de données. Il permet d'interroger un **schéma global unique** tout en laissant les données dans leurs systèmes d'origine.

### Sources prises en charge :
*   **PostgreSQL** (Système RH principal)
*   **MySQL** (Gestion de projets)
*   **MongoDB** (Documents Finance/Payroll)
*   **CSV Legacy** (Données historiques)
*   **XML** (Évaluations de performance via XPath)
*   **JSON/Graph** (Compétences via traversée de graphe)

---

## 2. Architecture Technique
Le projet repose sur des piliers théoriques solides de l'intégration de données :
*   **GAV (Global-As-View)** : Dépliage des requêtes globales vers les sources locales.
*   **LAV (Local-As-View)** : Utilisation de l'algorithme **MiniCon** (plus performant que Bucket) pour réécrire les requêtes à partir de vues locales.
*   **Réconciliation d'Entités** : Fusion intelligente des doublons (ex: un employé présent dans Postgres et dans le CSV Legacy) via score de confiance et emails.
*   **Médiation Virtuelle** : Aucune donnée n'est stockée de façon permanente dans le médiateur (sauf cache Redis optionnel).

---

## 3. Démarrage Rapide

### Option A — Script Automatisé (Windows)
```powershell
.\start.ps1
```
Ce script installe les dépendances, initialise les sources et lance le Backend (Port 5001) et le Frontend (Port 3000).

### Option B — Avec Docker (Infrastructure Réelle)
Pour utiliser les vraies bases de données au lieu des fichiers SQLite locaux :
```powershell
# 1. Lancer les bases de données
docker compose up -d

# 2. Configurer le mode Docker et lancer le backend
$env:USE_DOCKER = "True"
python -m uvicorn main:app --port 5001 --reload
```

---

## 4. Identifiants et Accès

### 🔐 Application (Login Frontend)
| Rôle | Utilisateur | Mot de passe | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | **`admin123`** | Accès total à toutes les données et outils. |
| **RH Manager** | `hr` | **`hr123`** | Accès RH + Projets. Colonnes Finance masquées. |
| **Chef de Projet** | `project` | **`project123`** | Accès Projets + RH partiel (salaires masqués). |
| **Finance Officer** | `finance` | **`finance123`** | Accès Finance + RH. |
| **Lecteur** | `viewer` | **`viewer123`** | Accès lecture seule restreint. |

---

## 5. Administration des Bases (Docker)
Si vous utilisez le mode Docker, vous pouvez administrer les bases via les interfaces Web incluses.

### 🐘 Adminer (Postgres & MySQL)
**URL** : [http://localhost:8080](http://localhost:8080)

| Système | Serveur (Host) | Utilisateur | Mot de passe | Base de données |
| :--- | :--- | :--- | :--- | :--- |
| **MySQL** | `datamediator_mysql_projects` | `mediator_projects` | `mediator_projects_pwd` | `project_db` |
| **PostgreSQL** | `datamediator_postgres_hr` | `mediator_hr` | `mediator_hr_pwd` | `hr_db` |

### 🍃 Mongo Express (MongoDB)
**URL** : [http://localhost:8081](http://localhost:8081)
Visualisez les documents de la collection `payroll` dans la base `finance_db`.

---

## 6. Tests et Qualité
Le projet inclut une suite de tests complète organisée par niveaux :

### Exécuter les tests
```powershell
# Tous les tests
pytest

# Tests Unitaires uniquement
pytest tests/unit

# Tests d'Intégration (API & DB)
pytest tests/integration

# Tests de bout en bout (Playwright)
# Assurez-vous que le backend et le frontend tournent
pytest tests/e2e
```

### Couverture
*   **Unit** : Algorithme MiniCon, Réconciliation d'entités (Fellegi-Sunter), Normalisation.
*   **Integration** : Endpoints FastAPI, Authentification JWT, RBAC.
*   **E2E** : Scénario complet de login et exécution SQL dans le navigateur.

---

## 7. Fonctionnalités Clés
*   **Moteur SQL Intelligent** : Supporte les JOIN, WHERE, GROUP BY et agrégations sur des sources multiples.
*   **Analyse de Plan (Explain)** : Visualisation étape par étape de la réécriture de la requête (GAV vs LAV).
*   **Gestion des Conflits** : Résolution automatique des unités (EUR/DZD vers USD) et des formats de noms.
*   **Monitoring en Temps Réel** : Dashboard de santé du système et alertes de performance.
*   **Audit Trail** : Journalisation de toutes les tentatives d'accès et exécutions de requêtes.

---

## 7. Sécurité et RBAC
La sécurité est appliquée au niveau du médiateur (**avant** l'accès aux sources) :
*   **Masquage de colonnes** : Les colonnes sensibles (national_id, salary) sont supprimées de l'arbre de requête si le rôle n'a pas les droits.
*   **Rate Limiting** : Protection contre les attaques par force brute sur le login.
*   **JWT Hardening** : Signatures HS256 avec expiration stricte.

---

## 8. Guide de Démonstration

### Requête de fusion multi-sources
```sql
-- Récupère les noms, scores XML et compétences Graph pour les employés actifs
SELECT full_name, performance_score, skills
FROM GlobalEmployee
WHERE status = 'ACTIVE';
```

### Vérification de la résilience
1. Arrêtez un conteneur Docker (ex: `docker stop datamediator_postgres_hr`).
2. Relancez la requête.
3. Observez que le médiateur bascule automatiquement sur la source SQLite de secours pour assurer la continuité du service.

---
*Projet académique réalisé dans le cadre du Master Intégration de Données.*

