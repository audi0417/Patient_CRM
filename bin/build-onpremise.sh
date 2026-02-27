#!/bin/bash
#
# Build On-Premise Installation Package
#
# Creates a distributable tarball for on-premise deployment.
#
# Usage: ./bin/build-onpremise.sh [version]
#

set -e

VERSION="${1:-1.0.0}"
OUTPUT_DIR="./dist/onpremise"
PACKAGE_NAME="patient-crm-v${VERSION}-onpremise"

echo ""
echo "========================================"
echo "  Building On-Premise Package v${VERSION}"
echo "========================================"
echo ""

# ---- Clean previous build ----
echo "[1/7] Cleaning previous build..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# ---- Build frontend ----
echo "[2/7] Building frontend..."
npm run build
cp -r dist/assets "$OUTPUT_DIR/public/" 2>/dev/null || true
cp dist/index.html "$OUTPUT_DIR/public/" 2>/dev/null || true

# ---- Copy server code ----
echo "[3/7] Copying server code..."
mkdir -p "$OUTPUT_DIR/server"
cp -r server/ "$OUTPUT_DIR/server/"

# ---- Copy configs ----
echo "[4/7] Copying configuration files..."
mkdir -p "$OUTPUT_DIR/config"
mkdir -p "$OUTPUT_DIR/scripts"
mkdir -p "$OUTPUT_DIR/bin"

cp docker-compose.onpremise.yml "$OUTPUT_DIR/docker-compose.yml"
cp Dockerfile "$OUTPUT_DIR/"
cp .env.example "$OUTPUT_DIR/"
cp package.json "$OUTPUT_DIR/"
cp package-lock.json "$OUTPUT_DIR/" 2>/dev/null || true

# Config files
cp config/license-public.pem "$OUTPUT_DIR/config/" 2>/dev/null || true
cp config/nginx.conf "$OUTPUT_DIR/config/" 2>/dev/null || true

# Scripts
cp scripts/install.sh "$OUTPUT_DIR/scripts/"
cp scripts/update.sh "$OUTPUT_DIR/scripts/"
cp scripts/rollback.sh "$OUTPUT_DIR/scripts/"
cp scripts/backup.sh "$OUTPUT_DIR/scripts/"
chmod +x "$OUTPUT_DIR/scripts/"*.sh

# CLI tools
cp bin/migrate.js "$OUTPUT_DIR/bin/"
cp bin/generate-license.js "$OUTPUT_DIR/bin/" 2>/dev/null || true
cp bin/generate-keypair.js "$OUTPUT_DIR/bin/" 2>/dev/null || true

# ---- Copy database files ----
echo "[5/7] Copying database files..."
mkdir -p "$OUTPUT_DIR/database"
cp server/database/rls-policies.sql "$OUTPUT_DIR/database/" 2>/dev/null || true

# ---- Generate checksums ----
echo "[6/7] Generating checksums..."
cd "$OUTPUT_DIR"
find . -type f -not -name "checksums.txt" -exec shasum -a 256 {} \; > checksums.txt
cd - > /dev/null

# ---- Create tarball ----
echo "[7/7] Creating tarball..."
tar -czf "${PACKAGE_NAME}.tar.gz" -C ./dist onpremise/

FILESIZE=$(du -h "${PACKAGE_NAME}.tar.gz" | cut -f1)

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "  Package: ${PACKAGE_NAME}.tar.gz (${FILESIZE})"
echo "  Contents: ${OUTPUT_DIR}/"
echo ""
