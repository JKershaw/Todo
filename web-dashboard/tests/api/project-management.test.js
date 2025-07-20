const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const MOCK_WORKSPACE = path.join(__dirname, '../mock-workspace-projects');

describe('Project Management API Endpoints', () => {
  let app;
  
  beforeAll(async () => {
    // Set up mock workspace
    await fs.mkdir(MOCK_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(MOCK_WORKSPACE, 'projects'), { recursive: true });
  });
  
  afterAll(async () => {
    try {
      await fs.rm(MOCK_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up mock workspace:', error.message);
    }
  });
  
  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    // Clean up any existing project files
    try {
      const files = await fs.readdir(path.join(MOCK_WORKSPACE, 'projects'));
      for (const file of files) {
        await fs.unlink(path.join(MOCK_WORKSPACE, 'projects', file));
      }
    } catch (error) {
      // Directory might be empty
    }
    
    // Create sample project for testing
    const sampleProject = `# Project: Sample Project

**Status:** Active
**Level:** 2
**Started:** 2024-01-01
**Target:** (Set target date)

## Goal
This is a sample project for testing

## Level 4 Connection (Life Goal)
Connect to life goals

## Level 3 Milestones (Quarterly)
- [ ] Milestone 1
- [x] Completed milestone

## Level 2 Tasks (Current Sprint)
- [ ] Task 1
- [ ] Task 2

## Level 1 Tasks (This Week)
- [ ] Weekly task

## Level 0 Actions (Next 15 minutes)
- [ ] Immediate action

## Completed
- [x] Project created

## Notes
Sample notes

## Resources
- Sample resource link
`;
    
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'sample-project.md'),
      sampleProject
    );
    
    // Set up project endpoints
    app.get('/api/projects/list', async (req, res) => {
      try {
        const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
        const files = await fs.readdir(projectsDir);
        const projectFiles = files.filter(file => file.endsWith('.md'));
        
        const projects = [];
        
        for (const file of projectFiles) {
          const filePath = path.join(projectsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\\n');
          
          const projectName = file.replace('.md', '');
          let status = 'Active';
          let level = 2;
          let goal = '';
          
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
          }
          
          let totalTasks = 0;
          let completedTasks = 0;
          
          for (const line of lines) {
            if (line.includes('- [ ]')) totalTasks++;
            if (line.includes('- [x]')) {
              totalTasks++;
              completedTasks++;
            }
          }
          
          projects.push({
            name: projectName,
            displayName: projectName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
            status,
            level,
            goal: goal || 'No goal specified',
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            file
          });
        }
        
        res.json({ success: true, projects });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list projects' });
      }
    });
    
    app.post('/api/projects/create', async (req, res) => {
      try {
        const { name, goal, level } = req.body;
        
        if (!name || !goal) {
          return res.status(400).json({ error: 'Project name and goal are required' });
        }
        
        const projectFileName = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
        const projectPath = path.join(MOCK_WORKSPACE, 'projects', projectFileName);
        
        try {
          await fs.access(projectPath);
          return res.status(400).json({ error: 'Project already exists' });
        } catch (e) {
          // Project doesn't exist, continue
        }
        
        const projectTemplate = `# Project: ${name}

**Status:** Active  
**Level:** ${level || 2}  
**Started:** ${new Date().toISOString().split('T')[0]}  
**Target:** (Set target date)

## Goal
${goal}

## Level 4 Connection (Life Goal)
Connect this project to your broader life vision and long-term objectives.

## Level 3 Milestones (Quarterly)
- [ ] Major milestone 1
- [ ] Major milestone 2

## Level 2 Tasks (Current Sprint)
- [ ] Break down project into specific deliverables
- [ ] Set up necessary tools and resources

## Level 1 Tasks (This Week)
- [ ] First concrete step

## Level 0 Actions (Next 15 minutes)
- [ ] Quick actionable task

## Completed
- [x] Project created and structured

## Notes
Add project notes here.

## Resources
- Links to relevant documentation
`;

        await fs.writeFile(projectPath, projectTemplate, 'utf-8');
        
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
        res.status(500).json({ error: 'Failed to create project' });
      }
    });
    
    app.get('/api/projects/:projectName', async (req, res) => {
      try {
        const { projectName } = req.params;
        const projectFile = `${projectName}.md`;
        const projectPath = path.join(MOCK_WORKSPACE, 'projects', projectFile);
        
        try {
          await fs.access(projectPath);
        } catch (e) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        const content = await fs.readFile(projectPath, 'utf-8');
        const lines = content.split('\\n');
        
        let projectDetails = {
          name: projectName,
          displayName: projectName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
          status: 'Active',
          level: 2,
          goal: '',
          tasks: { 0: [], 1: [], 2: [], 3: [], 4: [] },
          totalTasks: 0,
          completedTasks: 0
        };
        
        let currentLevel = null;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith('**Status:**')) {
            projectDetails.status = line.replace('**Status:**', '').trim();
          }
          if (line.startsWith('**Level:**')) {
            projectDetails.level = parseInt(line.replace('**Level:**', '').trim()) || 2;
          }
          if (line.startsWith('## Goal')) {
            if (lines[i + 1]) {
              projectDetails.goal = lines[i + 1].trim();
            }
          }
          
          // Detect level sections
          if (line.includes('Level 4')) currentLevel = 4;
          else if (line.includes('Level 3')) currentLevel = 3;
          else if (line.includes('Level 2')) currentLevel = 2;
          else if (line.includes('Level 1')) currentLevel = 1;
          else if (line.includes('Level 0')) currentLevel = 0;
          else if (line.startsWith('##') && !line.includes('Level')) currentLevel = null;
          
          if (currentLevel !== null && (line.includes('- [ ]') || line.includes('- [x]'))) {
            const task = line.trim().replace(/- \\[[ x]\\]\\s*/, '');
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
        
        res.json({
          success: true,
          project: projectDetails
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get project details' });
      }
    });
  });
  
  describe('GET /api/projects/list', () => {
    it('should return list of projects', async () => {
      const response = await request(app)
        .get('/api/projects/list')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
      
      const project = response.body.projects[0];
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('displayName');
      expect(project).toHaveProperty('status');
      expect(project).toHaveProperty('level');
      expect(project).toHaveProperty('goal');
      expect(project).toHaveProperty('totalTasks');
      expect(project).toHaveProperty('completedTasks');
      expect(project).toHaveProperty('completionRate');
    });
    
    it('should return empty list when no projects exist', async () => {
      // Remove all project files
      const files = await fs.readdir(path.join(MOCK_WORKSPACE, 'projects'));
      for (const file of files) {
        await fs.unlink(path.join(MOCK_WORKSPACE, 'projects', file));
      }
      
      const response = await request(app)
        .get('/api/projects/list')
        .expect(200);
      
      expect(response.body.projects).toEqual([]);
    });
  });
  
  describe('POST /api/projects/create', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'New Test Project',
        goal: 'Testing project creation',
        level: 2
      };
      
      const response = await request(app)
        .post('/api/projects/create')
        .send(projectData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Project created successfully');
      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toHaveProperty('name', 'new-test-project');
      expect(response.body.project).toHaveProperty('displayName', 'New Test Project');
      
      // Verify file was created
      const projectPath = path.join(MOCK_WORKSPACE, 'projects', 'new-test-project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('# Project: New Test Project');
      expect(content).toContain('Testing project creation');
    });
    
    it('should require project name and goal', async () => {
      const testCases = [
        { goal: 'Test goal' }, // missing name
        { name: 'Test Project' }, // missing goal
        {} // missing both
      ];
      
      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/projects/create')
          .send(testCase)
          .expect(400);
        
        expect(response.body).toHaveProperty('error', 'Project name and goal are required');
      }
    });
    
    it('should prevent duplicate project creation', async () => {
      const projectData = {
        name: 'Duplicate Project',
        goal: 'Testing duplicates'
      };
      
      // Create first project
      await request(app)
        .post('/api/projects/create')
        .send(projectData)
        .expect(200);
      
      // Try to create duplicate
      const response = await request(app)
        .post('/api/projects/create')
        .send(projectData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Project already exists');
    });
    
    it('should sanitize project name for filename', async () => {
      const projectData = {
        name: 'Project With Spaces & Special! Characters',
        goal: 'Testing name sanitization'
      };
      
      const response = await request(app)
        .post('/api/projects/create')
        .send(projectData)
        .expect(200);
      
      expect(response.body.project.name).toBe('project-with-spaces---special--characters');
      expect(response.body.project.file).toBe('project-with-spaces---special--characters.md');
    });
  });
  
  describe('GET /api/projects/:projectName', () => {
    it('should return project details', async () => {
      const response = await request(app)
        .get('/api/projects/sample-project')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('project');
      
      const project = response.body.project;
      expect(project).toHaveProperty('name', 'sample-project');
      expect(project).toHaveProperty('status');
      expect(project).toHaveProperty('level');
      expect(project).toHaveProperty('goal');
      expect(project).toHaveProperty('tasks');
      expect(project).toHaveProperty('totalTasks');
      expect(project).toHaveProperty('completedTasks');
      expect(project).toHaveProperty('completionRate');
      
      // Check task structure
      expect(project.tasks).toHaveProperty('0');
      expect(project.tasks).toHaveProperty('1');
      expect(project.tasks).toHaveProperty('2');
      expect(project.tasks).toHaveProperty('3');
      expect(project.tasks).toHaveProperty('4');
    });
    
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-project')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Project not found');
    });
  });
});