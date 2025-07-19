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
app.use(express.json());

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

// Plan mode - hierarchical goal structure
app.get('/api/plan-view', async (req, res) => {
  try {
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const planData = {
      goalSections: [],
      projectHierarchy: {}
    };
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(projectsDir, file), 'utf-8');
        const lines = content.split('\n');
        const projectName = lines[0]?.replace('# Project: ', '') || file;
        
        // Extract tasks by level
        const levels = {
          0: [],  // Today
          1: [],  // This week  
          2: [],  // Current projects
          3: [],  // Quarterly
          4: []   // Life goals
        };
        
        let currentLevel = null;
        for (const line of lines) {
          // Detect level sections
          if (line.includes('Level 4') && (line.includes('Life Goal') || line.includes('Annual'))) {
            currentLevel = 4;
            continue;
          } else if (line.includes('Level 3') && (line.includes('Quarterly') || line.includes('Milestones'))) {
            currentLevel = 3;
            continue;
          } else if (line.includes('Level 2') && (line.includes('Projects') || line.includes('Sprint'))) {
            currentLevel = 2;
            continue;
          } else if (line.includes('Level 1') && (line.includes('Week') || line.includes('Daily'))) {
            currentLevel = 1;
            continue;
          } else if (line.includes('Level 0') && (line.includes('Actions') || line.includes('Today'))) {
            currentLevel = 0;
            continue;
          }
          
          // Reset level on new major section
          if (line.startsWith('##') && !line.includes('Level')) {
            currentLevel = null;
          }
          
          // Extract tasks
          if (currentLevel !== null && (line.includes('- [ ]') || line.includes('- [x]'))) {
            const task = line.trim().replace(/- \[[ x]\]\s*/, '');
            const completed = line.includes('- [x]');
            if (task) {
              levels[currentLevel].push({
                task,
                completed,
                project: projectName,
                file
              });
            }
          }
        }
        
        planData.projectHierarchy[projectName] = levels;
      }
    }
    
    res.json(planData);
  } catch (error) {
    console.error('Error generating plan view data:', error);
    res.status(500).json({ error: 'Failed to generate plan view data' });
  }
});

// Reflect mode - momentum and insights
app.get('/api/reflect-data', async (req, res) => {
  try {
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const reflectData = {
      momentumBars: [],
      insights: [],
      completionStats: {}
    };
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(projectsDir, file), 'utf-8');
        const lines = content.split('\n');
        const projectName = lines[0]?.replace('# Project: ', '') || file;
        
        // Count completion stats
        let totalTasks = 0;
        let completedTasks = 0;
        
        for (const line of lines) {
          if (line.includes('- [ ]')) {
            totalTasks++;
          } else if (line.includes('- [x]')) {
            totalTasks++;
            completedTasks++;
          }
        }
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        reflectData.momentumBars.push({
          title: projectName,
          completionRate,
          totalTasks,
          completedTasks,
          description: `${completedTasks}/${totalTasks} tasks completed`
        });
        
        reflectData.completionStats[projectName] = {
          totalTasks,
          completedTasks,
          completionRate
        };
      }
    }
    
    // Add some example insights
    reflectData.insights = [
      {
        title: "This Week's Progress",
        description: `${reflectData.momentumBars.length} active projects with ${reflectData.momentumBars.reduce((acc, bar) => acc + bar.completedTasks, 0)} completed tasks`
      },
      {
        title: "High Momentum Projects", 
        description: reflectData.momentumBars.filter(bar => bar.completionRate > 70).map(bar => bar.title).join(', ') || 'Focus on completing current tasks'
      },
      {
        title: "Areas Needing Attention",
        description: reflectData.momentumBars.filter(bar => bar.completionRate < 30).map(bar => bar.title).join(', ') || 'All projects progressing well'
      }
    ];
    
    res.json(reflectData);
  } catch (error) {
    console.error('Error generating reflect data:', error);
    res.status(500).json({ error: 'Failed to generate reflect data' });
  }
});

// Task completion endpoint
app.post('/api/tasks/complete', async (req, res) => {
  try {
    const { task, project, file } = req.body;
    
    if (!task || !project || !file) {
      return res.status(400).json({ error: 'Missing required fields: task, project, file' });
    }
    
    const filePath = path.join(WORKSPACE_PATH, 'projects', file);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Find and mark the task as completed
    let taskFound = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`- [ ] ${task}`)) {
        lines[i] = lines[i].replace(`- [ ] ${task}`, `- [x] ${task}`);
        taskFound = true;
        break;
      }
    }
    
    if (!taskFound) {
      return res.status(404).json({ error: 'Task not found in file' });
    }
    
    // Write updated content back to file
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    
    console.log(`✅ Task completed: "${task}" in ${project}`);
    
    // Notify all connected clients of the update
    io.emit('task-completed', {
      task,
      project,
      file,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Task marked as completed' });
    
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
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