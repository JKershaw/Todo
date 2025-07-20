// PM2 Ecosystem Configuration for Production Deployment

module.exports = {
  apps: [{
    name: 'productivity-dashboard',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    // Production optimizations
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    
    // Auto-restart configuration
    watch: false, // Set to true in development if needed
    ignore_watch: [
      'node_modules',
      'logs',
      'tests',
      'coverage'
    ],
    
    // Health monitoring
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment-specific settings
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001,
      HOST: '0.0.0.0'
    }
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/productivity-system.git',
      path: '/var/www/productivity-dashboard',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/productivity-system.git',
      path: '/var/www/productivity-dashboard-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};