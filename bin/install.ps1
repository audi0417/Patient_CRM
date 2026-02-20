# ============================================================
# Patient CRM On-Premise Installation Script (Windows)
# ============================================================
#
# PowerShell script for automated installation on Windows
#
# Usage: .\bin\install.ps1
# ============================================================

#Requires -Version 5.1

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Patient CRM On-Premise Installation" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# ============================================================
# 1. Check Prerequisites
# ============================================================

Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "✗ Error: Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker Compose installed: $composeVersion" -ForegroundColor Green
    } else {
        throw "Docker Compose not found"
    }
} catch {
    Write-Host "✗ Error: Docker Compose is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Compose v2" -ForegroundColor Yellow
    exit 1
}

# Check if Docker daemon is running
try {
    docker info | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker daemon is running" -ForegroundColor Green
    } else {
        throw "Docker daemon not running"
    }
} catch {
    Write-Host "✗ Error: Docker daemon is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ============================================================
# 2. Environment Configuration
# ============================================================

Write-Host "[2/7] Configuring environment..." -ForegroundColor Yellow
Write-Host ""

Set-Location $ProjectRoot

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file from example..." -ForegroundColor Cyan

    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "✗ Error: .env.example not found" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You must configure the .env file" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Required settings:"
    Write-Host "  - LICENSE_KEY (your on-premise license key)"
    Write-Host "  - JWT_SECRET (random string, min 32 chars)"
    Write-Host "  - ENCRYPTION_KEY (random string, min 32 chars)"
    Write-Host "  - DATABASE_PASSWORD (secure password)"
    Write-Host "  - SUPER_ADMIN_PASSWORD (initial admin password)"
    Write-Host ""
    Write-Host "Optional but recommended:"
    Write-Host "  - ALLOWED_ORIGINS (your domain)"
    Write-Host "  - SMTP settings (for email notifications)"
    Write-Host ""

    # Open editor
    Write-Host "Opening .env file in notepad..." -ForegroundColor Cyan
    Start-Process notepad.exe ".env" -Wait
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 3. Validate Configuration
# ============================================================

Write-Host "[3/7] Validating configuration..." -ForegroundColor Yellow
Write-Host ""

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

# Validate required variables
$requiredVars = @(
    "DEPLOYMENT_MODE",
    "LICENSE_KEY",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "DATABASE_PASSWORD",
    "SUPER_ADMIN_PASSWORD"
)

$validationFailed = $false

foreach ($var in $requiredVars) {
    if (-Not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        Write-Host "✗ Missing required variable: $var" -ForegroundColor Red
        $validationFailed = $true
    } elseif ($envVars[$var] -match "CHANGE_THIS|YOUR_") {
        Write-Host "✗ Variable $var must be changed from default value" -ForegroundColor Red
        $validationFailed = $true
    }
}

# Check deployment mode
if ($envVars["DEPLOYMENT_MODE"] -ne "on-premise") {
    Write-Host "✗ DEPLOYMENT_MODE must be 'on-premise'" -ForegroundColor Red
    $validationFailed = $true
}

# Check secret lengths
if ($envVars["JWT_SECRET"].Length -lt 32) {
    Write-Host "✗ JWT_SECRET must be at least 32 characters" -ForegroundColor Red
    $validationFailed = $true
}

if ($envVars["ENCRYPTION_KEY"].Length -lt 32) {
    Write-Host "✗ ENCRYPTION_KEY must be at least 32 characters" -ForegroundColor Red
    $validationFailed = $true
}

if ($validationFailed) {
    Write-Host ""
    Write-Host "Configuration validation failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Configuration validated" -ForegroundColor Green
Write-Host ""

# ============================================================
# 4. Check License Key
# ============================================================

Write-Host "[4/7] Checking license key..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "config\license-public.pem") {
    Write-Host "✓ License public key found" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: config\license-public.pem not found" -ForegroundColor Yellow
    Write-Host "License validation may fail at runtime"
}

Write-Host ""

# ============================================================
# 5. Pull Docker Images
# ============================================================

Write-Host "[5/7] Pulling Docker images..." -ForegroundColor Yellow
Write-Host ""

docker compose -f docker-compose.onpremise.yml pull

Write-Host "✓ Docker images pulled" -ForegroundColor Green
Write-Host ""

# ============================================================
# 6. Initialize Database
# ============================================================

Write-Host "[6/7] Initializing database..." -ForegroundColor Yellow
Write-Host ""

# Start database only
docker compose -f docker-compose.onpremise.yml up -d db

# Wait for database to be ready
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
        docker compose -f docker-compose.onpremise.yml logs db
        exit 1
    }

    Write-Host "Waiting for database... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

Write-Host ""

# ============================================================
# 7. Start Services
# ============================================================

Write-Host "[7/7] Starting all services..." -ForegroundColor Yellow
Write-Host ""

# Start all services
docker compose -f docker-compose.onpremise.yml up -d

# Wait for application to be ready
Write-Host "Waiting for application to start..."
Start-Sleep -Seconds 10

$maxRetries = 30
$retryCount = 0
$appReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $port = if ($envVars["PORT"]) { $envVars["PORT"] } else { "3001" }
        $response = Invoke-WebRequest -Uri "http://localhost:$port/api/health-check" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Application is ready" -ForegroundColor Green
            $appReady = $true
            break
        }
    } catch {
        # Continue waiting
    }

    $retryCount++
    if ($retryCount -eq $maxRetries) {
        Write-Host "⚠ Warning: Application health check failed" -ForegroundColor Yellow
        Write-Host "Check logs with: docker compose -f docker-compose.onpremise.yml logs app"
        break
    }

    Write-Host "Waiting for application... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

Write-Host ""

# ============================================================
# Installation Complete
# ============================================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Display access information
$httpPort = if ($envVars["HTTP_PORT"]) { $envVars["HTTP_PORT"] } else { "80" }
$appPort = if ($envVars["PORT"]) { $envVars["PORT"] } else { "3001" }

Write-Host "Access Information:" -ForegroundColor Blue
Write-Host ""

if ($httpPort -eq "80") {
    Write-Host "  Application URL: http://localhost"
} else {
    Write-Host "  Application URL: http://localhost:$httpPort"
}

Write-Host "  API Health Check: http://localhost:${appPort}/api/health-check"
Write-Host ""

Write-Host "Default Credentials:" -ForegroundColor Blue
Write-Host "  Username: superadmin"
Write-Host "  Password: (as configured in SUPER_ADMIN_PASSWORD)"
Write-Host ""

Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Change the super admin password after first login"
Write-Host "2. Create your organizations and users"
Write-Host "3. Configure SSL/TLS for production use"
Write-Host "4. Set up regular backups (see bin\backup.ps1)"
Write-Host "5. Configure email notifications (optional)"
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host ""
Write-Host "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
Write-Host "  Stop:         docker compose -f docker-compose.onpremise.yml stop"
Write-Host "  Restart:      docker compose -f docker-compose.onpremise.yml restart"
Write-Host "  Status:       docker compose -f docker-compose.onpremise.yml ps"
Write-Host "  Backup:       .\bin\backup.ps1"
Write-Host "  Update:       .\bin\update.ps1"
Write-Host ""

Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host ""
