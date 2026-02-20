# ============================================================
# Patient CRM Configuration Validator (Windows)
# ============================================================
#
# PowerShell script for validating on-premise configuration
#
# Usage: .\bin\validate-config.ps1
# ============================================================

#Requires -Version 5.1

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$script:Errors = 0
$script:Warnings = 0

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Configuration Validation" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# ============================================================
# Helper Functions
# ============================================================

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ ERROR: $Message" -ForegroundColor Red
    $script:Errors++
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠ WARNING: $Message" -ForegroundColor Yellow
    $script:Warnings++
}

function Write-Success-Message {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info-Message {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# ============================================================
# 1. Check Environment File
# ============================================================

Write-Host "[1/7] Checking environment file..." -ForegroundColor Yellow
Write-Host ""

Set-Location $ProjectRoot

if (-Not (Test-Path ".env")) {
    Write-Error-Message ".env file not found"
    Write-Host ""
    Write-Host "Please create .env file:"
    Write-Host "  Copy-Item .env.example .env"
    Write-Host "  notepad .env"
    exit 1
}

Write-Success-Message ".env file exists"

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

Write-Host ""

# ============================================================
# 2. Validate Required Variables
# ============================================================

Write-Host "[2/7] Validating required environment variables..." -ForegroundColor Yellow
Write-Host ""

$requiredVars = @(
    "DEPLOYMENT_MODE",
    "NODE_ENV",
    "PORT",
    "DATABASE_TYPE",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "SUPER_ADMIN_PASSWORD",
    "LICENSE_KEY"
)

foreach ($var in $requiredVars) {
    if (-Not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        Write-Error-Message "Missing required variable: $var"
    } else {
        Write-Success-Message "$var is set"
    }
}

Write-Host ""

# ============================================================
# 3. Validate Configuration Values
# ============================================================

Write-Host "[3/7] Validating configuration values..." -ForegroundColor Yellow
Write-Host ""

# Check deployment mode
if ($envVars["DEPLOYMENT_MODE"] -ne "on-premise") {
    Write-Error-Message "DEPLOYMENT_MODE must be 'on-premise', got: $($envVars['DEPLOYMENT_MODE'])"
} else {
    Write-Success-Message "DEPLOYMENT_MODE is correct"
}

# Check NODE_ENV
if ($envVars["NODE_ENV"] -ne "production") {
    Write-Warning-Message "NODE_ENV is '$($envVars['NODE_ENV'])', recommended: 'production'"
} else {
    Write-Success-Message "NODE_ENV is production"
}

# Check DATABASE_TYPE
if ($envVars["DATABASE_TYPE"] -ne "postgres") {
    Write-Error-Message "DATABASE_TYPE must be 'postgres' for on-premise, got: $($envVars['DATABASE_TYPE'])"
} else {
    Write-Success-Message "DATABASE_TYPE is postgres"
}

# Check for default/placeholder values
if ($envVars["DATABASE_PASSWORD"] -match "CHANGE_THIS|password") {
    Write-Error-Message "DATABASE_PASSWORD appears to be a default value"
}

if ($envVars["JWT_SECRET"] -match "CHANGE_THIS|secret") {
    Write-Error-Message "JWT_SECRET appears to be a default value"
}

if ($envVars["ENCRYPTION_KEY"] -match "CHANGE_THIS|key") {
    Write-Error-Message "ENCRYPTION_KEY appears to be a default value"
}

if ($envVars["SUPER_ADMIN_PASSWORD"] -match "CHANGE_THIS" -or $envVars["SUPER_ADMIN_PASSWORD"] -eq "admin") {
    Write-Error-Message "SUPER_ADMIN_PASSWORD appears to be a default value"
}

if ($envVars["LICENSE_KEY"] -match "YOUR_|CHANGE_THIS") {
    Write-Error-Message "LICENSE_KEY appears to be a placeholder"
}

Write-Host ""

# ============================================================
# 4. Validate Security Settings
# ============================================================

Write-Host "[4/7] Validating security settings..." -ForegroundColor Yellow
Write-Host ""

# Check JWT_SECRET length
$jwtSecretLength = $envVars["JWT_SECRET"].Length
if ($jwtSecretLength -lt 32) {
    Write-Error-Message "JWT_SECRET must be at least 32 characters (current: $jwtSecretLength)"
} else {
    Write-Success-Message "JWT_SECRET length is sufficient ($jwtSecretLength chars)"
}

# Check ENCRYPTION_KEY length
$encryptionKeyLength = $envVars["ENCRYPTION_KEY"].Length
if ($encryptionKeyLength -lt 32) {
    Write-Error-Message "ENCRYPTION_KEY must be at least 32 characters (current: $encryptionKeyLength)"
} else {
    Write-Success-Message "ENCRYPTION_KEY length is sufficient ($encryptionKeyLength chars)"
}

# Check password strength
$adminPasswordLength = $envVars["SUPER_ADMIN_PASSWORD"].Length
if ($adminPasswordLength -lt 8) {
    Write-Warning-Message "SUPER_ADMIN_PASSWORD is weak (less than 8 characters)"
} elseif ($adminPasswordLength -lt 12) {
    Write-Warning-Message "SUPER_ADMIN_PASSWORD could be stronger (recommended: 12+ characters)"
} else {
    Write-Success-Message "SUPER_ADMIN_PASSWORD length is good ($adminPasswordLength chars)"
}

# Check database password strength
$dbPasswordLength = $envVars["DATABASE_PASSWORD"].Length
if ($dbPasswordLength -lt 12) {
    Write-Warning-Message "DATABASE_PASSWORD is weak (recommended: 12+ characters)"
} else {
    Write-Success-Message "DATABASE_PASSWORD length is good"
}

Write-Host ""

# ============================================================
# 5. Validate License Key
# ============================================================

Write-Host "[5/7] Validating license key..." -ForegroundColor Yellow
Write-Host ""

# Check license key format (should be JWT format)
if ($envVars["LICENSE_KEY"] -match '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    Write-Success-Message "LICENSE_KEY format is valid (JWT)"
} else {
    Write-Error-Message "LICENSE_KEY format is invalid (should be JWT)"
}

# Check if license public key exists
if (Test-Path "config\license-public.pem") {
    Write-Success-Message "License public key found"

    # Validate PEM format
    $pemContent = Get-Content "config\license-public.pem" -Raw
    if ($pemContent -match "BEGIN PUBLIC KEY") {
        Write-Success-Message "License public key format is valid"
    } else {
        Write-Error-Message "License public key format is invalid"
    }
} else {
    Write-Error-Message "License public key not found (config\license-public.pem)"
}

Write-Host ""

# ============================================================
# 6. Validate Network Configuration
# ============================================================

Write-Host "[6/7] Validating network configuration..." -ForegroundColor Yellow
Write-Host ""

# Check PORT
if ($envVars.ContainsKey("PORT")) {
    $port = [int]$envVars["PORT"]
    if ($port -lt 1024 -or $port -gt 65535) {
        Write-Error-Message "PORT must be between 1024 and 65535"
    } else {
        Write-Success-Message "PORT is valid ($port)"
    }
} else {
    Write-Warning-Message "PORT not set, will use default 3001"
}

# Check DATABASE_PORT
if ($envVars.ContainsKey("DATABASE_PORT")) {
    $dbPort = [int]$envVars["DATABASE_PORT"]
    if ($dbPort -ne 5432) {
        Write-Warning-Message "DATABASE_PORT is not default PostgreSQL port (5432)"
    } else {
        Write-Success-Message "DATABASE_PORT is default (5432)"
    }
}

# Check ALLOWED_ORIGINS
if (-Not $envVars.ContainsKey("ALLOWED_ORIGINS") -or [string]::IsNullOrWhiteSpace($envVars["ALLOWED_ORIGINS"])) {
    Write-Warning-Message "ALLOWED_ORIGINS not set (CORS will be restrictive)"
} else {
    Write-Success-Message "ALLOWED_ORIGINS is configured"

    # Check for wildcard in production
    if ($envVars["ALLOWED_ORIGINS"] -eq "*" -and $envVars["NODE_ENV"] -eq "production") {
        Write-Error-Message "ALLOWED_ORIGINS should not be '*' in production"
    }
}

Write-Host ""

# ============================================================
# 7. Validate Optional Features
# ============================================================

Write-Host "[7/7] Validating optional features..." -ForegroundColor Yellow
Write-Host ""

# Check SMTP configuration
if ($envVars["ENABLE_EMAIL_NOTIFICATIONS"] -eq "true") {
    Write-Info-Message "Email notifications enabled"

    if ([string]::IsNullOrWhiteSpace($envVars["SMTP_HOST"]) -or [string]::IsNullOrWhiteSpace($envVars["SMTP_PORT"])) {
        Write-Warning-Message "SMTP configuration incomplete"
    } else {
        Write-Success-Message "SMTP configuration present"
    }
} else {
    Write-Info-Message "Email notifications disabled"
}

# Check backup configuration
if ($envVars["ENABLE_BACKUP"] -eq "true") {
    Write-Success-Message "Automatic backups enabled"
} else {
    Write-Info-Message "Automatic backups disabled"
}

# Check log level
if ([string]::IsNullOrWhiteSpace($envVars["LOG_LEVEL"])) {
    Write-Info-Message "LOG_LEVEL not set (will use default)"
} elseif ($envVars["LOG_LEVEL"] -notmatch '^(error|warn|info|debug)$') {
    Write-Warning-Message "LOG_LEVEL should be one of: error, warn, info, debug"
} else {
    Write-Success-Message "LOG_LEVEL is valid ($($envVars['LOG_LEVEL']))"
}

Write-Host ""

# ============================================================
# Test Database Connection (if Docker is running)
# ============================================================

try {
    docker info | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[Bonus] Testing database connection..." -ForegroundColor Yellow
        Write-Host ""

        # Check if database container is running
        $dbStatus = docker compose -f docker-compose.onpremise.yml ps 2>$null
        if ($dbStatus -match "db.*Up") {
            Write-Info-Message "Database container is running"

            # Test connection
            $dbUser = if ($envVars["DATABASE_USER"]) { $envVars["DATABASE_USER"] } else { "postgres" }
            docker compose -f docker-compose.onpremise.yml exec -T db pg_isready -U $dbUser 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success-Message "Database connection successful"
            } else {
                Write-Warning-Message "Database is running but not ready yet"
            }
        } else {
            Write-Info-Message "Database container not running (skipping connection test)"
        }

        Write-Host ""
    }
} catch {
    # Docker not available, skip test
}

# ============================================================
# Summary
# ============================================================

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Validation Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

if ($script:Errors -eq 0 -and $script:Warnings -eq 0) {
    Write-Host "✅ Configuration is valid!" -ForegroundColor Green
    Write-Host ""
    Write-Host "No errors or warnings found."
    Write-Host "Your configuration is ready for deployment."
    exit 0
} elseif ($script:Errors -eq 0) {
    Write-Host "⚠ Configuration has warnings" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Errors: $($script:Errors)"
    Write-Host "Warnings: $($script:Warnings)"
    Write-Host ""
    Write-Host "The configuration will work, but you should address the warnings above."
    exit 0
} else {
    Write-Host "❌ Configuration has errors" -ForegroundColor Red
    Write-Host ""
    Write-Host "Errors: $($script:Errors)"
    Write-Host "Warnings: $($script:Warnings)"
    Write-Host ""
    Write-Host "Please fix the errors above before proceeding."
    exit 1
}
