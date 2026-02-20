# ============================================================
# Patient CRM Rollback Script (Windows)
# ============================================================
#
# PowerShell script for rolling back failed updates
#
# Usage: .\bin\rollback.ps1 <backup_name>
# ============================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupName
)

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectRoot "backups"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Patient CRM On-Premise Rollback" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# ============================================================
# 1. Parse Arguments and Validate
# ============================================================

if (-Not $BackupName) {
    Write-Host "Usage: .\bin\rollback.ps1 <backup_name>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available backups:"
    if (Test-Path $BackupDir) {
        $backups = Get-ChildItem $BackupDir -Directory | Where-Object { $_.Name -notmatch '\.zip$' }
        if ($backups) {
            $backups | ForEach-Object { Write-Host "  $($_.Name)" }
        } else {
            Write-Host "  (none)"
        }
    } else {
        Write-Host "  (none - backup directory doesn't exist)"
    }
    exit 1
}

# Check if backup exists
$BackupPath = Join-Path $BackupDir $BackupName

if (-Not (Test-Path $BackupPath)) {
    Write-Host "✗ Error: Backup not found: $BackupPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available backups:"
    $backups = Get-ChildItem $BackupDir -Directory | Where-Object { $_.Name -notmatch '\.zip$' }
    if ($backups) {
        $backups | ForEach-Object { Write-Host "  $($_.Name)" }
    } else {
        Write-Host "  (none)"
    }
    exit 1
}

Write-Host "Using backup: $BackupName"
Write-Host "Path: $BackupPath"
Write-Host ""

# Confirmation
Write-Host "⚠️  WARNING: This will restore the system to a previous state" -ForegroundColor Yellow
Write-Host "This operation will:"
Write-Host "  1. Stop all services"
Write-Host "  2. Restore database from backup"
Write-Host "  3. Restore configuration files"
Write-Host "  4. Restart services"
Write-Host ""
$response = Read-Host "Are you sure you want to proceed? (yes/no)"
if ($response -ne "yes") {
    Write-Host "Rollback cancelled"
    exit 0
}
Write-Host ""

# ============================================================
# 2. Pre-Rollback Checks
# ============================================================

Write-Host "[1/6] Running pre-rollback checks..." -ForegroundColor Yellow
Write-Host ""

Set-Location $ProjectRoot

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "✗ Error: .env file not found" -ForegroundColor Red
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

# Check Docker
try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "✗ Error: Docker daemon is not running" -ForegroundColor Red
    exit 1
}

# Verify backup integrity
if (-Not (Test-Path (Join-Path $BackupPath "database.sql"))) {
    Write-Host "✗ Error: Database backup not found in $BackupName" -ForegroundColor Red
    exit 1
}

if (Test-Path (Join-Path $BackupPath "metadata.txt")) {
    Write-Host "Backup metadata:"
    Get-Content (Join-Path $BackupPath "metadata.txt")
    Write-Host ""
} else {
    Write-Host "⚠ Warning: Backup metadata not found" -ForegroundColor Yellow
}

Write-Host "✓ Pre-rollback checks passed" -ForegroundColor Green
Write-Host ""

# ============================================================
# 3. Stop Services
# ============================================================

Write-Host "[2/6] Stopping services..." -ForegroundColor Yellow
Write-Host ""

docker compose -f docker-compose.onpremise.yml stop
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services stopped" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: Failed to stop services gracefully" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 4. Restore Database
# ============================================================

Write-Host "[3/6] Restoring database..." -ForegroundColor Yellow
Write-Host ""

# Start only database service
docker compose -f docker-compose.onpremise.yml up -d db

# Wait for database
Write-Host "Waiting for database to be ready..."
Start-Sleep -Seconds 5

$maxRetries = 30
$retryCount = 0
$dbReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $dbUser = if ($envVars["DATABASE_USER"]) { $envVars["DATABASE_USER"] } else { "postgres" }
        docker compose -f docker-compose.onpremise.yml exec -T db pg_isready -U $dbUser | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database is ready" -ForegroundColor Green
            $dbReady = $true
            break
        }
    } catch {
        # Continue waiting
    }

    $retryCount++
    if ($retryCount -eq $maxRetries) {
        Write-Host "✗ Database failed to start" -ForegroundColor Red
        exit 1
    }

    Start-Sleep -Seconds 2
}

# Drop and recreate database
$dbName = if ($envVars["DATABASE_NAME"]) { $envVars["DATABASE_NAME"] } else { "patient_crm" }
$dbUser = if ($envVars["DATABASE_USER"]) { $envVars["DATABASE_USER"] } else { "postgres" }

Write-Host "Recreating database..."
$dropCreateSQL = @"
DROP DATABASE IF EXISTS $dbName;
CREATE DATABASE $dbName;
"@
$dropCreateSQL | docker compose -f docker-compose.onpremise.yml exec -T db psql -U $dbUser

# Restore database from backup
Write-Host "Restoring database from backup..."
Get-Content (Join-Path $BackupPath "database.sql") | docker compose -f docker-compose.onpremise.yml exec -T db psql -U $dbUser -d $dbName
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database restored" -ForegroundColor Green
} else {
    Write-Host "✗ Database restoration failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# 5. Restore Configuration
# ============================================================

Write-Host "[4/6] Restoring configuration..." -ForegroundColor Yellow
Write-Host ""

# Restore .env if backed up
if (Test-Path (Join-Path $BackupPath ".env")) {
    Copy-Item (Join-Path $BackupPath ".env") ".env" -Force
    Write-Host "✓ .env restored" -ForegroundColor Green
} else {
    Write-Host "⚠ .env not in backup, keeping current" -ForegroundColor Yellow
}

# Restore uploaded files if backed up
if (Test-Path (Join-Path $BackupPath "uploads")) {
    if (Test-Path "uploads") {
        Remove-Item "uploads" -Recurse -Force
    }
    Copy-Item (Join-Path $BackupPath "uploads") "uploads" -Recurse
    Write-Host "✓ Uploaded files restored" -ForegroundColor Green
} else {
    Write-Host "⚠ Uploaded files not in backup" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 6. Start Services
# ============================================================

Write-Host "[5/6] Starting services..." -ForegroundColor Yellow
Write-Host ""

# Reload environment
$envContent = Get-Content ".env" -Raw
$envVars = @{}
$envContent -split "`n" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Start all services
docker compose -f docker-compose.onpremise.yml up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait for application
Write-Host "Waiting for application to start..."
Start-Sleep -Seconds 10

Write-Host ""

# ============================================================
# 7. Verify Rollback
# ============================================================

Write-Host "[6/6] Verifying rollback..." -ForegroundColor Yellow
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
        Write-Host "Check logs with: docker compose -f docker-compose.onpremise.yml logs"
        exit 1
    }

    Write-Host "Waiting for application... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Rollback Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$httpPort = if ($envVars["HTTP_PORT"]) { $envVars["HTTP_PORT"] } else { "80" }

Write-Host "System Information:" -ForegroundColor Blue
Write-Host "  Restored from: $BackupName"
if ($httpPort -eq "80") {
    Write-Host "  Application URL: http://localhost"
} else {
    Write-Host "  Application URL: http://localhost:$httpPort"
}
Write-Host ""

Write-Host "⚠️  Post-Rollback Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verify system functionality"
Write-Host "2. Check user access"
Write-Host "3. Review logs for any errors"
Write-Host "4. Notify users of the rollback"
Write-Host "5. Investigate root cause of update failure"
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host ""
Write-Host "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
Write-Host "  Status:       docker compose -f docker-compose.onpremise.yml ps"
Write-Host ""

Write-Host "Rollback completed successfully!" -ForegroundColor Green
Write-Host ""
