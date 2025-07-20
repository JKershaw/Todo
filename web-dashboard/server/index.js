const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const MarkdownIt = require('markdown-it');
const WebDashboardAIService = require('./ai-service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const md = new MarkdownIt();

// Initialize AI service
const aiService = new WebDashboardAIService();

const PORT = process.env.PORT || 3000;
const WORKSPACE_PATH = path.join(__dirname, '../../workspace');

// Helper function to gather workspace context for AI analysis
async function gatherWorkspaceContext() {
  try {
    const context = [];
    
    // Read README.md
    try {
      const readme = await fs.readFile(path.join(WORKSPACE_PATH, 'README.md'), 'utf-8');
      context.push(`=== WORKSPACE README ===\n${readme}\n`);
    } catch (e) {
      context.push('=== WORKSPACE README ===\n(No README found)\n');
    }
    
    // Read project files
    try {
      const projectsDir = path.join(WORKSPACE_PATH, 'projects');
      const projectFiles = await fs.readdir(projectsDir);
      
      for (const file of projectFiles.slice(0, 5)) { // Limit to 5 projects to avoid token limits
        if (file.endsWith('.md')) {
          const projectContent = await fs.readFile(path.join(projectsDir, file), 'utf-8');
          context.push(`=== PROJECT: ${file} ===\n${projectContent.substring(0, 2000)}\n`); // Limit length
        }
      }
    } catch (e) {
      context.push('=== PROJECTS ===\n(No projects found)\n');
    }
    
    return context.join('\n');
  } catch (error) {
    console.error('Error gathering workspace context:', error);
    return 'Error gathering workspace context';
  }
}

// Serve static files with no-cache headers to prevent browser caching issues
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // Disable caching for HTML, CSS, and JS files to ensure latest version loads
    if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
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

// AI Status Analysis endpoint with real AI integration
app.post('/api/ai/status', async (req, res) => {
  try {
    console.log('🤖 AI Status Analysis requested');
    
    // Gather workspace context for AI analysis
    const workspaceContext = await gatherWorkspaceContext();
    
    // Use real AI service
    const analysis = await aiService.analyzeStatus(workspaceContext);
    const serviceInfo = aiService.getServiceInfo();
    
    console.log(`✅ AI analysis completed using ${serviceInfo.provider}`);
    res.json({
      success: true,
      analysis: analysis,
      aiService: serviceInfo
    });
    
  } catch (error) {
    console.error('Error in AI status analysis:', error);
    res.status(500).json({ error: 'Failed to analyze status' });
  }
});

// AI Coordinate Tasks endpoint with real AI integration
app.post('/api/ai/coordinate', async (req, res) => {
  try {
    console.log('🔗 AI Task Coordination requested');
    
    // Gather workspace context for AI analysis
    const workspaceContext = await gatherWorkspaceContext();
    
    // Use real AI service
    const analysis = await aiService.coordinateTasks(workspaceContext);
    const serviceInfo = aiService.getServiceInfo();
    
    console.log(`✅ AI coordination completed using ${serviceInfo.provider}`);
    res.json({
      success: true,
      analysis: analysis,
      aiService: serviceInfo
    });
    
  } catch (error) {
    console.error('Error in AI coordination analysis:', error);
    res.status(500).json({ error: 'Failed to coordinate tasks' });
  }
});

// Progress Recording endpoint with real AI integration
app.post('/api/ai/save', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    console.log('💾 Progress recording requested:', description);
    
    // Gather workspace context for AI analysis
    const workspaceContext = await gatherWorkspaceContext();
    
    // Use real AI service
    const analysis = await aiService.recordProgress(description, workspaceContext);
    const serviceInfo = aiService.getServiceInfo();
    
    // For now, simulate file update decisions (in a real implementation, this would be user-driven)
    const fileUpdateApplied = analysis.proposed_changes.length > 0 && Math.random() > 0.3;
    
    console.log(`✅ AI progress analysis completed using ${serviceInfo.provider}`);
    res.json({
      success: true,
      analysis: analysis,
      fileUpdateApplied,
      message: fileUpdateApplied ? 
        'Progress recorded and file updates applied' : 
        'Progress recorded, file updates cancelled by user',
      aiService: serviceInfo
    });
    
  } catch (error) {
    console.error('Error in progress recording:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// AI Reflection endpoint with real AI integration
app.post('/api/ai/reflect', async (req, res) => {
  try {
    console.log('✨ AI Reflection requested');
    
    // Gather workspace context for AI analysis
    const workspaceContext = await gatherWorkspaceContext();
    
    // Use real AI service
    const reflection = await aiService.generateReflection(workspaceContext);
    const serviceInfo = aiService.getServiceInfo();
    
    console.log(`✅ AI reflection completed using ${serviceInfo.provider}`);
    res.json({
      success: true,
      reflection: reflection,
      aiService: serviceInfo
    });
    
  } catch (error) {
    console.error('Error in AI reflection:', error);
    res.status(500).json({ error: 'Failed to generate reflection' });
  }
});

// Workspace Initialization endpoint (step 5)
app.post('/api/workspace/init', async (req, res) => {
  try {
    const { directory } = req.body;
    
    if (!directory || directory.trim().length === 0) {
      return res.status(400).json({ error: 'Directory path is required' });
    }
    
    console.log('🏗️ Workspace initialization requested for:', directory);
    
    // For security, only allow initialization within the current workspace parent
    const normalizedDir = path.resolve(directory);
    const allowedParent = path.resolve('/data/data/com.termux/files/home');
    
    if (!normalizedDir.startsWith(allowedParent)) {
      return res.status(403).json({ error: 'Directory must be within allowed parent path' });
    }
    
    // Mock workspace initialization (would normally call CLI init command)
    const mockInitResult = {
      directory: directory,
      created_files: [
        'README.md',
        'plan.md', 
        'projects/',
        '.gitignore'
      ],
      status: 'success',
      message: `Workspace initialized at ${directory}`,
      next_steps: [
        'Create your first project with the project creation interface',
        'Set up AI integration by configuring API keys',
        'Start tracking tasks using the Focus Flow interface'
      ]
    };
    
    console.log('✅ Mock workspace initialization completed');
    res.json({
      success: true,
      result: mockInitResult
    });
    
  } catch (error) {
    console.error('Error in workspace initialization:', error);
    res.status(500).json({ error: 'Failed to initialize workspace' });
  }
});

// Zoom Navigation endpoint (step 5)
app.post('/api/zoom', async (req, res) => {
  try {
    const { direction } = req.body;
    
    if (!direction || !['in', 'out'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "in" or "out"' });
    }
    
    console.log('🔍 Zoom navigation requested:', direction);
    
    // Mock zoom navigation analysis
    const currentLevel = 2; // Assume current focus is Level 2 (Projects)
    const newLevel = direction === 'in' ? Math.max(0, currentLevel - 1) : Math.min(4, currentLevel + 1);
    
    const levelNames = {
      0: "Immediate Actions (Next 15 minutes)",
      1: "Today's Focus (Current day)", 
      2: "Current Projects (Days to weeks)",
      3: "Quarterly Milestones (1-3 months)",
      4: "Life Goals (Years and beyond)"
    };
    
    const mockZoomResult = {
      direction: direction,
      previous_level: currentLevel,
      new_level: newLevel,
      level_name: levelNames[newLevel],
      context_shift: `Zoomed ${direction} from ${levelNames[currentLevel]} to ${levelNames[newLevel]}`,
      recommended_focus: newLevel === 0 ? 
        "Focus on immediate actionable tasks" :
        newLevel === 4 ? 
        "Reflect on long-term vision and life alignment" :
        `Review ${levelNames[newLevel].toLowerCase()}`,
      available_tasks: newLevel <= 2 ? 
        `Use the ${newLevel === 0 ? 'Do' : newLevel === 1 ? 'Plan' : 'Projects'} mode to see relevant tasks` :
        "Use Reflect mode to consider broader goals and milestones"
    };
    
    console.log('✅ Mock zoom navigation completed');
    res.json({
      success: true,
      zoom: mockZoomResult
    });
    
  } catch (error) {
    console.error('Error in zoom navigation:', error);
    res.status(500).json({ error: 'Failed to navigate zoom levels' });
  }
});

// Project Management endpoints (step 4)

// List all projects
app.get('/api/projects/list', async (req, res) => {
  try {
    console.log('📋 Project list requested');
    
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const projectFiles = files.filter(file => file.endsWith('.md'));
    
    const projects = [];
    
    for (const file of projectFiles) {
      const filePath = path.join(projectsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Extract project info
      const projectName = file.replace('.md', '');
      let status = 'Active';
      let level = 2;
      let goal = '';
      
      // Parse project metadata
      let level4Connection = '';
      for (const line of lines) {
        if (line.startsWith('**Status:**')) {
          status = line.replace('**Status:**', '').trim();
        }
        if (line.startsWith('**Level:**')) {
          level = parseInt(line.replace('**Level:**', '').trim()) || 2;
        }
        if (line.startsWith('## Goal')) {
          const goalIndex = lines.indexOf(line);
          if (goalIndex !== -1 && lines[goalIndex + 1]) {
            goal = lines[goalIndex + 1].trim();
          }
        }
        if (line.startsWith('## Level 4 Connection')) {
          const connectionIndex = lines.indexOf(line);
          if (connectionIndex !== -1 && lines[connectionIndex + 1]) {
            level4Connection = lines[connectionIndex + 1].trim();
          }
        }
      }
      
      // Count tasks by level
      let totalTasks = 0;
      let completedTasks = 0;
      let level0Count = 0;
      let level1Count = 0;
      let currentLevel = null;
      
      for (const line of lines) {
        // Track current section level
        if (line.startsWith('## Level 0')) {
          currentLevel = 0;
        } else if (line.startsWith('## Level 1')) {
          currentLevel = 1;
        } else if (line.startsWith('## Level 2')) {
          currentLevel = 2;
        }
        
        // Count tasks
        if (line.includes('- [ ]')) {
          totalTasks++;
          if (currentLevel === 0) level0Count++;
          if (currentLevel === 1) level1Count++;
        }
        if (line.includes('- [x]')) {
          totalTasks++;
          completedTasks++;
        }
      }
      
      projects.push({
        name: projectName,
        displayName: projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status,
        level,
        goal: goal || 'No goal specified',
        level4Connection: level4Connection || null,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        level0Count,
        level1Count,
        file
      });
    }
    
    console.log(`✅ Found ${projects.length} projects`);
    res.json({ success: true, projects });
    
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Add task to project (step 6)
app.post('/api/projects/:projectName/tasks', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { task, level } = req.body;
    
    if (!task || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task description is required' });
    }
    
    if (level === undefined || level === null || ![0, 1, 2, 3, 4].includes(parseInt(level))) {
      return res.status(400).json({ error: 'Valid task level (0-4) is required' });
    }
    
    console.log(`📝 Adding task to project ${projectName}:`, task);
    
    const projectFile = `${projectName}.md`;
    const projectPath = path.join(WORKSPACE_PATH, 'projects', projectFile);
    
    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (e) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Read project content
    const content = await fs.readFile(projectPath, 'utf-8');
    const lines = content.split('\\n');
    
    // Find the appropriate level section
    const levelNames = {
      0: 'Level 0 Actions (Next 15 minutes)',
      1: 'Level 1 Tasks (This Week)', 
      2: 'Level 2 Tasks (Current Sprint)',
      3: 'Level 3 Milestones (Quarterly)',
      4: 'Level 4 Connection (Life Goal)'
    };
    
    const targetSection = levelNames[parseInt(level)];
    let insertIndex = -1;
    let foundSection = false;
    
    // Find the target section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(targetSection) || 
          (lines[i].startsWith('## Level') && lines[i].includes(`Level ${level}`))) {
        foundSection = true;
        continue;
      }
      
      if (foundSection) {
        // Look for the end of this section (next ## header or end of file)
        if (lines[i].startsWith('## ') && !lines[i].includes(`Level ${level}`)) {
          insertIndex = i;
          break;
        }
      }
    }
    
    // If no next section found, add at end of section
    if (foundSection && insertIndex === -1) {
      insertIndex = lines.length;
    }
    
    if (!foundSection) {
      return res.status(400).json({ error: `Level ${level} section not found in project` });
    }
    
    // Insert the new task
    const newTaskLine = `- [ ] ${task}`;
    lines.splice(insertIndex, 0, newTaskLine);
    
    // Write back to file
    await fs.writeFile(projectPath, lines.join('\\n'), 'utf-8');
    
    console.log(`✅ Task added to ${projectName} at Level ${level}`);
    res.json({
      success: true,
      message: 'Task added successfully',
      task: {
        description: task,
        level: parseInt(level),
        project: projectName,
        completed: false
      }
    });
    
  } catch (error) {
    console.error('Error adding task to project:', error);
    res.status(500).json({ error: 'Failed to add task to project' });
  }
});

// Get project details with tasks (step 6)
app.get('/api/projects/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`📋 Getting project details for: ${projectName}`);
    
    const projectFile = `${projectName}.md`;
    const projectPath = path.join(WORKSPACE_PATH, 'projects', projectFile);
    
    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (e) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const content = await fs.readFile(projectPath, 'utf-8');
    const lines = content.split('\\n');
    
    // Parse project details
    let projectDetails = {
      name: projectName,
      displayName: projectName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
      status: 'Active',
      level: 2,
      goal: '',
      tasks: {
        0: [], 1: [], 2: [], 3: [], 4: []
      },
      totalTasks: 0,
      completedTasks: 0
    };
    
    // Extract project metadata and tasks
    let currentLevel = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract metadata
      if (line.startsWith('**Status:**')) {
        projectDetails.status = line.replace('**Status:**', '').trim();
      }
      if (line.startsWith('**Level:**')) {
        projectDetails.level = parseInt(line.replace('**Level:**', '').trim()) || 2;
      }
      if (line.startsWith('## Goal')) {
        const goalIndex = i;
        if (lines[goalIndex + 1]) {
          projectDetails.goal = lines[goalIndex + 1].trim();
        }
      }
      
      // Detect level sections
      if (line.includes('Level 4') && (line.includes('Life Goal') || line.includes('Connection'))) {
        currentLevel = 4;
        continue;
      } else if (line.includes('Level 3') && (line.includes('Quarterly') || line.includes('Milestones'))) {
        currentLevel = 3;
        continue;
      } else if (line.includes('Level 2') && (line.includes('Projects') || line.includes('Sprint') || line.includes('Tasks'))) {
        currentLevel = 2;
        continue;
      } else if (line.includes('Level 1') && (line.includes('Week') || line.includes('Tasks'))) {
        currentLevel = 1;
        continue;
      } else if (line.includes('Level 0') && (line.includes('Actions') || line.includes('minutes'))) {
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
          projectDetails.tasks[currentLevel].push({
            description: task,
            completed,
            level: currentLevel
          });
          projectDetails.totalTasks++;
          if (completed) projectDetails.completedTasks++;
        }
      }
    }
    
    projectDetails.completionRate = projectDetails.totalTasks > 0 ? 
      Math.round((projectDetails.completedTasks / projectDetails.totalTasks) * 100) : 0;
    
    console.log(`✅ Project details loaded for ${projectName}`);
    res.json({
      success: true,
      project: projectDetails
    });
    
  } catch (error) {
    console.error('Error getting project details:', error);
    res.status(500).json({ error: 'Failed to get project details' });
  }
});

// Create new project  
app.post('/api/projects/create', async (req, res) => {
  try {
    const { name, goal, level } = req.body;
    
    if (!name || !goal) {
      return res.status(400).json({ error: 'Project name and goal are required' });
    }
    
    console.log('📋 Creating new project:', name);
    
    const projectFileName = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const projectPath = path.join(WORKSPACE_PATH, 'projects', projectFileName);
    
    // Check if project already exists
    try {
      await fs.access(projectPath);
      return res.status(400).json({ error: 'Project already exists' });
    } catch (e) {
      // Project doesn't exist, continue
    }
    
    const projectTemplate = `# Project: ${name}

**Status:** Active  
**Level:** ${level || 2}

## Goal
${goal}

## Level 4 Connection (Life Goal)
Connect this project to your broader life vision and long-term objectives.

## Level 3 Milestones (Quarterly)
- [ ] Major milestone 1
- [ ] Major milestone 2
- [ ] Major milestone 3

## Level 2 Tasks (Current Sprint)
- [ ] Break down project into specific deliverables
- [ ] Set up necessary tools and resources
- [ ] Define success criteria

## Level 1 Tasks (This Week)
- [ ] First concrete step
- [ ] Research and planning tasks
- [ ] Initial implementation

## Level 0 Actions (Next 15 minutes)
- [ ] Quick actionable task
- [ ] Review project scope
- [ ] Set up workspace/files

## Completed
- [x] Project created and structured

## Notes
Add project notes, reflections, and important information here.

## Resources
- Links to relevant documentation
- Contact information for stakeholders
- Reference materials
`;

    await fs.writeFile(projectPath, projectTemplate, 'utf-8');
    
    console.log(`✅ Project created: ${projectFileName}`);
    res.json({ 
      success: true, 
      message: 'Project created successfully',
      project: {
        name: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        displayName: name,
        file: projectFileName
      }
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
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