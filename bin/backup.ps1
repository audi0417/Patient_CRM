# ============================================================
# Patient CRM Backup Script (Windows)
# ============================================================
#
# PowerShell script for creating backups
#
# Usage: .\bin\backup.ps1 [backup_name]
# ============================================================

#Requires -Version 5.1

param(
    [string]$BackupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectRoot "backups"
$BackupPath = Join-Path $BackupDir $BackupName

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Patient CRM On-Premise Backup" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# ============================================================
# 1. Pre-Backup Checks
# ============================================================

Write-Host "[1/6] Running pre-backup checks..." -ForegroundColor Yellow
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

# Check if database service is running
$dbStatus = docker compose -f docker-compose.onpremise.yml ps 2>$null | Select-String "db.*Up"
if (-Not $dbStatus) {
    Write-Host "✗ Error: Database service is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Pre-backup checks passed" -ForegroundColor Green
Write-Host ""

# ============================================================
# 2. Create Backup Directory
# ============================================================

Write-Host "[2/6] Creating backup directory..." -ForegroundColor Yellow
Write-Host ""

# Create backup directory structure
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

Write-Host "Backup location: $BackupPath"
Write-Host "✓ Backup directory created" -ForegroundColor Green
Write-Host ""

# ============================================================
# 3. Backup Database
# ============================================================

Write-Host "[3/6] Backing up database..." -ForegroundColor Yellow
Write-Host ""

$dbUser = if ($envVars["DATABASE_USER"]) { $envVars["DATABASE_USER"] } else { "postgres" }
$dbName = if ($envVars["DATABASE_NAME"]) { $envVars["DATABASE_NAME"] } else { "patient_crm" }

# Dump PostgreSQL database
$dbDumpPath = Join-Path $BackupPath "database.sql"
docker compose -f docker-compose.onpremise.yml exec -T db pg_dump -U $dbUser -d $dbName --clean --if-exists | Out-File -FilePath $dbDumpPath -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    $dbSize = (Get-Item $dbDumpPath).Length / 1MB
    Write-Host "✓ Database backed up ($([math]::Round($dbSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ Database backup failed" -ForegroundColor Red
    Remove-Item -Path $BackupPath -Recurse -Force
    exit 1
}

Write-Host ""

# ============================================================
# 4. Backup Configuration
# ============================================================

Write-Host "[4/6] Backing up configuration..." -ForegroundColor Yellow
Write-Host ""

# Backup .env file
Copy-Item ".env" (Join-Path $BackupPath ".env")
Write-Host "✓ .env backed up" -ForegroundColor Green

# Backup docker-compose files
if (Test-Path "docker-compose.onpremise.yml") {
    Copy-Item "docker-compose.onpremise.yml" (Join-Path $BackupPath "docker-compose.onpremise.yml")
    Write-Host "✓ docker-compose.onpremise.yml backed up" -ForegroundColor Green
}

# Backup nginx config if exists
if (Test-Path "config\nginx.conf") {
    New-Item -ItemType Directory -Path (Join-Path $BackupPath "config") -Force | Out-Null
    Copy-Item "config\nginx.conf" (Join-Path $BackupPath "config\nginx.conf")
    Write-Host "✓ nginx.conf backed up" -ForegroundColor Green
}

# Backup license key if exists
if (Test-Path "config\license-public.pem") {
    New-Item -ItemType Directory -Path (Join-Path $BackupPath "config") -Force | Out-Null
    Copy-Item "config\license-public.pem" (Join-Path $BackupPath "config\license-public.pem")
    Write-Host "✓ license-public.pem backed up" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 5. Backup Uploaded Files
# ============================================================

Write-Host "[5/6] Backing up uploaded files..." -ForegroundColor Yellow
Write-Host ""

# Backup uploads directory if exists
if (Test-Path "uploads") {
    Copy-Item -Path "uploads" -Destination (Join-Path $BackupPath "uploads") -Recurse
    $uploadSize = (Get-ChildItem "uploads" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "✓ Uploaded files backed up ($([math]::Round($uploadSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "⚠ No uploads directory found" -ForegroundColor Yellow
}

# Backup data directory if exists (exclude SQLite database)
if (Test-Path "data") {
    New-Item -ItemType Directory -Path (Join-Path $BackupPath "data") -Force | Out-Null
    Get-ChildItem "data" -Recurse -File | Where-Object { $_.Extension -notmatch '\.db' } | ForEach-Object {
        $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
        $targetPath = Join-Path $BackupPath $relativePath
        $targetDir = Split-Path $targetPath -Parent
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Copy-Item $_.FullName $targetPath
    }
    Write-Host "✓ Data files backed up" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 6. Create Backup Metadata
# ============================================================

Write-Host "[6/6] Creating backup metadata..." -ForegroundColor Yellow
Write-Host ""

$metadata = @"
Backup Information
==================

Backup Name: $BackupName
Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Hostname: $env:COMPUTERNAME

Application Version: $($envVars['APP_VERSION'])
Deployment Mode: $($envVars['DEPLOYMENT_MODE'])
Database Type: $($envVars['DATABASE_TYPE'])

Database: $dbName
Database User: $dbUser

Backup Contents:
- Database dump (database.sql)
- Environment configuration (.env)
- Docker Compose files
- Nginx configuration
- License files
- Uploaded files
- Data files

Created by: Patient CRM Backup Script (PowerShell)
"@

$metadata | Out-File -FilePath (Join-Path $BackupPath "metadata.txt") -Encoding UTF8

Write-Host "✓ Metadata created" -ForegroundColor Green
Write-Host ""

# ============================================================
# Calculate Backup Size
# ============================================================

$totalSize = (Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Backup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Backup Information:" -ForegroundColor Blue
Write-Host "  Name: $BackupName"
Write-Host "  Location: $BackupPath"
Write-Host "  Size: $([math]::Round($totalSize, 2)) MB"
Write-Host ""

# List backup contents
Write-Host "Backup Contents:" -ForegroundColor Blue
Get-ChildItem $BackupPath -Recurse -File | ForEach-Object {
    $size = $_.Length / 1KB
    Write-Host "  $($_.FullName.Substring($BackupPath.Length + 1)) ($([math]::Round($size, 2)) KB)"
}
Write-Host ""

# ============================================================
# Create Compressed Archive (Optional)
# ============================================================

$response = Read-Host "Create compressed archive? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Creating compressed archive..." -ForegroundColor Cyan

    $archiveName = "$BackupName.zip"
    $archivePath = Join-Path $BackupDir $archiveName

    Compress-Archive -Path $BackupPath -DestinationPath $archivePath -Force

    $archiveSize = (Get-Item $archivePath).Length / 1MB
    Write-Host "✓ Compressed archive created: $archiveName ($([math]::Round($archiveSize, 2)) MB)" -ForegroundColor Green
    Write-Host ""

    $removeResponse = Read-Host "Remove uncompressed backup directory? (y/n)"
    if ($removeResponse -eq 'y' -or $removeResponse -eq 'Y') {
        Remove-Item -Path $BackupPath -Recurse -Force
        Write-Host "✓ Uncompressed backup removed" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================
# Backup Retention Management
# ============================================================

Write-Host "Managing backup retention..." -ForegroundColor Yellow

# Count total backups
$backupDirs = Get-ChildItem $BackupDir -Directory | Measure-Object | Select-Object -ExpandProperty Count
$backupZips = Get-ChildItem $BackupDir -Filter "*.zip" | Measure-Object | Select-Object -ExpandProperty Count
$totalCount = $backupDirs + $backupZips

Write-Host "Current backups: $totalCount (directories: $backupDirs, archives: $backupZips)"

# Default retention: keep last 10 backups
$retention = if ($envVars["BACKUP_RETENTION"]) { [int]$envVars["BACKUP_RETENTION"] } else { 10 }

if ($totalCount -gt $retention) {
    Write-Host "Retention limit ($retention) exceeded"

    $removeResponse = Read-Host "Remove old backups? (y/n)"
    if ($removeResponse -eq 'y' -or $removeResponse -eq 'Y') {
        # Remove old directories
        Get-ChildItem $BackupDir -Directory | Sort-Object CreationTime -Descending | Select-Object -Skip $retention | Remove-Item -Recurse -Force

        # Remove old archives
        Get-ChildItem $BackupDir -Filter "*.zip" | Sort-Object CreationTime -Descending | Select-Object -Skip $retention | Remove-Item -Force

        Write-Host "✓ Old backups removed" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================
# Backup Complete
# ============================================================

Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host ""
Write-Host "  List backups:       Get-ChildItem $BackupDir"
Write-Host "  Restore backup:     .\bin\rollback.ps1 $BackupName"
Write-Host "  View metadata:      Get-Content $BackupPath\metadata.txt"
Write-Host ""

Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host ""

exit 0
