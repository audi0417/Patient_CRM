#!/bin/bash

#############################################################
# Patient CRM On-Premise Installation Script
#
# This script automates the installation process for
# on-premise deployments of the Patient CRM system.
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Patient CRM On-Premise Installation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

#############################################################
# 1. Check Prerequisites
#############################################################

echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed: $(docker --version)${NC}"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose v2"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed: $(docker compose version)${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Error: Docker daemon is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker daemon is running${NC}"

echo ""

#############################################################
# 2. Environment Configuration
#############################################################

echo -e "${YELLOW}[2/7] Configuring environment...${NC}"

cd "$PROJECT_ROOT"

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from example..."

    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo -e "${RED}✗ Error: .env.example not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: You must configure the .env file${NC}"
    echo ""
    echo "Required settings:"
    echo "  - LICENSE_KEY (your on-premise license key)"
    echo "  - JWT_SECRET (random string, min 32 chars)"
    echo "  - ENCRYPTION_KEY (random string, min 32 chars)"
    echo "  - DATABASE_PASSWORD (secure password)"
    echo "  - SUPER_ADMIN_PASSWORD (initial admin password)"
    echo ""
    echo "Optional but recommended:"
    echo "  - ALLOWED_ORIGINS (your domain)"
    echo "  - SMTP settings (for email notifications)"
    echo ""

    # Open editor if available
    if command -v nano &> /dev/null; then
        read -p "Press Enter to edit .env file with nano (or Ctrl+C to edit manually)..."
        nano .env
    else
        read -p "Please edit .env file manually and press Enter when done..."
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""

#############################################################
# 3. Validate Configuration
#############################################################

echo -e "${YELLOW}[3/7] Validating configuration...${NC}"

# Source environment variables
source .env

# Validate required variables
REQUIRED_VARS=(
    "DEPLOYMENT_MODE"
    "LICENSE_KEY"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "DATABASE_PASSWORD"
    "SUPER_ADMIN_PASSWORD"
)

VALIDATION_FAILED=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}✗ Missing required variable: $var${NC}"
        VALIDATION_FAILED=1
    elif [[ "${!var}" == *"CHANGE_THIS"* ]] || [[ "${!var}" == *"YOUR_"* ]]; then
        echo -e "${RED}✗ Variable $var must be changed from default value${NC}"
        VALIDATION_FAILED=1
    fi
done

# Check deployment mode
if [ "$DEPLOYMENT_MODE" != "on-premise" ]; then
    echo -e "${RED}✗ DEPLOYMENT_MODE must be 'on-premise'${NC}"
    VALIDATION_FAILED=1
fi

# Check secret lengths
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}✗ JWT_SECRET must be at least 32 characters${NC}"
    VALIDATION_FAILED=1
fi

if [ ${#ENCRYPTION_KEY} -lt 32 ]; then
    echo -e "${RED}✗ ENCRYPTION_KEY must be at least 32 characters${NC}"
    VALIDATION_FAILED=1
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo ""
    echo -e "${RED}Configuration validation failed. Please fix the issues above.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration validated${NC}"
echo ""

#############################################################
# 4. Check License Key
#############################################################

echo -e "${YELLOW}[4/7] Checking license key...${NC}"

if [ ! -f config/license-public.pem ]; then
    echo -e "${YELLOW}⚠ Warning: config/license-public.pem not found${NC}"
    echo "License validation may fail at runtime"
else
    echo -e "${GREEN}✓ License public key found${NC}"
fi

echo ""

#############################################################
# 5. Pull Docker Images
#############################################################

echo -e "${YELLOW}[5/7] Pulling Docker images...${NC}"

docker compose -f docker-compose.onpremise.yml pull

echo -e "${GREEN}✓ Docker images pulled${NC}"
echo ""

#############################################################
# 6. Initialize Database
#############################################################

echo -e "${YELLOW}[6/7] Initializing database...${NC}"

# Start database only
docker compose -f docker-compose.onpremise.yml up -d db

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f docker-compose.onpremise.yml exec -T db pg_isready -U ${DATABASE_USER:-postgres} &> /dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}✗ Database failed to start${NC}"
        docker compose -f docker-compose.onpremise.yml logs db
        exit 1
    fi

    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo ""

#############################################################
# 7. Start Services
#############################################################

echo -e "${YELLOW}[7/7] Starting all services...${NC}"

# Start all services
docker compose -f docker-compose.onpremise.yml up -d

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:${PORT:-3001}/api/health-check &> /dev/null; then
        echo -e "${GREEN}✓ Application is ready${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠ Warning: Application health check failed${NC}"
        echo "Check logs with: docker compose -f docker-compose.onpremise.yml logs app"
        break
    fi

    echo "Waiting for application... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo ""

#############################################################
# Installation Complete
#############################################################

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Display access information
HTTP_PORT=${HTTP_PORT:-80}
APP_PORT=${PORT:-3001}

echo -e "${BLUE}Access Information:${NC}"
echo ""

if [ "$HTTP_PORT" == "80" ]; then
    echo "  Application URL: http://localhost"
else
    echo "  Application URL: http://localhost:$HTTP_PORT"
fi

echo "  API Health Check: http://localhost:$APP_PORT/api/health-check"
echo ""

echo -e "${BLUE}Default Credentials:${NC}"
echo "  Username: superadmin"
echo "  Password: (as configured in SUPER_ADMIN_PASSWORD)"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. Change the super admin password after first login"
echo "2. Create your organizations and users"
echo "3. Configure SSL/TLS for production use"
echo "4. Set up regular backups (see bin/backup.sh)"
echo "5. Configure email notifications (optional)"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo ""
echo "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
echo "  Stop:         docker compose -f docker-compose.onpremise.yml stop"
echo "  Restart:      docker compose -f docker-compose.onpremise.yml restart"
echo "  Status:       docker compose -f docker-compose.onpremise.yml ps"
echo "  Backup:       ./bin/backup.sh"
echo "  Update:       ./bin/update.sh"
echo ""

echo -e "${GREEN}Installation completed successfully!${NC}"
echo ""
