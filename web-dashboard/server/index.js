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
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down dashboard server...');
  watcher.close();
  server.close(() => {
    console.log('✅ Dashboard server closed');
    process.exit(0);
  });
});