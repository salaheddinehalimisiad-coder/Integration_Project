# ============================================================
# DataMediator Pro - Lancement complet (backend + frontend)
# Version robuste : verifie l'import Python, teste le port,
# diagnostique les erreurs au lieu de les masquer.
# ============================================================
$ErrorActionPreference = "Continue"


function Section($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Info($t)    { Write-Host "    $t" -ForegroundColor Gray }
function Ok($t)      { Write-Host "    [OK] $t" -ForegroundColor Green }
function Warn($t)    { Write-Host "    [!] $t"  -ForegroundColor Yellow }
function Err($t)     { Write-Host "    [X] $t"  -ForegroundColor Red }

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DataMediator Pro - Plateforme de mediation GAV/LAV" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ----- Mode SQLite vs Docker -----
Section "Mode de base de donnees"
$docker = Read-Host "Activer le mode Docker (PostgreSQL/MySQL/Mongo reels) ? (O/N) [Defaut N]"
if ($docker -match "^(O|o|Y|y)$") {
    $env:USE_DOCKER = "True"
    Ok "Mode Docker active"
} else {
    $env:USE_DOCKER = "False"
    Warn "Mode SQLite local active (par defaut)"
}

# ----- Pre-requis -----
Section "Pre-requis"
try { python --version | Out-Null; Ok "Python detecte" } catch { Err "Python introuvable"; exit 1 }
try { node --version   | Out-Null; Ok "Node.js detecte" } catch { Err "Node.js introuvable"; exit 1 }
try { npm --version    | Out-Null; Ok "npm detecte"     } catch { Err "npm introuvable"; exit 1 }

# ----- Dependances Python -----
Section "Dependances Python"
python -c "import fastapi, uvicorn, pydantic_settings, jwt, bcrypt, sqlglot" 2>$null
if ($LASTEXITCODE -ne 0) {
    Info "Installation des paquets manquants..."
    python -m pip install -q -r "$ROOT\requirements.txt"
    if ($LASTEXITCODE -ne 0) { Err "Echec installation Python"; exit 1 }
    Ok "Paquets installes"
} else {
    Ok "Paquets deja presents"
}

# ----- Dependances frontend -----
Section "Dependances frontend"
if (-not (Test-Path "$ROOT\frontend\node_modules")) {
    Info "Installation de node_modules (1-2 minutes)..."
    Push-Location "$ROOT\frontend"
    npm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; Err "Echec npm install"; exit 1 }
    Pop-Location
    Ok "node_modules installe"
} else {
    Ok "node_modules deja present"
}

# ----- Liberation des ports -----
Section "Liberation des ports 5001 et 3000"
foreach ($port in 5001, 3000) {
    $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($p in $procs) {
        try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Info "PID $p libere du port $port" } catch {}
    }
}

# ----- Sources heterogenes -----
Section "Sources heterogenes (S1..S6)"
python "$ROOT\sources\setup_enterprise_sources.py"
if ($LASTEXITCODE -ne 0) { Err "Echec generation sources"; exit 1 }

# ----- VALIDATION : main.py s'importe sans erreur ? -----
Section "Validation du backend (import main.py)"
Push-Location $ROOT
python -c "import main; print('Endpoints:', len([r for r in main.app.routes if hasattr(r, 'path')]))" 2>&1
$ok = ($LASTEXITCODE -eq 0)
Pop-Location
if (-not $ok) {
    Err "main.py ne s'importe pas correctement. Corrige l'erreur ci-dessus avant de relancer."
    Write-Host ""
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
Ok "main.py s'importe sans erreur"

# ----- Lancement backend -----
Section "Demarrage backend (FastAPI :5001)"
$envDocker = $env:USE_DOCKER
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; `$env:USE_DOCKER='$envDocker'; Write-Host '=== Backend DataMediator Pro ===' -ForegroundColor Cyan; python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload"
Info "Patientez 5 secondes le temps qu'uvicorn demarre..."
Start-Sleep -Seconds 5

# ----- VALIDATION : backend repond ? -----
Section "Test de connectivite backend"
$maxRetries = 6
$backendOk = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5001/api/version" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $backendOk = $true
            $json = $r.Content | ConvertFrom-Json
            Ok "Backend operationnel - v$($json.version), API $($json.api_version)"
            break
        }
    } catch {
        if ($i -lt $maxRetries) {
            Info "Tentative $i/$maxRetries - patience..."
            Start-Sleep -Seconds 2
        }
    }
}
if (-not $backendOk) {
    Err "Backend ne repond pas sur http://localhost:5001"
    Err "Regarde la fenetre PowerShell du backend pour voir l'erreur Python."
    Warn "Le frontend sera quand meme lance, mais le login echouera."
}

# ----- Lancement frontend -----
Section "Demarrage frontend (Vite :3000)"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; Write-Host '=== Frontend DataMediator Pro ===' -ForegroundColor Cyan; npm run dev"

# ----- Recapitulatif -----
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DataMediator Pro lance !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend (UI)         http://localhost:3000" -ForegroundColor White
Write-Host "  API REST              http://localhost:5001" -ForegroundColor White
Write-Host "  Swagger documentation http://localhost:5001/docs" -ForegroundColor White
Write-Host "  Version + capabilites http://localhost:5001/api/version" -ForegroundColor White
Write-Host ""
Write-Host "  Comptes de demonstration :" -ForegroundColor Yellow
Write-Host "    admin    / admin123     (ADMIN)" -ForegroundColor White
Write-Host "    hr       / hr123        (HR_MANAGER)" -ForegroundColor White
Write-Host "    project  / project123   (PROJECT_MANAGER)" -ForegroundColor White
Write-Host "    finance  / finance123   (FINANCE_OFFICER)" -ForegroundColor White
Write-Host "    viewer   / viewer123    (EMPLOYEE_VIEWER)" -ForegroundColor White
Write-Host ""
Write-Host "  Astuces :" -ForegroundColor Yellow
Write-Host "    Ctrl+K            Command palette" -ForegroundColor Gray
Write-Host "    Ctrl+Entree       Executer la requete SQL dans la console" -ForegroundColor Gray
Write-Host ""
if (-not $backendOk) {
    Write-Host "  ATTENTION : le backend n'a pas repondu - verifie sa fenetre PowerShell." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Appuie sur Entree pour fermer cette fenetre (les serveurs continuent)"
