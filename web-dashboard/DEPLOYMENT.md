# Production Deployment Guide

This guide covers deploying the Productivity Dashboard to production environments.

## Prerequisites

- Node.js 18+ installed
- Git access to the repository
- Proper environment variables configured
- PM2 for process management (optional but recommended)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd productivity-system/web-dashboard
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production values
   ```

3. **Deploy to production:**
   ```bash
   npm run deploy
   ```

## Environment Configuration

### Required Environment Variables

Create `.env.production` with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# AI Service
ANTHROPIC_API_KEY=your_actual_api_key_here

# Security (generate a secure random string)
SESSION_SECRET=your_secure_session_secret

# CORS (set to your domain)
CORS_ORIGIN=https://yourdomain.com
```

### Optional Environment Variables

```bash
# Logging
LOG_LEVEL=warn

# Analytics
ANALYTICS_ENABLED=true

# Workspace path (if different from default)
WORKSPACE_PATH=../workspace
```

## Deployment Methods

### Method 1: Automated Script Deployment (Recommended)

```bash
# Production deployment
npm run deploy

# Staging deployment
npm run deploy:staging
```

The deployment script will:
- Install production dependencies
- Run tests (in staging)
- Start/restart the application with PM2
- Configure log rotation
- Set up system startup scripts

### Method 2: Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
```

### Method 3: Simple Node.js

```bash
# Set environment
export NODE_ENV=production

# Start the application
node server/index.js
```

## Process Management with PM2

### Basic Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs productivity-dashboard

# Restart application
pm2 restart productivity-dashboard

# Stop application
pm2 stop productivity-dashboard

# Monitor resources
pm2 monit
```

### Cluster Mode

The application is configured to run in cluster mode for better performance:

```javascript
// ecosystem.config.js
instances: 'max',  // Uses all available CPU cores
exec_mode: 'cluster'
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Run monitoring dashboard
npm run monitor

# Check application health
curl http://localhost:3000/api/workspace
```

### Log Management

Logs are stored in the `logs/` directory:
- `logs/out.log` - Application output
- `logs/err.log` - Error logs
- `logs/combined.log` - Combined logs

```bash
# View recent logs
npm run logs

# View error logs
tail -f logs/err.log

# View all logs
tail -f logs/combined.log
```

### Backup Strategy

```bash
# Create backup
npm run backup

# Backup to specific directory
./scripts/backup.sh /path/to/backup/directory
```

Backups include:
- Workspace files
- Configuration files
- Environment settings

## Security Considerations

### Environment Security

1. **Never commit `.env.*` files** to version control
2. **Use strong session secrets** (generate with `openssl rand -base64 32`)
3. **Configure CORS** properly for your domain
4. **Use HTTPS** in production
5. **Keep dependencies updated** (`npm audit`)

### File Permissions

```bash
# Secure script permissions
chmod +x scripts/*.sh
chmod 600 .env.production
```

### Firewall Configuration

Ensure only necessary ports are open:
- Port 3000 (or your configured port) for the web server
- Port 22 for SSH (if remote deployment)

## Performance Optimization

### PM2 Configuration

The `ecosystem.config.js` includes performance optimizations:

```javascript
max_memory_restart: '1G',    // Restart if memory exceeds 1GB
instances: 'max',            // Use all CPU cores
exec_mode: 'cluster'         // Cluster mode for load distribution
```

### Node.js Optimizations

```bash
# Set Node.js memory limit (if needed)
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Permission denied:**
   ```bash
   chmod +x scripts/deploy.sh
   ```

3. **Environment variables not loaded:**
   ```bash
   # Verify environment file exists
   ls -la .env.production
   
   # Check PM2 environment
   pm2 show productivity-dashboard
   ```

4. **Application not responding:**
   ```bash
   # Check PM2 status
   pm2 status
   
   # View logs
   pm2 logs productivity-dashboard
   
   # Restart application
   pm2 restart productivity-dashboard
   ```

### Log Analysis

```bash
# Search for errors
grep -i error logs/combined.log | tail -10

# Monitor in real-time
tail -f logs/combined.log | grep -i error
```

## Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart application
npm run pm2:restart
```

### Scheduled Maintenance

Consider setting up cron jobs for:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/web-dashboard && ./scripts/backup.sh

# Weekly log cleanup
0 3 * * 0 cd /path/to/web-dashboard && find logs -name "*.log" -mtime +7 -delete

# Monthly dependency updates
0 4 1 * * cd /path/to/web-dashboard && npm update && npm run pm2:restart
```

## Rollback Strategy

If deployment fails or issues occur:

1. **Stop current application:**
   ```bash
   pm2 stop productivity-dashboard
   ```

2. **Restore from backup:**
   ```bash
   tar -xzf backups/productivity_backup_YYYYMMDD_HHMMSS.tar.gz -C /
   ```

3. **Restart with previous version:**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

## Support and Monitoring

### Health Checks

The application includes health check endpoints:
- `/api/workspace` - Basic health check
- System monitoring via `npm run monitor`

### Performance Monitoring

Monitor these metrics:
- Response times
- Memory usage
- CPU usage
- Error rates
- Uptime

Use PM2's built-in monitoring:
```bash
pm2 monit
```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)