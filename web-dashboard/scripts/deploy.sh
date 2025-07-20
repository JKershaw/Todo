#!/bin/bash

# Production Deployment Script for Productivity Dashboard
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="productivity-dashboard"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    echo "❌ Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

# Check if required commands exist
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Load environment variables
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo "📋 Loading environment configuration for $ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    echo "⚠️  No .env.$ENVIRONMENT file found, using defaults"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run tests in staging
if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo "🧪 Running tests..."
    npm test
fi

# Create logs directory
mkdir -p logs

# Stop existing process if running
if command -v pm2 >/dev/null 2>&1; then
    echo "🛑 Stopping existing PM2 process..."
    pm2 stop $PROJECT_NAME 2>/dev/null || true
    pm2 delete $PROJECT_NAME 2>/dev/null || true
else
    echo "⚠️  PM2 not found, installing globally..."
    npm install -g pm2
fi

# Start the application with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js --env $ENVIRONMENT

# Save PM2 configuration
pm2 save

# Generate startup script (for system restart persistence)
echo "💾 Setting up PM2 startup script..."
pm2 startup || true

# Display status
echo "📊 Application status:"
pm2 status

# Display logs location
echo "📝 Logs are available at: $(pwd)/logs/"

echo "✅ Deployment complete!"
echo "🌐 Dashboard should be running on http://localhost:${PORT:-3000}"

# Optional: Set up log rotation
if command -v logrotate >/dev/null 2>&1; then
    echo "🔄 Setting up log rotation..."
    pm2 install pm2-logrotate
fi

echo ""
echo "🔧 Useful commands:"
echo "  View logs: pm2 logs $PROJECT_NAME"
echo "  Restart:   pm2 restart $PROJECT_NAME"
echo "  Stop:      pm2 stop $PROJECT_NAME"
echo "  Monitor:   pm2 monit"