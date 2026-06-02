#!/usr/bin/env pwsh

# Script de démarrage pour DataMediator Pro
# Ce script démarre tous les services nécessaires

Write-Host "🚀 Démarrage de DataMediator Pro..." -ForegroundColor Green

# Vérification de Python
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✅ Python trouvé: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérification de Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Installation des dépendances Python si nécessaire
if (-not (Test-Path "venv")) {
    Write-Host "📦 Création de l'environnement virtuel..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "📦 Activation de l'environnement virtuel..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "📦 Installation des dépendances Python..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

# Installation des dépendances Node.js si nécessaire
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install --silent
    Set-Location ..
}

# Initialisation des sources de données
Write-Host "🗄️ Initialisation des sources de données..." -ForegroundColor Yellow
python sources\setup_enterprise_sources.py

# Démarrage des services
Write-Host "🌐 Démarrage des services..." -ForegroundColor Yellow

# Démarrage du backend en arrière-plan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
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
Write-Host "🎉 DataMediator Pro est maintenant opérationnel !" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:5001" -ForegroundColor Cyan
Write-Host "📚 Documentation: http://localhost:5001/docs" -ForegroundColor Cyan
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
    # Nettoyage des jobs en arrière-plan
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    Remove-Job -Job $backendJob -Force
    Remove-Job -Job $frontendJob -Force
    Write-Host "✅ Services arrêtés" -ForegroundColor Green
}
