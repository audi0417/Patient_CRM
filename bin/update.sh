#!/bin/bash

#############################################################
# Patient CRM On-Premise Update Script
#
# This script automates the upgrade process for on-premise
# installations with automatic backup and rollback capability.
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
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pre_update_${TIMESTAMP}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Patient CRM On-Premise Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

#############################################################
# 1. Pre-Update Checks
#############################################################

echo -e "${YELLOW}[1/8] Running pre-update checks...${NC}"

cd "$PROJECT_ROOT"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo "This doesn't appear to be an installed instance"
    exit 1
fi

# Source environment variables
source .env

# Check if deployment mode is on-premise
if [ "$DEPLOYMENT_MODE" != "on-premise" ]; then
    echo -e "${RED}✗ Error: DEPLOYMENT_MODE is not 'on-premise'${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Error: Docker daemon is not running${NC}"
    exit 1
fi

# Check if services are running
if ! docker compose -f docker-compose.onpremise.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠ Warning: Services don't appear to be running${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Pre-update checks passed${NC}"
echo ""

#############################################################
# 2. Get Current Version
#############################################################

echo -e "${YELLOW}[2/8] Detecting current version...${NC}"

CURRENT_VERSION="${APP_VERSION:-unknown}"
echo "Current version: $CURRENT_VERSION"

# Get version from running container if available
if docker compose -f docker-compose.onpremise.yml ps | grep -q "app.*Up"; then
    CONTAINER_VERSION=$(docker compose -f docker-compose.onpremise.yml exec -T app node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")
    if [ "$CONTAINER_VERSION" != "unknown" ]; then
        CURRENT_VERSION="$CONTAINER_VERSION"
        echo "Detected running version: $CURRENT_VERSION"
    fi
fi

echo ""

#############################################################
# 3. Create Backup
#############################################################

echo -e "${YELLOW}[3/8] Creating backup before update...${NC}"

# Run backup script
if [ -f "$SCRIPT_DIR/backup.sh" ]; then
    if bash "$SCRIPT_DIR/backup.sh" "$BACKUP_NAME"; then
        echo -e "${GREEN}✓ Backup created: $BACKUP_NAME${NC}"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        read -p "Continue without backup? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ Warning: backup.sh not found, skipping backup${NC}"
    read -p "Continue without backup? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

#############################################################
# 4. Pull New Images
#############################################################

echo -e "${YELLOW}[4/8] Pulling new Docker images...${NC}"

# Pull latest images
if docker compose -f docker-compose.onpremise.yml pull; then
    echo -e "${GREEN}✓ New images pulled${NC}"
else
    echo -e "${RED}✗ Failed to pull new images${NC}"
    exit 1
fi

echo ""

#############################################################
# 5. Stop Application Service
#############################################################

echo -e "${YELLOW}[5/8] Stopping application service...${NC}"

# Stop app but keep database running
if docker compose -f docker-compose.onpremise.yml stop app nginx; then
    echo -e "${GREEN}✓ Application stopped${NC}"
else
    echo -e "${RED}✗ Failed to stop application${NC}"
    exit 1
fi

echo ""

#############################################################
# 6. Run Database Migrations
#############################################################

echo -e "${YELLOW}[6/8] Running database migrations...${NC}"

# Run migrations using the new image
if docker compose -f docker-compose.onpremise.yml run --rm app node server/database/migrate.js up; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo ""
    echo "Rolling back..."
    bash "$SCRIPT_DIR/rollback.sh" "$BACKUP_NAME"
    exit 1
fi

echo ""

#############################################################
# 7. Start Updated Services
#############################################################

echo -e "${YELLOW}[7/8] Starting updated services...${NC}"

# Start all services with new images
if docker compose -f docker-compose.onpremise.yml up -d; then
    echo -e "${GREEN}✓ Services started${NC}"
else
    echo -e "${RED}✗ Failed to start services${NC}"
    echo ""
    echo "Rolling back..."
    bash "$SCRIPT_DIR/rollback.sh" "$BACKUP_NAME"
    exit 1
fi

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 10

echo ""

#############################################################
# 8. Verify Update
#############################################################

echo -e "${YELLOW}[8/8] Verifying update...${NC}"

MAX_RETRIES=30
RETRY_COUNT=0
HEALTH_OK=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:${PORT:-3001}/api/health-check &> /dev/null; then
        echo -e "${GREEN}✓ Application is responding${NC}"
        HEALTH_OK=1
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}✗ Application health check failed${NC}"
        echo ""
        echo "Rolling back..."
        bash "$SCRIPT_DIR/rollback.sh" "$BACKUP_NAME"
        exit 1
    fi

    echo "Waiting for application... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# Get new version
NEW_VERSION=$(docker compose -f docker-compose.onpremise.yml exec -T app node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Update Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Version Information:${NC}"
echo "  Previous version: $CURRENT_VERSION"
echo "  Current version:  $NEW_VERSION"
echo ""

echo -e "${BLUE}Backup Information:${NC}"
echo "  Backup name: $BACKUP_NAME"
echo "  Location: $BACKUP_DIR/$BACKUP_NAME"
echo ""
echo "  To rollback: ./bin/rollback.sh $BACKUP_NAME"
echo ""

echo -e "${YELLOW}⚠️  Post-Update Checklist:${NC}"
echo ""
echo "1. Test critical functionality"
echo "2. Verify user access and permissions"
echo "3. Check integration with external systems"
echo "4. Review application logs for errors"
echo "5. Monitor performance metrics"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo ""
echo "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
echo "  Rollback:     ./bin/rollback.sh $BACKUP_NAME"
echo "  Status:       docker compose -f docker-compose.onpremise.yml ps"
echo ""

echo -e "${GREEN}Update completed successfully!${NC}"
echo ""

# Clean up old backups (keep last 5)
echo "Cleaning up old backups..."
if [ -d "$BACKUP_DIR" ]; then
    cd "$BACKUP_DIR"
    ls -t | tail -n +6 | xargs -r rm -rf
    echo -e "${GREEN}✓ Old backups cleaned up (keeping last 5)${NC}"
fi

echo ""
