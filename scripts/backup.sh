#!/bin/bash
#
# Patient CRM Database Backup Script
#
# Used by docker-compose.onpremise.yml backup service
# Creates timestamped PostgreSQL dumps and rotates old backups
#

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DATABASE_HOST:-db}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-patient_crm}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/patient_crm_${DATE}.dump"

echo "[Backup] Starting database backup at $(date)"
echo "[Backup] Target: ${BACKUP_FILE}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Create PostgreSQL dump (custom format for pg_restore)
export PGPASSWORD="${POSTGRES_PASSWORD}"

pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  --no-owner \
  --no-privileges \
  -f "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
  FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[Backup] Success: ${BACKUP_FILE} (${FILESIZE})"
else
  echo "[Backup] ERROR: Backup failed"
  exit 1
fi

# Rotate old backups (delete files older than retention period)
echo "[Backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "${BACKUP_DIR}" -name "patient_crm_*.dump" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[Backup] Removed ${DELETED} old backup(s)"

# List current backups
TOTAL=$(find "${BACKUP_DIR}" -name "patient_crm_*.dump" | wc -l)
echo "[Backup] Total backups: ${TOTAL}"
echo "[Backup] Completed at $(date)"
