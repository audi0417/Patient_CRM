#!/bin/bash

#############################################################
# Patient CRM On-Premise Configuration Validator
#
# This script validates the on-premise configuration and
# checks for common issues before installation or updates.
#############################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

ERRORS=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Configuration Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

#############################################################
# Helper Functions
#############################################################

error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

#############################################################
# 1. Check Environment File
#############################################################

echo -e "${YELLOW}[1/7] Checking environment file...${NC}"
echo ""

cd "$PROJECT_ROOT"

if [ ! -f .env ]; then
    error ".env file not found"
    echo ""
    echo "Please create .env file:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

success ".env file exists"

# Source environment variables
source .env

echo ""

#############################################################
# 2. Validate Required Variables
#############################################################

echo -e "${YELLOW}[2/7] Validating required environment variables...${NC}"
echo ""

# Required variables
REQUIRED_VARS=(
    "DEPLOYMENT_MODE"
    "NODE_ENV"
    "PORT"
    "DATABASE_TYPE"
    "DATABASE_HOST"
    "DATABASE_PORT"
    "DATABASE_USER"
    "DATABASE_PASSWORD"
    "DATABASE_NAME"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "SUPER_ADMIN_PASSWORD"
    "LICENSE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        error "Missing required variable: $var"
    else
        success "$var is set"
    fi
done

echo ""

#############################################################
# 3. Validate Configuration Values
#############################################################

echo -e "${YELLOW}[3/7] Validating configuration values...${NC}"
echo ""

# Check deployment mode
if [ "$DEPLOYMENT_MODE" != "on-premise" ]; then
    error "DEPLOYMENT_MODE must be 'on-premise', got: $DEPLOYMENT_MODE"
else
    success "DEPLOYMENT_MODE is correct"
fi

# Check NODE_ENV
if [ "$NODE_ENV" != "production" ]; then
    warning "NODE_ENV is '$NODE_ENV', recommended: 'production'"
else
    success "NODE_ENV is production"
fi

# Check DATABASE_TYPE
if [ "$DATABASE_TYPE" != "postgres" ]; then
    error "DATABASE_TYPE must be 'postgres' for on-premise, got: $DATABASE_TYPE"
else
    success "DATABASE_TYPE is postgres"
fi

# Check for default/placeholder values
if [[ "$DATABASE_PASSWORD" == *"CHANGE_THIS"* ]] || [[ "$DATABASE_PASSWORD" == *"password"* ]]; then
    error "DATABASE_PASSWORD appears to be a default value"
fi

if [[ "$JWT_SECRET" == *"CHANGE_THIS"* ]] || [[ "$JWT_SECRET" == *"secret"* ]]; then
    error "JWT_SECRET appears to be a default value"
fi

if [[ "$ENCRYPTION_KEY" == *"CHANGE_THIS"* ]] || [[ "$ENCRYPTION_KEY" == *"key"* ]]; then
    error "ENCRYPTION_KEY appears to be a default value"
fi

if [[ "$SUPER_ADMIN_PASSWORD" == *"CHANGE_THIS"* ]] || [[ "$SUPER_ADMIN_PASSWORD" == "admin" ]]; then
    error "SUPER_ADMIN_PASSWORD appears to be a default value"
fi

if [[ "$LICENSE_KEY" == *"YOUR_"* ]] || [[ "$LICENSE_KEY" == *"CHANGE_THIS"* ]]; then
    error "LICENSE_KEY appears to be a placeholder"
fi

echo ""

#############################################################
# 4. Validate Security Settings
#############################################################

echo -e "${YELLOW}[4/7] Validating security settings...${NC}"
echo ""

# Check JWT_SECRET length
if [ ${#JWT_SECRET} -lt 32 ]; then
    error "JWT_SECRET must be at least 32 characters (current: ${#JWT_SECRET})"
else
    success "JWT_SECRET length is sufficient (${#JWT_SECRET} chars)"
fi

# Check ENCRYPTION_KEY length
if [ ${#ENCRYPTION_KEY} -lt 32 ]; then
    error "ENCRYPTION_KEY must be at least 32 characters (current: ${#ENCRYPTION_KEY})"
else
    success "ENCRYPTION_KEY length is sufficient (${#ENCRYPTION_KEY} chars)"
fi

# Check password strength
if [ ${#SUPER_ADMIN_PASSWORD} -lt 8 ]; then
    warning "SUPER_ADMIN_PASSWORD is weak (less than 8 characters)"
elif [ ${#SUPER_ADMIN_PASSWORD} -lt 12 ]; then
    warning "SUPER_ADMIN_PASSWORD could be stronger (recommended: 12+ characters)"
else
    success "SUPER_ADMIN_PASSWORD length is good (${#SUPER_ADMIN_PASSWORD} chars)"
fi

# Check database password strength
if [ ${#DATABASE_PASSWORD} -lt 12 ]; then
    warning "DATABASE_PASSWORD is weak (recommended: 12+ characters)"
else
    success "DATABASE_PASSWORD length is good"
fi

echo ""

#############################################################
# 5. Validate License Key
#############################################################

echo -e "${YELLOW}[5/7] Validating license key...${NC}"
echo ""

# Check license key format (should be JWT format)
if [[ "$LICENSE_KEY" =~ ^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
    success "LICENSE_KEY format is valid (JWT)"

    # Try to decode header
    HEADER=$(echo "$LICENSE_KEY" | cut -d. -f1 | base64 -d 2>/dev/null || echo "{}")
    if echo "$HEADER" | grep -q "RS256"; then
        success "License uses RS256 algorithm"
    else
        warning "License algorithm could not be verified"
    fi
else
    error "LICENSE_KEY format is invalid (should be JWT)"
fi

# Check if license public key exists
if [ -f config/license-public.pem ]; then
    success "License public key found"

    # Validate PEM format
    if grep -q "BEGIN PUBLIC KEY" config/license-public.pem; then
        success "License public key format is valid"
    else
        error "License public key format is invalid"
    fi
else
    error "License public key not found (config/license-public.pem)"
fi

echo ""

#############################################################
# 6. Validate Network Configuration
#############################################################

echo -e "${YELLOW}[6/7] Validating network configuration...${NC}"
echo ""

# Check PORT
if [ -z "$PORT" ]; then
    warning "PORT not set, will use default 3001"
elif [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
    error "PORT must be between 1024 and 65535"
else
    success "PORT is valid ($PORT)"
fi

# Check DATABASE_PORT
if [ "$DATABASE_PORT" -ne 5432 ]; then
    warning "DATABASE_PORT is not default PostgreSQL port (5432)"
else
    success "DATABASE_PORT is default (5432)"
fi

# Check ALLOWED_ORIGINS
if [ -z "$ALLOWED_ORIGINS" ]; then
    warning "ALLOWED_ORIGINS not set (CORS will be restrictive)"
else
    success "ALLOWED_ORIGINS is configured"

    # Check for wildcard in production
    if [[ "$ALLOWED_ORIGINS" == "*" ]] && [ "$NODE_ENV" == "production" ]; then
        error "ALLOWED_ORIGINS should not be '*' in production"
    fi
fi

echo ""

#############################################################
# 7. Validate Optional Features
#############################################################

echo -e "${YELLOW}[7/7] Validating optional features...${NC}"
echo ""

# Check SMTP configuration
if [ "$ENABLE_EMAIL_NOTIFICATIONS" == "true" ]; then
    info "Email notifications enabled"

    if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_PORT" ]; then
        warning "SMTP configuration incomplete"
    else
        success "SMTP configuration present"
    fi
else
    info "Email notifications disabled"
fi

# Check backup configuration
if [ "$ENABLE_BACKUP" == "true" ]; then
    success "Automatic backups enabled"
else
    info "Automatic backups disabled"
fi

# Check log level
if [ -z "$LOG_LEVEL" ]; then
    info "LOG_LEVEL not set (will use default)"
elif [[ ! "$LOG_LEVEL" =~ ^(error|warn|info|debug)$ ]]; then
    warning "LOG_LEVEL should be one of: error, warn, info, debug"
else
    success "LOG_LEVEL is valid ($LOG_LEVEL)"
fi

echo ""

#############################################################
# 8. Test Database Connection (if Docker is running)
#############################################################

if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    echo -e "${YELLOW}[Bonus] Testing database connection...${NC}"
    echo ""

    # Check if database container is running
    if docker compose -f docker-compose.onpremise.yml ps 2>/dev/null | grep -q "db.*Up"; then
        info "Database container is running"

        # Test connection
        if docker compose -f docker-compose.onpremise.yml exec -T db pg_isready -U ${DATABASE_USER} 2>/dev/null; then
            success "Database connection successful"
        else
            warning "Database is running but not ready yet"
        fi
    else
        info "Database container not running (skipping connection test)"
    fi

    echo ""
fi

#############################################################
# Summary
#############################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration is valid!${NC}"
    echo ""
    echo "No errors or warnings found."
    echo "Your configuration is ready for deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Configuration has warnings${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "The configuration will work, but you should address the warnings above."
    exit 0
else
    echo -e "${RED}❌ Configuration has errors${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
