# ============================================================
# DataMediator Pro - Script de Teardown et Nettoyage complet
# Auteur: Senior DevOps Engineer
# Version: 1.0.0
# ============================================================
$ErrorActionPreference = "Continue"

function Section($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Info($t)    { Write-Host "    $t" -ForegroundColor Gray }
# Standard color wrappers for PowerShell
function Ok($t)      { Write-Host "    [OK] $t" -ForegroundColor Green }
function Warn($t)    { Write-Host "    [!] $t"  -ForegroundColor Yellow }
function Err($t)     { Write-Host "    [X] $t"  -ForegroundColor Red }

$ROOT = Resolve-Path "$PSScriptRoot\.."

Write-Host ""
Write-Host "============================================================" -ForegroundColor Red
Write-Host "  DataMediator Pro - Purge et Nettoyage de l'Environnement" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

# 1. Docker compose down with volumes
Section "1. Arret de l'infrastructure Docker"
try {
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        Info "Execution de docker compose down --volumes..."
        Push-Location $ROOT
        docker compose down -v --remove-orphans 2>&1 | Out-Null
        Pop-Location
        Ok "Conteneurs Docker arretes, reseaux et volumes orphelins purges."
    } else {
        Warn "Docker n'est pas installe ou n'est pas dans le PATH. Etape ignoree."
    }
} catch {
    Err "Erreur lors de l'arret de Docker Compose : $_"
}

# 2. Liberation des ports
Section "2. Liberation des ports reseau (5001 et 3000)"
foreach ($port in 5001, 3000) {
    $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($procs) {
        foreach ($p in $procs) {
            try { 
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Info "PID $p libere du port $port" 
            } catch {}
        }
        Ok "Port $port nettoye."
    } else {
        Info "Port $port deja libre."
    }
}

# 3. Purge des bases de donnees SQLite locales et des fichiers transitoires
Section "3. Nettoyage des donnees locales et caches"
$dataDir = Join-Path $ROOT "data"
if (Test-Path $dataDir) {
    Info "Suppression des bases de donnees SQLite et des CSV dans data/..."
    Get-ChildItem -Path $dataDir -Include *.db, *.db-journal, *.sqlite, *.sqlite3, *.csv, *.json -File -Recurse | ForEach-Object {
        try {
            Remove-Item $_.FullName -Force -ErrorAction Stop
            Info "Supprime : $($_.Name)"
        } catch {
            Warn "Impossible de supprimer $($_.Name) (fichier peut-etre verrouille)"
        }
    }
    Ok "Dossier de donnees nettoye."
}

# 4. Suppression des caches de developpement (Python, Pytest)
Section "4. Purge des dossiers de cache (__pycache__, .pytest_cache)"
$cacheDirs = @()
$cacheDirs += Get-ChildItem -Path $ROOT -Directory -Filter "__pycache__" -Recurse
$cacheDirs += Get-ChildItem -Path $ROOT -Directory -Filter ".pytest_cache" -Recurse
$cacheDirs += Get-ChildItem -Path (Join-Path $ROOT "frontend") -Directory -Filter ".vite" -Recurse -ErrorAction SilentlyContinue

if ($cacheDirs.Count -gt 0) {
    $cacheDirs | ForEach-Object {
        try {
            Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
            Info "Purge : $($_.FullName)"
        } catch {
            Warn "Impossible de purger : $($_.FullName)"
        }
    }
    Ok "Tous les caches de developpement ont ete supprimes."
} else {
    Info "Aucun dossier de cache detecte."
}

# 5. Nettoyage des logs
Section "5. Suppression des journaux d'audit et de logs"
$logDir = Join-Path $ROOT "logs"
if (Test-Path $logDir) {
    try {
        Remove-Item $logDir -Recurse -Force -ErrorAction Stop
        Ok "Repertoire logs/ supprime."
    } catch {
        Warn "Impossible de supprimer logs/ : $_"
    }
} else {
    Info "Aucun fichier log a nettoyer."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Environnement de test DataMediator Pro 100% vierge !" -ForegroundColor Green
Write-Host "  Relancez .\start.ps1 pour reinitialiser les sources." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
