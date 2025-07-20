#!/bin/bash

# Monitoring Script for Productivity Dashboard
# Provides system health information and monitoring utilities

set -e

PROJECT_NAME="productivity-dashboard"
PORT=${PORT:-3000}

echo "🔍 Productivity Dashboard Monitoring"
echo "=================================="

# Check if PM2 is running the application
if command -v pm2 >/dev/null 2>&1; then
    echo ""
    echo "📊 PM2 Status:"
    pm2 list | grep -E "(id|name|status|cpu|memory)" || echo "  No PM2 processes found"
    
    # Get specific app status if running
    if pm2 list | grep -q "$PROJECT_NAME"; then
        echo ""
        echo "📈 Application Metrics:"
        pm2 show "$PROJECT_NAME" | grep -E "(uptime|restarts|memory|cpu)" || true
    fi
else
    echo "⚠️  PM2 not found"
fi

# Check if port is in use
echo ""
echo "🌐 Network Status:"
if lsof -i ":$PORT" >/dev/null 2>&1; then
    echo "  ✅ Port $PORT is in use"
    lsof -i ":$PORT" | head -2
else
    echo "  ❌ Port $PORT is not in use"
fi

# Check application health
echo ""
echo "💓 Health Check:"
if curl -s -f "http://localhost:$PORT/api/workspace" >/dev/null 2>&1; then
    echo "  ✅ Application is responding"
    
    # Get response time
    RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$PORT/api/workspace")
    echo "  📊 Response time: ${RESPONSE_TIME}s"
else
    echo "  ❌ Application is not responding"
fi

# System resources
echo ""
echo "💻 System Resources:"
echo "  CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "  Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "  Disk: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"

# Log file sizes
echo ""
echo "📝 Log Status:"
if [[ -d "logs" ]]; then
    echo "  Log directory: $(du -sh logs | cut -f1)"
    find logs -name "*.log" -exec echo "    {}: $(du -h {} | cut -f1)" \; 2>/dev/null || echo "    No log files found"
else
    echo "  No logs directory found"
fi

# Recent errors (if logs exist)
if [[ -f "logs/err.log" ]]; then
    ERROR_COUNT=$(tail -100 logs/err.log 2>/dev/null | wc -l)
    if [[ $ERROR_COUNT -gt 0 ]]; then
        echo ""
        echo "⚠️  Recent Errors (last 5):"
        tail -5 logs/err.log 2>/dev/null | sed 's/^/    /' || echo "    No recent errors"
    fi
fi

echo ""
echo "🔧 Quick Actions:"
echo "  View logs:     pm2 logs $PROJECT_NAME"
echo "  Restart app:   pm2 restart $PROJECT_NAME"
echo "  Open monitor:  pm2 monit"
echo "  Run backup:    ./scripts/backup.sh"

# Optional: Check for updates
if [[ -d ".git" ]]; then
    echo ""
    echo "📡 Git Status:"
    BRANCH=$(git branch --show-current)
    COMMIT=$(git rev-parse --short HEAD)
    echo "  Current branch: $BRANCH"
    echo "  Current commit: $COMMIT"
    
    # Check if there are updates available
    git fetch >/dev/null 2>&1 || true
    BEHIND=$(git rev-list --count HEAD..origin/$BRANCH 2>/dev/null || echo "0")
    if [[ $BEHIND -gt 0 ]]; then
        echo "  ⚠️  $BEHIND commits behind origin"
    else
        echo "  ✅ Up to date with origin"
    fi
fi