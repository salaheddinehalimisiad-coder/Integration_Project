# Guide d'Installation de DataMediator Pro ⚙️

Ce guide explique les prérequis techniques, les étapes d'installation et de lancement de la plateforme **DataMediator Pro** en mode local (SQLite émulé) ou en mode de production (Bases réelles sous Docker).

---

## 📋 Prérequis Techniques

Avant de démarrer, assurez-vous d'avoir installé les composants suivants sur votre machine :

1.  **Python 3.10+** (Ajouté au PATH système)
2.  **Node.js 18+** & **npm** (Pour exécuter le frontend React)
3.  **Docker Desktop** (Obligatoire uniquement pour le mode de production)
4.  **PowerShell 5.1+** (Pour Windows) ou un terminal Bash (Pour macOS/Linux)

---

## 🚀 Option A : Lancement Local Rapide (SQLite Émulé)

Ce mode est idéal pour tester et valider l'application sans lancer de conteneurs Docker lourds. Les sources SQL, NoSQL et XML sont simulées via des bases SQLite légères locales.

### Script automatique (Windows uniquement) :
1.  Ouvrez une console PowerShell.
2.  Lancez le script racine :
    ```powershell
    .\start.ps1
    ```
    *Le script installe automatiquement les dépendances Python manquantes, effectue un `npm install` dans le dossier frontend, libère les ports 3000 et 5001 s'ils sont occupés, initialise les données SQLite locales et démarre le backend et le frontend.*

### Lancement manuel (Toutes plateformes) :
1.  **Installer les dépendances Python** :
    ```bash
    pip install -r requirements.txt
    ```
2.  **Générer les sources de données locales** :
    ```bash
    python sources/setup_enterprise_sources.py
    ```
3.  **Démarrer le serveur API FastAPI (Backend)** :
    ```bash
    python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
    ```
4.  **Installer et démarrer le Frontend React (Vite)** :
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *Le frontend démarre sur `http://localhost:3000`.*

---

## 🐳 Option B : Mode Production (Bases Réelles dans Docker)

Ce mode utilise de vrais serveurs de bases de données (PostgreSQL 16, MySQL 8.4 et MongoDB 7) pour refléter fidèlement une architecture d'intégration de données en entreprise.

1.  **Démarrer les conteneurs de bases de données et d'administration** :
    ```bash
    docker compose up -d
    ```
    *Cela démarre :*
    *   *PostgreSQL (Port 5433)*
    *   *MySQL (Port 3307)*
    *   *MongoDB (Port 27018)*
    *   *Adminer (Port 8080)*
    *   *Mongo Express (Port 8081)*

2.  **Activer le mode Docker** :
    *   Sur **Windows (PowerShell)** :
        ```powershell
        $env:USE_DOCKER = "True"
        ```
    *   Sur **Linux / macOS (Bash)** :
        ```bash
        export USE_DOCKER="True"
        ```

3.  **Injecter les données de démonstration dans les conteneurs** :
    ```bash
    python sources/setup_enterprise_sources.py
    ```
    *Ce script va détecter la présence de la variable `USE_DOCKER=True` et se connecter directement aux conteneurs PostgreSQL, MySQL et MongoDB pour y injecter les tables et les documents.*

4.  **Démarrer le backend FastAPI** :
    ```bash
    python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
    ```

5.  **Démarrer le frontend** :
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 🧹 Nettoyage de l'environnement (Teardown)

Pour réinitialiser complètement votre environnement, vider les caches de tests et purger les volumes de bases de données Docker existants, utilisez le script de nettoyage prévu à cet effet :

```powershell
.\scripts\clean.ps1
```
Ce script :
*   Arrête les conteneurs Docker et supprime les volumes associés (efface les données Postgres/MySQL/Mongo).
*   Libère les ports 3000 et 5001 s'ils sont bloqués par un processus fantôme.
*   Purge les caches de développement (`__pycache__`, `.pytest_cache`, caches Vite).
*   Efface les bases SQLite locales générées dans le répertoire `data/`.

---

## 🛠️ Résolution des problèmes courants

### 1. Conflit de port (Port 5001 ou 3000 déjà utilisé)
Si vous obtenez une erreur indiquant qu'un port est déjà alloué, utilisez `.\scripts\clean.ps1` ou fermez manuellement les processus. Sur Windows, vous pouvez lister le processus bloquant avec :
```powershell
Get-NetTCPConnection -LocalPort 5001
```

### 2. Module Python introuvable (ModuleNotFoundError)
Si FastAPI ou SQLGlot n'est pas reconnu lors du lancement du backend, assurez-vous d'ajouter le répertoire racine au chemin de recherche Python avant d'exécuter pytest ou uvicorn :
*   Sur Windows (PowerShell) :
    ```powershell
    $env:PYTHONPATH = "."
    ```
*   Sur Linux/macOS :
    ```bash
    export PYTHONPATH="."
    ```
