#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');

const command = process.argv[2];

function findServerProcess() {
  return new Promise((resolve) => {
    exec('ps aux | grep "node.*server/index.js" | grep -v grep', (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
        return;
      }
      
      const lines = stdout.trim().split('\n');
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parts[1],
          line: line
        };
      });
      
      resolve(processes[0] || null);
    });
  });
}

async function startServer() {
  const existing = await findServerProcess();
  if (existing) {
    console.log('🔴 Server already running (PID:', existing.pid + ')');
    console.log('Use "npm run server:stop" to stop it first');
    return;
  }

  console.log('🟢 Starting productivity dashboard server...');
  const serverPath = path.join(__dirname, '../server/index.js');
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    detached: true
  });
  
  child.unref();
  console.log('🚀 Server started with PID:', child.pid);
}

async function stopServer() {
  const existing = await findServerProcess();
  if (!existing) {
    console.log('🔴 No server process found');
    return;
  }

  console.log('🛑 Stopping server (PID:', existing.pid + ')...');
  
  // Try graceful shutdown first
  exec(`kill -SIGINT ${existing.pid}`, (error) => {
    if (error) {
      console.log('⚠️  Graceful shutdown failed, force killing...');
      exec(`kill -9 ${existing.pid}`, (killError) => {
        if (killError) {
          console.error('❌ Failed to kill process:', killError.message);
        } else {
          console.log('✅ Server force stopped');
        }
      });
    } else {
      // Wait a moment to see if it shut down gracefully
      setTimeout(async () => {
        const stillRunning = await findServerProcess();
        if (stillRunning) {
          console.log('⚠️  Graceful shutdown timed out, force killing...');
          exec(`kill -9 ${existing.pid}`);
        } else {
          console.log('✅ Server stopped gracefully');
        }
      }, 2000);
    }
  });
}

async function restartServer() {
  console.log('🔄 Restarting server...');
  await stopServer();
  
  // Wait for shutdown
  setTimeout(async () => {
    await startServer();
  }, 3000);
}

async function statusServer() {
  const existing = await findServerProcess();
  if (existing) {
    console.log('🟢 Server running (PID:', existing.pid + ')');
    console.log('📍 Dashboard: http://localhost:3000');
  } else {
    console.log('🔴 Server not running');
  }
}

switch (command) {
  case 'start':
    startServer();
    break;
  case 'stop':
    stopServer();
    break;
  case 'restart':
    restartServer();
    break;
  case 'status':
    statusServer();
    break;
  default:
    console.log('Productivity Dashboard Server Control');
    console.log('Usage: node scripts/server-control.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  start   - Start the dashboard server');
    console.log('  stop    - Stop the dashboard server');
    console.log('  restart - Restart the dashboard server');
    console.log('  status  - Check server status');
    process.exit(1);
}