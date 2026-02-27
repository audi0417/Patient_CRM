#!/bin/bash
#
# Patient CRM On-Premise Update Script
#
# Usage: ./scripts/update.sh
#
# This script:
# 1. Creates a backup of the current database
# 2. Pulls/builds new Docker images
# 3. Restarts services with the new version
# 4. Runs health checks
# 5. Rolls back on failure
#

set -e

echo ""
echo "========================================"
echo "  Patient CRM On-Premise Update"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Determine compose command
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}Error: Docker Compose not found${NC}"
  exit 1
fi

COMPOSE_FILE="docker-compose.onpremise.yml"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# ---- Step 1: Pre-update checks ----
echo "[1/5] Pre-update checks..."

if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}Error: $COMPOSE_FILE not found${NC}"
  exit 1
fi

if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Check if services are running
if ! $COMPOSE_CMD -f $COMPOSE_FILE ps --services --filter "status=running" | grep -q "app"; then
  echo -e "${YELLOW}Warning: App service is not currently running${NC}"
fi

echo -e "  ${GREEN}Checks passed${NC}"
echo ""

# ---- Step 2: Create backup ----
echo "[2/5] Creating backup..."

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/pre_update_${DATE}.dump"

source .env 2>/dev/null || true

# Backup database via the running db container
if $COMPOSE_CMD -f $COMPOSE_FILE ps --services --filter "status=running" | grep -q "db"; then
  $COMPOSE_CMD -f $COMPOSE_FILE exec -T db pg_dump \
    -U "${DATABASE_USER:-postgres}" \
    -d "${DATABASE_NAME:-patient_crm}" \
    -Fc --no-owner --no-privileges \
    > "$BACKUP_FILE"

  FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "  ${GREEN}Database backup: ${BACKUP_FILE} (${FILESIZE})${NC}"
else
  echo -e "${YELLOW}Warning: Database container not running, skipping backup${NC}"
  BACKUP_FILE=""
fi

echo ""

# ---- Step 3: Build new images ----
echo "[3/5] Building updated Docker images..."
$COMPOSE_CMD -f $COMPOSE_FILE build --quiet
echo -e "  ${GREEN}Build complete${NC}"
echo ""

# ---- Step 4: Restart services ----
echo "[4/5] Restarting services..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d
echo -e "  ${GREEN}Services restarted${NC}"
echo ""

# ---- Step 5: Health check ----
echo "[5/5] Running health checks..."

MAX_RETRIES=30
RETRY_INTERVAL=5
HEALTH_URL="http://localhost:3001/api/health-check"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "  ${GREEN}Health check passed${NC}"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo -e "${RED}Health check failed after ${MAX_RETRIES} attempts${NC}"

    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
      echo "Initiating rollback..."
      ./scripts/rollback.sh "$BACKUP_FILE"
    else
      echo "No backup available for rollback."
      echo "Check logs: $COMPOSE_CMD -f $COMPOSE_FILE logs"
    fi
    exit 1
  fi

  echo "  Waiting... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo ""
echo "========================================"
echo -e "  ${GREEN}Update Complete!${NC}"
echo "========================================"
echo ""
echo "  Backup location: ${BACKUP_FILE:-'(none)'}"
echo ""
