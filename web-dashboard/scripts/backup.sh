#!/bin/bash

# Backup Script for Productivity Dashboard
# Creates backups of workspace and configuration files

set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="productivity_backup_$TIMESTAMP"

echo "💾 Creating backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup archive
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

echo "📁 Backing up workspace and configuration..."

# Include workspace and important configuration files
tar -czf "$BACKUP_PATH" \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='coverage' \
    --exclude='.git' \
    --exclude='backups' \
    -C .. \
    workspace \
    web-dashboard/.env* \
    web-dashboard/ecosystem.config.js \
    .env 2>/dev/null || true

echo "✅ Backup created: $BACKUP_PATH"

# Display backup size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"

# Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t productivity_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f || true
cd - > /dev/null

echo "🔄 Available backups:"
ls -lh "$BACKUP_DIR"/productivity_backup_*.tar.gz 2>/dev/null || echo "  No previous backups found"

echo ""
echo "📋 To restore from backup:"
echo "  tar -xzf $BACKUP_PATH -C /"