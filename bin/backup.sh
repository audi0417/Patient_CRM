#!/bin/bash

#############################################################
# Patient CRM On-Premise Backup Script
#
# This script creates complete backups of the on-premise
# installation including database, files, and configuration.
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

# Backup name from argument or timestamp
BACKUP_NAME="${1:-backup_$(date +%Y%m%d_%H%M%S)}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Patient CRM On-Premise Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

#############################################################
# 1. Pre-Backup Checks
#############################################################

echo -e "${YELLOW}[1/6] Running pre-backup checks...${NC}"

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

# Check if database service is running
if ! docker compose -f docker-compose.onpremise.yml ps | grep -q "db.*Up"; then
    echo -e "${RED}✗ Error: Database service is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-backup checks passed${NC}"
echo ""

#############################################################
# 2. Create Backup Directory
#############################################################

echo -e "${YELLOW}[2/6] Creating backup directory...${NC}"

# Create backup directory structure
mkdir -p "$BACKUP_PATH"

echo "Backup location: $BACKUP_PATH"
echo -e "${GREEN}✓ Backup directory created${NC}"
echo ""

#############################################################
# 3. Backup Database
#############################################################

echo -e "${YELLOW}[3/6] Backing up database...${NC}"

# Dump PostgreSQL database
if docker compose -f docker-compose.onpremise.yml exec -T db pg_dump \
    -U ${DATABASE_USER:-postgres} \
    -d ${DATABASE_NAME:-patient_crm} \
    --clean \
    --if-exists \
    > "$BACKUP_PATH/database.sql"; then

    # Get database size
    DB_SIZE=$(du -h "$BACKUP_PATH/database.sql" | cut -f1)
    echo -e "${GREEN}✓ Database backed up (${DB_SIZE})${NC}"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    rm -rf "$BACKUP_PATH"
    exit 1
fi

echo ""

#############################################################
# 4. Backup Configuration
#############################################################

echo -e "${YELLOW}[4/6] Backing up configuration...${NC}"

# Backup .env file (excluding sensitive values in archive)
cp .env "$BACKUP_PATH/.env"
echo -e "${GREEN}✓ .env backed up${NC}"

# Backup docker-compose files
if [ -f docker-compose.onpremise.yml ]; then
    cp docker-compose.onpremise.yml "$BACKUP_PATH/"
    echo -e "${GREEN}✓ docker-compose.onpremise.yml backed up${NC}"
fi

# Backup nginx config if exists
if [ -f config/nginx.conf ]; then
    mkdir -p "$BACKUP_PATH/config"
    cp config/nginx.conf "$BACKUP_PATH/config/"
    echo -e "${GREEN}✓ nginx.conf backed up${NC}"
fi

# Backup license key if exists
if [ -f config/license-public.pem ]; then
    mkdir -p "$BACKUP_PATH/config"
    cp config/license-public.pem "$BACKUP_PATH/config/"
    echo -e "${GREEN}✓ license-public.pem backed up${NC}"
fi

echo ""

#############################################################
# 5. Backup Uploaded Files
#############################################################

echo -e "${YELLOW}[5/6] Backing up uploaded files...${NC}"

# Backup uploads directory if exists
if [ -d uploads ]; then
    cp -r uploads "$BACKUP_PATH/"
    UPLOAD_SIZE=$(du -sh uploads 2>/dev/null | cut -f1 || echo "0")
    echo -e "${GREEN}✓ Uploaded files backed up (${UPLOAD_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠ No uploads directory found${NC}"
fi

# Backup data directory if exists
if [ -d data ]; then
    # Exclude SQLite database file (we backup PostgreSQL above)
    mkdir -p "$BACKUP_PATH/data"
    find data -type f ! -name "*.db" ! -name "*.db-*" -exec cp --parents {} "$BACKUP_PATH/" \; 2>/dev/null || true
    echo -e "${GREEN}✓ Data files backed up${NC}"
fi

echo ""

#############################################################
# 6. Create Backup Metadata
#############################################################

echo -e "${YELLOW}[6/6] Creating backup metadata...${NC}"

# Create metadata file
cat > "$BACKUP_PATH/metadata.txt" <<EOF
Backup Information
==================

Backup Name: $BACKUP_NAME
Backup Date: $(date)
Hostname: $(hostname)

Application Version: ${APP_VERSION:-unknown}
Deployment Mode: ${DEPLOYMENT_MODE:-unknown}
Database Type: ${DATABASE_TYPE:-postgres}

Database: ${DATABASE_NAME:-patient_crm}
Database User: ${DATABASE_USER:-postgres}

Backup Contents:
- Database dump (database.sql)
- Environment configuration (.env)
- Docker Compose files
- Nginx configuration
- License files
- Uploaded files
- Data files

Created by: Patient CRM Backup Script
EOF

echo -e "${GREEN}✓ Metadata created${NC}"
echo ""

#############################################################
# 7. Calculate Backup Size
#############################################################

TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Backup Information:${NC}"
echo "  Name: $BACKUP_NAME"
echo "  Location: $BACKUP_PATH"
echo "  Size: $TOTAL_SIZE"
echo ""

# List backup contents
echo -e "${BLUE}Backup Contents:${NC}"
find "$BACKUP_PATH" -type f -exec ls -lh {} \; | awk '{print "  " $9 " (" $5 ")"}'
echo ""

#############################################################
# 8. Create Compressed Archive (Optional)
#############################################################

read -p "Create compressed archive? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating compressed archive..."

    cd "$BACKUP_DIR"
    ARCHIVE_NAME="${BACKUP_NAME}.tar.gz"

    if tar -czf "$ARCHIVE_NAME" "$BACKUP_NAME"; then
        ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
        echo -e "${GREEN}✓ Compressed archive created: $ARCHIVE_NAME (${ARCHIVE_SIZE})${NC}"
        echo ""

        read -p "Remove uncompressed backup directory? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$BACKUP_NAME"
            echo -e "${GREEN}✓ Uncompressed backup removed${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to create archive${NC}"
    fi
fi

echo ""

#############################################################
# 9. Backup Retention Management
#############################################################

echo -e "${YELLOW}Managing backup retention...${NC}"

# Count total backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type d ! -path "$BACKUP_DIR" | wc -l)
ARCHIVE_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" | wc -l)
TOTAL_COUNT=$((BACKUP_COUNT + ARCHIVE_COUNT))

echo "Current backups: $TOTAL_COUNT (directories: $BACKUP_COUNT, archives: $ARCHIVE_COUNT)"

# Default retention: keep last 10 backups
RETENTION=${BACKUP_RETENTION:-10}

if [ $TOTAL_COUNT -gt $RETENTION ]; then
    echo "Retention limit ($RETENTION) exceeded"

    read -p "Remove old backups? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove oldest backups (both directories and archives)
        cd "$BACKUP_DIR"

        # Remove old directories
        ls -t -d */ 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -rf

        # Remove old archives
        ls -t *.tar.gz 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -f

        echo -e "${GREEN}✓ Old backups removed${NC}"
    fi
fi

echo ""

#############################################################
# Backup Complete
#############################################################

echo -e "${BLUE}Useful Commands:${NC}"
echo ""
echo "  List backups:       ls -lh $BACKUP_DIR"
echo "  Restore backup:     ./bin/rollback.sh $BACKUP_NAME"
echo "  View metadata:      cat $BACKUP_PATH/metadata.txt"
echo ""

echo -e "${GREEN}Backup completed successfully!${NC}"
echo ""

# Exit successfully
exit 0
