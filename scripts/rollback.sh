#!/bin/bash
#
# Patient CRM On-Premise Rollback Script
#
# Usage:
#   ./scripts/rollback.sh                     # Rollback using latest backup
#   ./scripts/rollback.sh <backup_file>       # Rollback using specific backup
#

set -e

echo ""
echo "========================================"
echo "  Patient CRM On-Premise Rollback"
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

# ---- Determine backup file ----
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
else
  # Find latest backup
  BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/pre_update_*.dump "${BACKUP_DIR}"/patient_crm_*.dump 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: No backup file found${NC}"
  echo "Usage: ./scripts/rollback.sh [backup_file]"
  echo ""
  echo "Available backups:"
  ls -lh "${BACKUP_DIR}"/*.dump 2>/dev/null || echo "  (none)"
  exit 1
fi

echo "Backup file: ${BACKUP_FILE}"
echo ""

# ---- Confirm rollback ----
read -p "Are you sure you want to rollback? This will replace the current database. (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 0
fi

source .env 2>/dev/null || true

# ---- Step 1: Stop application ----
echo ""
echo "[1/4] Stopping application service..."
$COMPOSE_CMD -f $COMPOSE_FILE stop app nginx 2>/dev/null || true
echo -e "  ${GREEN}Application stopped${NC}"

# ---- Step 2: Restore database ----
echo "[2/4] Restoring database..."

# Ensure db is running
$COMPOSE_CMD -f $COMPOSE_FILE up -d db
sleep 5

# Drop and recreate
$COMPOSE_CMD -f $COMPOSE_FILE exec -T db psql \
  -U "${DATABASE_USER:-postgres}" \
  -c "DROP DATABASE IF EXISTS ${DATABASE_NAME:-patient_crm};" \
  -c "CREATE DATABASE ${DATABASE_NAME:-patient_crm};"

# Restore from backup
$COMPOSE_CMD -f $COMPOSE_FILE exec -T db pg_restore \
  -U "${DATABASE_USER:-postgres}" \
  -d "${DATABASE_NAME:-patient_crm}" \
  --no-owner --no-privileges \
  < "$BACKUP_FILE"

echo -e "  ${GREEN}Database restored${NC}"

# ---- Step 3: Restart all services ----
echo "[3/4] Restarting services..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d
echo -e "  ${GREEN}Services started${NC}"

# ---- Step 4: Health check ----
echo "[4/4] Running health check..."

MAX_RETRIES=20
RETRY_INTERVAL=5
HEALTH_URL="http://localhost:3001/api/health-check"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "  ${GREEN}Health check passed${NC}"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo -e "${RED}Health check failed after rollback${NC}"
    echo "Check logs: $COMPOSE_CMD -f $COMPOSE_FILE logs"
    exit 1
  fi

  echo "  Waiting... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo ""
echo "========================================"
echo -e "  ${GREEN}Rollback Complete!${NC}"
echo "========================================"
echo ""
echo "  Restored from: ${BACKUP_FILE}"
echo ""
