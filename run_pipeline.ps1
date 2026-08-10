# ============================================
# GLOBAL CAMERA MAP - FULL AUTOMATED RUNNER
# ============================================

$PROJECT_DIR = "C:\Users\bs806\OneDrive\Desktop\GlobalCameraMap"

$BACKEND_DIR = Join-Path $PROJECT_DIR "backend"
$PIPELINE_DIR = Join-Path $PROJECT_DIR "data_pipeline"
$WEB_DIR = Join-Path $PROJECT_DIR "web"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GLOBAL CAMERA MAP AUTOMATED SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# STEP 1: START DATABASE
# ============================================

Write-Host "Step 1: Starting PostgreSQL + PostGIS..." -ForegroundColor Yellow

Set-Location $PROJECT_DIR

docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start PostgreSQL + PostGIS." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Database container started successfully." -ForegroundColor Green


# ============================================
# STEP 2: CHECK DATABASE
# ============================================

Write-Host ""
Write-Host "Step 2: Checking database connection..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0
$dbReady = $false

while ($attempt -lt $maxAttempts) {

    $attempt++

    docker exec global_camera_db pg_isready -U camera_admin -d global_camera 2>$null

    if ($LASTEXITCODE -eq 0) {
        $dbReady = $true
        break
    }

    Write-Host "Waiting for database... Attempt $attempt/$maxAttempts"
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host ""
    Write-Host "ERROR: Database is not ready." -ForegroundColor Red
    exit 1
}

Write-Host "Database is ready." -ForegroundColor Green


# ============================================
# STEP 3: RUN DATA PIPELINE
# ============================================

Write-Host ""
Write-Host "Step 3: Running camera data pipeline..." -ForegroundColor Yellow

Set-Location $PIPELINE_DIR

python pipeline.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Pipeline failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pipeline completed successfully." -ForegroundColor Green


# ============================================
# STEP 4: CHECK CAMERA COUNT
# ============================================

Write-Host ""
Write-Host "Step 4: Checking database camera count..." -ForegroundColor Yellow

docker exec global_camera_db psql `
    -U camera_admin `
    -d global_camera `
    -c "SELECT COUNT(*) AS count FROM cameras;"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Could not check camera count." -ForegroundColor Yellow
}


# ============================================
# STEP 5: CHECK DATA SOURCES
# ============================================

Write-Host ""
Write-Host "Step 5: Checking configured data sources..." -ForegroundColor Yellow

Set-Location $PIPELINE_DIR

python sources.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Could not load data sources." -ForegroundColor Yellow
}


# ============================================
# STEP 6: START FASTAPI BACKEND
# ============================================

Write-Host ""
Write-Host "Step 6: Starting FastAPI backend..." -ForegroundColor Yellow

if (-not (Test-Path $BACKEND_DIR)) {
    Write-Host ""
    Write-Host "ERROR: Backend folder not found:" -ForegroundColor Red
    Write-Host $BACKEND_DIR
    exit 1
}

Set-Location $BACKEND_DIR

Write-Host "Backend directory:"
Write-Host $BACKEND_DIR

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "Set-Location '$BACKEND_DIR'; & '$PROJECT_DIR\.venv\Scripts\Activate.ps1'; uvicorn main:app --reload"

Write-Host "FastAPI backend starting..." -ForegroundColor Green


# ============================================
# STEP 7: START REACT FRONTEND
# ============================================

Write-Host ""
Write-Host "Step 7: Starting React + Vite frontend..." -ForegroundColor Yellow

if (-not (Test-Path $WEB_DIR)) {
    Write-Host ""
    Write-Host "ERROR: Web folder not found:" -ForegroundColor Red
    Write-Host $WEB_DIR
    exit 1
}

Set-Location $WEB_DIR

Write-Host "Frontend directory:"
Write-Host $WEB_DIR

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "Set-Location '$WEB_DIR'; npm run dev"

Write-Host "React frontend starting..." -ForegroundColor Green


# ============================================
# FINAL MESSAGE
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GLOBAL CAMERA MAP SYSTEM STARTED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Database: PostgreSQL + PostGIS" -ForegroundColor Green
Write-Host "Pipeline: Python" -ForegroundColor Green
Write-Host "API: FastAPI" -ForegroundColor Green
Write-Host "Frontend: React + Vite" -ForegroundColor Green

Write-Host ""
Write-Host "FastAPI:" -ForegroundColor Yellow
Write-Host "http://127.0.0.1:8000"

Write-Host ""
Write-Host "FastAPI Swagger:" -ForegroundColor Yellow
Write-Host "http://127.0.0.1:8000/docs"

Write-Host ""
Write-Host "React:" -ForegroundColor Yellow
Write-Host "http://localhost:5173"

Write-Host ""
Write-Host "========================================"
Write-Host " SYSTEM READY"
Write-Host "========================================"
Write-Host ""