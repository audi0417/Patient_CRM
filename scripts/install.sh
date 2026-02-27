#!/bin/bash
#
# Patient CRM On-Premise Installation Script
#
# Prerequisites:
#   - Docker & Docker Compose
#   - Minimum 2GB RAM, 10GB disk space
#

set -e

echo ""
echo "========================================"
echo "  Patient CRM On-Premise Installation"
echo "  Version: ${APP_VERSION:-1.0.0}"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ---- Step 1: Check prerequisites ----
echo "[1/8] Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed${NC}"
  echo "Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi
echo -e "  ${GREEN}Docker: $(docker --version)${NC}"

# Check Docker Compose
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}Error: Docker Compose is not installed${NC}"
  echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
  exit 1
fi
echo -e "  ${GREEN}Docker Compose: $($COMPOSE_CMD version 2>/dev/null || echo 'available')${NC}"

# Check available disk space (need at least 5GB)
AVAILABLE_DISK=$(df -m . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_DISK" -lt 5000 ] 2>/dev/null; then
  echo -e "${YELLOW}Warning: Low disk space (${AVAILABLE_DISK}MB available, recommend 5GB+)${NC}"
fi

echo ""

# ---- Step 2: Configure environment ----
echo "[2/8] Configuring environment..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
  else
    echo -e "${RED}Error: .env.example not found${NC}"
    exit 1
  fi
fi

# ---- Step 3: Generate security keys if not set ----
echo "[3/8] Checking security keys..."

source .env 2>/dev/null || true

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-jwt-secret-here" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  if grep -q "^JWT_SECRET=" .env; then
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  else
    echo "JWT_SECRET=${JWT_SECRET}" >> .env
  fi
  echo -e "  ${GREEN}JWT_SECRET: Generated${NC}"
else
  echo "  JWT_SECRET: Already set"
fi

if [ -z "$ENCRYPTION_KEY" ] || [ "$ENCRYPTION_KEY" = "your-encryption-key-here" ]; then
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  if grep -q "^ENCRYPTION_KEY=" .env; then
    sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env
  else
    echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" >> .env
  fi
  echo -e "  ${GREEN}ENCRYPTION_KEY: Generated${NC}"
else
  echo "  ENCRYPTION_KEY: Already set"
fi

if [ -z "$DATABASE_PASSWORD" ] || [ "$DATABASE_PASSWORD" = "your-database-password" ]; then
  DATABASE_PASSWORD=$(openssl rand -hex 16)
  if grep -q "^DATABASE_PASSWORD=" .env; then
    sed -i.bak "s|^DATABASE_PASSWORD=.*|DATABASE_PASSWORD=${DATABASE_PASSWORD}|" .env
  else
    echo "DATABASE_PASSWORD=${DATABASE_PASSWORD}" >> .env
  fi
  echo -e "  ${GREEN}DATABASE_PASSWORD: Generated${NC}"
else
  echo "  DATABASE_PASSWORD: Already set"
fi

# Clean up backup files from sed
rm -f .env.bak

echo ""

# ---- Step 4: Validate License Key ----
echo "[4/8] Validating License Key..."

source .env 2>/dev/null || true

if [ -z "$LICENSE_KEY" ] || [ "$LICENSE_KEY" = "your-license-key-here" ]; then
  echo -e "${YELLOW}Warning: LICENSE_KEY not set in .env${NC}"
  echo "  Please set your LICENSE_KEY before starting the application."
  echo "  The system will not start without a valid license in on-premise mode."
  echo ""
fi

# ---- Step 5: Set deployment mode ----
echo "[5/8] Setting deployment mode..."

# Ensure DEPLOYMENT_MODE is set to on-premise
if ! grep -q "^DEPLOYMENT_MODE=" .env; then
  echo "DEPLOYMENT_MODE=on-premise" >> .env
fi
sed -i.bak "s|^DEPLOYMENT_MODE=.*|DEPLOYMENT_MODE=on-premise|" .env
rm -f .env.bak
echo "  DEPLOYMENT_MODE=on-premise"

# Ensure DATABASE_TYPE is postgres
if ! grep -q "^DATABASE_TYPE=" .env; then
  echo "DATABASE_TYPE=postgres" >> .env
fi
sed -i.bak "s|^DATABASE_TYPE=.*|DATABASE_TYPE=postgres|" .env
rm -f .env.bak
echo "  DATABASE_TYPE=postgres"

echo ""

# ---- Step 6: Build Docker images ----
echo "[6/8] Building Docker images (this may take a few minutes)..."
$COMPOSE_CMD -f docker-compose.onpremise.yml build --quiet
echo -e "  ${GREEN}Docker images built successfully${NC}"
echo ""

# ---- Step 7: Start services ----
echo "[7/8] Starting services..."
$COMPOSE_CMD -f docker-compose.onpremise.yml up -d
echo -e "  ${GREEN}Services started${NC}"
echo ""

# ---- Step 8: Health check ----
echo "[8/8] Waiting for services to be ready..."

MAX_RETRIES=30
RETRY_INTERVAL=5
HEALTH_URL="http://localhost:3001/api/health-check"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "  ${GREEN}Health check passed${NC}"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo -e "${RED}Services failed to start within expected time${NC}"
    echo "Check logs: $COMPOSE_CMD -f docker-compose.onpremise.yml logs"
    exit 1
  fi

  echo "  Waiting... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo ""
echo "========================================"
echo -e "  ${GREEN}Installation Complete!${NC}"
echo "========================================"
echo ""
echo "  Access URL:  http://localhost (via Nginx)"
echo "  API URL:     http://localhost:3001/api"
echo ""
echo "  Default Login:"
echo "    Username: superadmin"
echo "    Password: (see SUPER_ADMIN_PASSWORD in .env)"
echo ""
echo "  Useful commands:"
echo "    View logs:     $COMPOSE_CMD -f docker-compose.onpremise.yml logs -f"
echo "    Stop services: $COMPOSE_CMD -f docker-compose.onpremise.yml down"
echo "    Restart:       $COMPOSE_CMD -f docker-compose.onpremise.yml restart"
echo "    Backup DB:     $COMPOSE_CMD -f docker-compose.onpremise.yml exec backup /backup.sh"
echo ""
