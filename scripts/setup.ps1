#!/usr/bin/env pwsh

# Script de configuration initial pour DataMediator Pro
# Ce script configure l'environnement de développement

Write-Host "🔧 Configuration de DataMediator Pro..." -ForegroundColor Green

# Vérification des prérequis
Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Yellow

# Python
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer Python 3.10+ depuis https://python.org" -ForegroundColor Red
    exit 1
}

# Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js 18+ depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Git
try {
    $gitVersion = git --version 2>$null
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git n'est pas installé (optionnel)" -ForegroundColor Yellow
}

# Création de l'environnement virtuel Python
if (-not (Test-Path "venv")) {
    Write-Host "📦 Création de l'environnement virtuel Python..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la création de l'environnement virtuel" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Environnement virtuel créé" -ForegroundColor Green
} else {
    Write-Host "✅ Environnement virtuel déjà existant" -ForegroundColor Green
}

# Activation de l'environnement virtuel
Write-Host "🔄 Activation de l'environnement virtuel..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Mise à jour de pip
Write-Host "⬆️ Mise à jour de pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Installation des dépendances Python
Write-Host "📦 Installation des dépendances Python..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances Python" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépendances Python installées" -ForegroundColor Green

# Installation des dépendances frontend
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances frontend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dépendances frontend installées" -ForegroundColor Green
} else {
    Write-Host "✅ Dépendances frontend déjà installées" -ForegroundColor Green
}

# Création des répertoires nécessaires
Write-Host "📁 Création des répertoires..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path logs | Out-Null
New-Item -ItemType Directory -Force -Path data | Out-Null
Write-Host "✅ Répertoires créés" -ForegroundColor Green

# Configuration de l'environnement
if (-not (Test-Path ".env")) {
    Write-Host "⚙️ Création du fichier .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Fichier .env créé" -ForegroundColor Green
    Write-Host "📝 Vous pouvez modifier le fichier .env pour personnaliser la configuration" -ForegroundColor Cyan
} else {
    Write-Host "✅ Fichier .env déjà existant" -ForegroundColor Green
}

# Initialisation des sources de données
Write-Host "🗄️ Initialisation des sources de données..." -ForegroundColor Yellow
python sources\setup_enterprise_sources.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'initialisation des sources de données" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Sources de données initialisées" -ForegroundColor Green

# Configuration de Git (si disponible)
if (Get-Command git -ErrorAction SilentlyContinue) {
    if (-not (Test-Path ".git")) {
        Write-Host "🔧 Initialisation du dépôt Git..." -ForegroundColor Yellow
        git init
        git add .
        git commit -m "Initial commit - DataMediator Pro setup"
        Write-Host "✅ Dépôt Git initialisé" -ForegroundColor Green
    } else {
        Write-Host "✅ Dépôt Git déjà initialisé" -ForegroundColor Green
    }
}

# Test des tests
Write-Host "🧪 Exécution des tests..." -ForegroundColor Yellow
python -m unittest discover -s tests
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tous les tests passent" -ForegroundColor Green
} else {
    Write-Host "⚠️ Certains tests ont échoué" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Configuration terminée avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Exécutez .\scripts\start.ps1 pour démarrer les services" -ForegroundColor White
Write-Host "   2. Ouvrez http://localhost:3000 dans votre navigateur" -ForegroundColor White
Write-Host "   3. Connectez-vous avec admin/admin123" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation disponible dans le dossier docs/" -ForegroundColor Gray
Write-Host "🔧 Pour la configuration avancée, éditez le fichier .env" -ForegroundColor Gray
