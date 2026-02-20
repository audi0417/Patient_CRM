# ============================================================
# Patient CRM Update Script (Windows)
# ============================================================
#
# PowerShell script for zero-downtime updates
#
# Usage: .\bin\update.ps1
# ============================================================

#Requires -Version 5.1

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectRoot "backups"

# Timestamp for backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "pre_update_$timestamp"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Patient CRM On-Premise Update" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# ============================================================
# 1. Pre-Update Checks
# ============================================================

Write-Host "[1/8] Running pre-update checks..." -ForegroundColor Yellow
Write-Host ""

Set-Location $ProjectRoot

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "✗ Error: .env file not found" -ForegroundColor Red
    Write-Host "This doesn't appear to be an installed instance"
    exit 1
}

# Source environment variables
$envContent = Get-Content ".env" -Raw
$envVars = @{}
$envContent -split "`n" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Check if deployment mode is on-premise
if ($envVars["DEPLOYMENT_MODE"] -ne "on-premise") {
    Write-Host "✗ Error: DEPLOYMENT_MODE is not 'on-premise'" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "✗ Error: Docker daemon is not running" -ForegroundColor Red
    exit 1
}

# Check if services are running
$servicesRunning = docker compose -f docker-compose.onpremise.yml ps 2>$null | Select-String "Up"
if (-Not $servicesRunning) {
    Write-Host "⚠ Warning: Services don't appear to be running" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 1
    }
}

Write-Host "✓ Pre-update checks passed" -ForegroundColor Green
Write-Host ""

# ============================================================
# 2. Get Current Version
# ============================================================

Write-Host "[2/8] Detecting current version..." -ForegroundColor Yellow
Write-Host ""

$currentVersion = if ($envVars["APP_VERSION"]) { $envVars["APP_VERSION"] } else { "unknown" }
Write-Host "Current version: $currentVersion"

# Get version from running container if available
try {
    $containerVersion = docker compose -f docker-compose.onpremise.yml exec -T app node -e "console.log(require('./package.json').version)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $containerVersion) {
        $currentVersion = $containerVersion.Trim()
        Write-Host "Detected running version: $currentVersion"
    }
} catch {
    # Ignore errors
}

Write-Host ""

# ============================================================
# 3. Create Backup
# ============================================================

Write-Host "[3/8] Creating backup before update..." -ForegroundColor Yellow
Write-Host ""

# Run backup script
if (Test-Path "$ScriptDir\backup.ps1") {
    & "$ScriptDir\backup.ps1" $backupName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backup created: $backupName" -ForegroundColor Green
    } else {
        Write-Host "✗ Backup failed" -ForegroundColor Red
        $response = Read-Host "Continue without backup? (y/n)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            exit 1
        }
    }
} else {
    Write-Host "⚠ Warning: backup.ps1 not found, skipping backup" -ForegroundColor Yellow
    $response = Read-Host "Continue without backup? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 1
    }
}

Write-Host ""

# ============================================================
# 4. Pull New Images
# ============================================================

Write-Host "[4/8] Pulling new Docker images..." -ForegroundColor Yellow
Write-Host ""

docker compose -f docker-compose.onpremise.yml pull
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ New images pulled" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to pull new images" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# 5. Stop Application Service
# ============================================================

Write-Host "[5/8] Stopping application service..." -ForegroundColor Yellow
Write-Host ""

# Stop app but keep database running
docker compose -f docker-compose.onpremise.yml stop app nginx
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application stopped" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to stop application" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# 6. Run Database Migrations
# ============================================================

Write-Host "[6/8] Running database migrations..." -ForegroundColor Yellow
Write-Host ""

# Run migrations using the new image
docker compose -f docker-compose.onpremise.yml run --rm app node server/database/migrate.js up
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Rolling back..." -ForegroundColor Yellow
    & "$ScriptDir\rollback.ps1" $backupName
    exit 1
}

Write-Host ""

# ============================================================
# 7. Start Updated Services
# ============================================================

Write-Host "[7/8] Starting updated services..." -ForegroundColor Yellow
Write-Host ""

# Start all services with new images
docker compose -f docker-compose.onpremise.yml up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    Write-Host ""
    Write-Host "Rolling back..." -ForegroundColor Yellow
    & "$ScriptDir\rollback.ps1" $backupName
    exit 1
}

# Wait for application to be ready
Write-Host "Waiting for application to start..."
Start-Sleep -Seconds 10

Write-Host ""

# ============================================================
# 8. Verify Update
# ============================================================

Write-Host "[8/8] Verifying update..." -ForegroundColor Yellow
Write-Host ""

$maxRetries = 30
$retryCount = 0
$healthOk = $false

while ($retryCount -lt $maxRetries) {
    try {
        $port = if ($envVars["PORT"]) { $envVars["PORT"] } else { "3001" }
        $response = Invoke-WebRequest -Uri "http://localhost:$port/api/health-check" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Application is responding" -ForegroundColor Green
            $healthOk = $true
            break
        }
    } catch {
        # Continue waiting
    }

    $retryCount++
    if ($retryCount -eq $maxRetries) {
        Write-Host "✗ Application health check failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Rolling back..." -ForegroundColor Yellow
        & "$ScriptDir\rollback.ps1" $backupName
        exit 1
    }

    Write-Host "Waiting for application... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

# Get new version
$newVersion = "unknown"
try {
    $newVersion = docker compose -f docker-compose.onpremise.yml exec -T app node -e "console.log(require('./package.json').version)" 2>$null
    if ($newVersion) {
        $newVersion = $newVersion.Trim()
    }
} catch {
    # Ignore errors
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Update Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Version Information:" -ForegroundColor Blue
Write-Host "  Previous version: $currentVersion"
Write-Host "  Current version:  $newVersion"
Write-Host ""

Write-Host "Backup Information:" -ForegroundColor Blue
Write-Host "  Backup name: $backupName"
Write-Host "  Location: $BackupDir\$backupName"
Write-Host ""
Write-Host "  To rollback: .\bin\rollback.ps1 $backupName"
Write-Host ""

Write-Host "⚠️  Post-Update Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Test critical functionality"
Write-Host "2. Verify user access and permissions"
Write-Host "3. Check integration with external systems"
Write-Host "4. Review application logs for errors"
Write-Host "5. Monitor performance metrics"
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host ""
Write-Host "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
Write-Host "  Rollback:     .\bin\rollback.ps1 $backupName"
Write-Host "  Status:       docker compose -f docker-compose.onpremise.yml ps"
Write-Host ""

Write-Host "Update completed successfully!" -ForegroundColor Green
Write-Host ""

# Clean up old backups (keep last 5)
Write-Host "Cleaning up old backups..."
$allBackups = @()
$allBackups += Get-ChildItem $BackupDir -Directory
$allBackups += Get-ChildItem $BackupDir -Filter "*.zip"
$allBackups = $allBackups | Sort-Object CreationTime -Descending

if ($allBackups.Count -gt 5) {
    $allBackups | Select-Object -Skip 5 | Remove-Item -Recurse -Force
    Write-Host "✓ Old backups cleaned up (keeping last 5)" -ForegroundColor Green
}

Write-Host ""
