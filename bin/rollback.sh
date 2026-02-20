#!/bin/bash

#############################################################
# Patient CRM On-Premise Rollback Script
#
# This script rolls back a failed update by restoring from
# a previous backup.
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Patient CRM On-Premise Rollback${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

#############################################################
# 1. Parse Arguments and Validate
#############################################################

BACKUP_NAME="$1"

if [ -z "$BACKUP_NAME" ]; then
    echo "Usage: $0 <backup_name>"
    echo ""
    echo "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -1 "$BACKUP_DIR" | grep -v "\.tar\.gz$" || echo "  (none)"
    else
        echo "  (none - backup directory doesn't exist)"
    fi
    exit 1
fi

# Check if backup exists
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}✗ Error: Backup not found: $BACKUP_PATH${NC}"
    echo ""
    echo "Available backups:"
    ls -1 "$BACKUP_DIR" | grep -v "\.tar\.gz$" || echo "  (none)"
    exit 1
fi

echo "Using backup: $BACKUP_NAME"
echo "Path: $BACKUP_PATH"
echo ""

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will restore the system to a previous state${NC}"
echo "This operation will:"
echo "  1. Stop all services"
echo "  2. Restore database from backup"
echo "  3. Restore configuration files"
echo "  4. Restart services"
echo ""
read -p "Are you sure you want to proceed? (yes/no) " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi
echo ""

#############################################################
# 2. Pre-Rollback Checks
#############################################################

echo -e "${YELLOW}[1/6] Running pre-rollback checks...${NC}"

cd "$PROJECT_ROOT"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    exit 1
fi

# Source environment variables
source .env

# Check Docker
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Error: Docker daemon is not running${NC}"
    exit 1
fi

# Verify backup integrity
if [ ! -f "$BACKUP_PATH/database.sql" ]; then
    echo -e "${RED}✗ Error: Database backup not found in $BACKUP_NAME${NC}"
    exit 1
fi

if [ ! -f "$BACKUP_PATH/metadata.txt" ]; then
    echo -e "${YELLOW}⚠ Warning: Backup metadata not found${NC}"
else
    echo "Backup metadata:"
    cat "$BACKUP_PATH/metadata.txt"
    echo ""
fi

echo -e "${GREEN}✓ Pre-rollback checks passed${NC}"
echo ""

#############################################################
# 3. Stop Services
#############################################################

echo -e "${YELLOW}[2/6] Stopping services...${NC}"

if docker compose -f docker-compose.onpremise.yml stop; then
    echo -e "${GREEN}✓ Services stopped${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Failed to stop services gracefully${NC}"
fi

echo ""

#############################################################
# 4. Restore Database
#############################################################

echo -e "${YELLOW}[3/6] Restoring database...${NC}"

# Start only database service
docker compose -f docker-compose.onpremise.yml up -d db

# Wait for database
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
        exit 1
    fi

    sleep 2
done

# Drop and recreate database
echo "Recreating database..."
docker compose -f docker-compose.onpremise.yml exec -T db psql -U ${DATABASE_USER:-postgres} <<-EOSQL
    DROP DATABASE IF EXISTS ${DATABASE_NAME:-patient_crm};
    CREATE DATABASE ${DATABASE_NAME:-patient_crm};
EOSQL

# Restore database from backup
echo "Restoring database from backup..."
if docker compose -f docker-compose.onpremise.yml exec -T db psql -U ${DATABASE_USER:-postgres} -d ${DATABASE_NAME:-patient_crm} < "$BACKUP_PATH/database.sql"; then
    echo -e "${GREEN}✓ Database restored${NC}"
else
    echo -e "${RED}✗ Database restoration failed${NC}"
    exit 1
fi

echo ""

#############################################################
# 5. Restore Configuration
#############################################################

echo -e "${YELLOW}[4/6] Restoring configuration...${NC}"

# Restore .env if backed up
if [ -f "$BACKUP_PATH/.env" ]; then
    cp "$BACKUP_PATH/.env" .env
    echo -e "${GREEN}✓ .env restored${NC}"
else
    echo -e "${YELLOW}⚠ .env not in backup, keeping current${NC}"
fi

# Restore uploaded files if backed up
if [ -d "$BACKUP_PATH/uploads" ]; then
    if [ -d uploads ]; then
        rm -rf uploads
    fi
    cp -r "$BACKUP_PATH/uploads" uploads
    echo -e "${GREEN}✓ Uploaded files restored${NC}"
else
    echo -e "${YELLOW}⚠ Uploaded files not in backup${NC}"
fi

echo ""

#############################################################
# 6. Start Services
#############################################################

echo -e "${YELLOW}[5/6] Starting services...${NC}"

# Reload environment
source .env

# Start all services
if docker compose -f docker-compose.onpremise.yml up -d; then
    echo -e "${GREEN}✓ Services started${NC}"
else
    echo -e "${RED}✗ Failed to start services${NC}"
    exit 1
fi

# Wait for application
echo "Waiting for application to start..."
sleep 10

echo ""

#############################################################
# 7. Verify Rollback
#############################################################

echo -e "${YELLOW}[6/6] Verifying rollback...${NC}"

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
        echo "Check logs with: docker compose -f docker-compose.onpremise.yml logs"
        exit 1
    fi

    echo "Waiting for application... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Rollback Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}System Information:${NC}"
echo "  Restored from: $BACKUP_NAME"
echo "  Application URL: http://localhost:${HTTP_PORT:-80}"
echo ""

echo -e "${YELLOW}⚠️  Post-Rollback Checklist:${NC}"
echo ""
echo "1. Verify system functionality"
echo "2. Check user access"
echo "3. Review logs for any errors"
echo "4. Notify users of the rollback"
echo "5. Investigate root cause of update failure"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo ""
echo "  View logs:    docker compose -f docker-compose.onpremise.yml logs -f"
echo "  Status:       docker compose -f docker-compose.onpremise.yml ps"
echo ""

echo -e "${GREEN}Rollback completed successfully!${NC}"
echo ""
