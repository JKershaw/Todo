const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const MarkdownIt = require('markdown-it');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const md = new MarkdownIt();

const PORT = process.env.PORT || 3000;
const WORKSPACE_PATH = path.join(__dirname, '../../workspace');

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/workspace', async (req, res) => {
  try {
    const readme = await fs.readFile(path.join(WORKSPACE_PATH, 'README.md'), 'utf-8');
    res.json({ readme });
  } catch (error) {
    console.error('Error reading workspace:', error);
    res.status(500).json({ error: 'Failed to read workspace' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const projects = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(projectsDir, file), 'utf-8');
        const lines = content.split('\\n').slice(0, 10);
        const name = lines[0]?.replace('# Project: ', '') || file;
        const status = lines.find(l => l.startsWith('**Status:**'))?.replace('**Status:**', '').trim() || 'Unknown';
        
        projects.push({
          file,
          name,
          status,
          preview: lines.slice(0, 5).join('\\n')
        });
      }
    }
    
    res.json({ projects });
  } catch (error) {
    console.error('Error reading projects:', error);
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

app.get('/api/focus-flow', async (req, res) => {
  try {
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const focusData = {
      level0Tasks: [],
      projectConnections: {},
      progressSummary: {}
    };
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(projectsDir, file), 'utf-8');
        const lines = content.split('\\n');
        const projectName = lines[0]?.replace('# Project: ', '') || file;
        
        // Extract Level 0 tasks (next 15 minutes)
        let inLevel0Section = false;
        let level0Tasks = [];
        
        for (const line of lines) {
          // Look for Level 0 section headers - various formats
          if ((line.includes('Level 0') && (line.includes('Next 15 minutes') || line.includes('Immediate'))) ||
              line.includes('## Level 0 Actions') ||
              (line.includes('Level 0') && line.startsWith('##'))) {
            inLevel0Section = true;
            continue;
          }
          
          if (inLevel0Section) {
            // End section on next major header (but not subheadings)
            if (line.startsWith('##') && 
                !line.includes('Level 0') && 
                !line.startsWith('###')) {
              break;
            }
            
            if (line.trim().startsWith('- [ ]')) {
              const task = line.trim().replace('- [ ]', '').trim();
              if (task) {
                level0Tasks.push({
                  task,
                  project: projectName,
                  file,
                  completed: false
                });
              }
            } else if (line.trim().startsWith('- [x]')) {
              const task = line.trim().replace('- [x]', '').trim();
              if (task) {
                level0Tasks.push({
                  task,
                  project: projectName,
                  file,
                  completed: true
                });
              }
            }
          }
        }
        
        // Add to focus data
        focusData.level0Tasks.push(...level0Tasks.filter(t => !t.completed).slice(0, 2)); // Max 2 per project
        focusData.projectConnections[projectName] = {
          totalLevel0: level0Tasks.length,
          completed: level0Tasks.filter(t => t.completed).length,
          file
        };
      }
    }
    
    // Limit to top 5 Level 0 tasks as per original vision
    focusData.level0Tasks = focusData.level0Tasks.slice(0, 5);
    
    res.json(focusData);
  } catch (error) {
    console.error('Error generating focus flow data:', error);
    res.status(500).json({ error: 'Failed to generate focus flow data' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('User connected to dashboard');
  
  socket.emit('connected', { message: 'Connected to Productivity Dashboard' });
  
  socket.on('disconnect', () => {
    console.log('User disconnected from dashboard');
  });
});

// File system watching
const watcher = chokidar.watch(WORKSPACE_PATH, {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (filePath) => {
  console.log('File changed:', filePath);
  io.emit('workspace-updated', {
    type: 'file-changed',
    file: filePath.replace(WORKSPACE_PATH, ''),
    timestamp: new Date().toISOString()
  });
});

watcher.on('add', (filePath) => {
  console.log('File added:', filePath);
  io.emit('workspace-updated', {
    type: 'file-added',
    file: filePath.replace(WORKSPACE_PATH, ''),
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Productivity Dashboard running on http://localhost:${PORT}`);
  console.log(`📁 Watching workspace: ${WORKSPACE_PATH}`);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\\n👋 Received ${signal}, shutting down dashboard server...`);
  watcher.close();
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error closing server:', err);
      process.exit(1);
    }
    console.log('✅ Dashboard server closed cleanly');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️  Forcing exit after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});