#!/usr/bin/env pwsh

# Script pour démarrer DataMediator Pro avec Docker
# Ce script utilise les bases de données PostgreSQL, MySQL et MongoDB réelles

Write-Host "🐳 Démarrage de DataMediator Pro avec Docker..." -ForegroundColor Green

# Vérification de Docker
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "✅ Docker trouvé: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Docker Desktop depuis https://docker.com" -ForegroundColor Red
    exit 1
}

# Vérification de Docker Compose
try {
    $composeVersion = docker-compose --version 2>$null
    Write-Host "✅ Docker Compose trouvé: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose n'est pas disponible" -ForegroundColor Red
    exit 1
}

# Arrêt des conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down 2>$null

# Démarrage des bases de données
Write-Host "🗄️ Démarrage des bases de données..." -ForegroundColor Yellow
docker-compose up -d postgres_hr mysql_projects mongo_finance

# Attendre que les bases de données soient prêtes
Write-Host "⏳ Attente du démarrage des bases de données..." -ForegroundColor Yellow

# PostgreSQL
Write-Host "   📊 PostgreSQL..." -ForegroundColor Cyan
do {
    Start-Sleep -Seconds 2
    $postgresReady = docker exec datamediator_postgres_hr pg_isready -U mediator_hr -d hr_db 2>$null
} while ($postgresReady -match "rejecting")
Write-Host "   ✅ PostgreSQL prêt" -ForegroundColor Green

# MySQL
Write-Host "   📈 MySQL..." -ForegroundColor Cyan
do {
    Start-Sleep -Seconds 2
    $mysqlReady = docker exec datamediator_mysql_projects mysqladmin ping -h localhost -uroot -proot_pwd 2>$null
} while ($mysqlReady -match "mysqld is alive")
Write-Host "   ✅ MySQL prêt" -ForegroundColor Green

# MongoDB
Write-Host "   💾 MongoDB..." -ForegroundColor Cyan
do {
    Start-Sleep -Seconds 2
    $mongoReady = docker exec datamediator_mongo_finance mongosh --eval "db.adminCommand('ping')" 2>$null
} while ($mongoReady -match "MongoServerError")
Write-Host "   ✅ MongoDB prêt" -ForegroundColor Green

# Configuration de l'environnement pour utiliser Docker
Write-Host "⚙️ Configuration de l'environnement..." -ForegroundColor Yellow
$env:USE_DOCKER = "true"

# Installation des dépendances Python si nécessaire
if (-not (Test-Path "venv")) {
    Write-Host "📦 Création de l'environnement virtuel..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "📦 Activation de l'environnement virtuel..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "📦 Installation des dépendances Python..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

# Installation des dépendances frontend si nécessaire
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install --silent
    Set-Location ..
}

# Démarrage des services d'administration
Write-Host "🔧 Démarrage des services d'administration..." -ForegroundColor Yellow
docker-compose up -d adminer mongo-express

# Démarrage de l'application
Write-Host "🚀 Démarrage de l'application..." -ForegroundColor Yellow

# Démarrage du backend en arrière-plan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:USE_DOCKER = "true"
    & .\venv\Scripts\Activate.ps1
    python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
}

# Démarrage du frontend en arrière-plan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

# Attendre que les services soient prêts
Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérification que les services sont bien démarrés
try {
    Invoke-WebRequest -Uri "http://localhost:5001/api/health" -TimeoutSec 5 | Out-Null
    Write-Host "✅ Backend démarré avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non disponible" -ForegroundColor Red
}

try {
    Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 | Out-Null
    Write-Host "✅ Frontend démarré avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non disponible" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 DataMediator Pro avec Docker est maintenant opérationnel !" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:5001" -ForegroundColor Cyan
Write-Host "📚 Documentation: http://localhost:5001/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🗄️ Administration des bases de données:" -ForegroundColor Yellow
Write-Host "   Adminer (PostgreSQL/MySQL): http://localhost:8080" -ForegroundColor White
Write-Host "   Mongo Express: http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Comptes de démonstration:" -ForegroundColor Yellow
Write-Host "   admin / admin123 (accès complet)" -ForegroundColor White
Write-Host "   hr / hr123" -ForegroundColor White
Write-Host "   project / project123" -ForegroundColor White
Write-Host "   finance / finance123" -ForegroundColor White
Write-Host "   viewer / viewer123" -ForegroundColor White
Write-Host ""
Write-Host "Pour arrêter les services, fermez cette fenêtre ou appuyez sur Ctrl+C" -ForegroundColor Gray

# Maintenir le script en cours d'exécution
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Nettoyage
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    Remove-Job -Job $backendJob -Force
    Remove-Job -Job $frontendJob -Force
    docker-compose down
    Write-Host "✅ Services arrêtés" -ForegroundColor Green
}
