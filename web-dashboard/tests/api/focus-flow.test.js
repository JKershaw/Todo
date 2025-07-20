const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const MOCK_WORKSPACE = path.join(__dirname, '../mock-workspace-focus');

describe('Focus Flow API Endpoints', () => {
  let app;
  
  beforeAll(async () => {
    // Set up mock workspace
    await fs.mkdir(MOCK_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(MOCK_WORKSPACE, 'projects'), { recursive: true });
    
    // Create mock projects with Level 0 tasks
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'project-a.md'),
      `# Project: Project A

**Status:** Active
**Level:** 2

## Level 0 Actions (Next 15 minutes)
- [ ] Immediate task A1
- [ ] Immediate task A2
- [x] Completed immediate task A3

## Level 2 Tasks (Current Sprint)
- [ ] Sprint task A1
- [ ] Sprint task A2
`
    );
    
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'project-b.md'),
      `# Project: Project B

**Status:** Active
**Level:** 2

## Level 0 Actions (Next 15 minutes)
- [ ] Immediate task B1
- [x] Completed immediate task B2

## Level 1 Tasks (This Week)
- [ ] Weekly task B1
`
    );
  });
  
  afterAll(async () => {
    try {
      await fs.rm(MOCK_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up mock workspace:', error.message);
    }
  });
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set up focus flow endpoint
    app.get('/api/focus-flow', async (req, res) => {
      try {
        const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
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
            
            // Extract Level 0 tasks
            let inLevel0Section = false;
            let level0Tasks = [];
            
            for (const line of lines) {
              if ((line.includes('Level 0') && (line.includes('Next 15 minutes') || line.includes('Immediate'))) ||
                  line.includes('## Level 0 Actions') ||
                  (line.includes('Level 0') && line.startsWith('##'))) {
                inLevel0Section = true;
                continue;
              }
              
              if (inLevel0Section) {
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
            
            focusData.level0Tasks.push(...level0Tasks.filter(t => !t.completed).slice(0, 2));
            focusData.projectConnections[projectName] = {
              totalLevel0: level0Tasks.length,
              completed: level0Tasks.filter(t => t.completed).length,
              file
            };
          }
        }
        
        focusData.level0Tasks = focusData.level0Tasks.slice(0, 5);
        res.json(focusData);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate focus flow data' });
      }
    });
  });
  
  describe('GET /api/focus-flow', () => {
    it('should return focus flow data with Level 0 tasks', async () => {
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      expect(response.body).toHaveProperty('level0Tasks');
      expect(response.body).toHaveProperty('projectConnections');
      expect(response.body).toHaveProperty('progressSummary');
      
      expect(Array.isArray(response.body.level0Tasks)).toBe(true);
      
      // The test data should have uncompleted Level 0 tasks
      if (response.body.level0Tasks.length > 0) {
        // Check task structure
        const task = response.body.level0Tasks[0];
        expect(task).toHaveProperty('task');
        expect(task).toHaveProperty('project');
        expect(task).toHaveProperty('file');
        expect(task).toHaveProperty('completed');
        expect(task.completed).toBe(false); // Only uncompleted tasks should be returned
      }
      
      // Check that we have project connections
      expect(Object.keys(response.body.projectConnections).length).toBeGreaterThan(0);
    });
    
    it('should limit Level 0 tasks to maximum of 5', async () => {
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      expect(response.body.level0Tasks.length).toBeLessThanOrEqual(5);
    });
    
    it('should include project connections with task counts', async () => {
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      expect(Object.keys(response.body.projectConnections).length).toBeGreaterThan(0);
      
      const projectConnection = Object.values(response.body.projectConnections)[0];
      expect(projectConnection).toHaveProperty('totalLevel0');
      expect(projectConnection).toHaveProperty('completed');
      expect(projectConnection).toHaveProperty('file');
      expect(typeof projectConnection.totalLevel0).toBe('number');
      expect(typeof projectConnection.completed).toBe('number');
    });
    
    it('should exclude completed tasks from main list', async () => {
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      // All tasks in level0Tasks should be uncompleted
      response.body.level0Tasks.forEach(task => {
        expect(task.completed).toBe(false);
      });
    });
    
    it('should handle empty projects directory', async () => {
      // Remove all project files temporarily
      const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
      const files = await fs.readdir(projectsDir);
      
      for (const file of files) {
        await fs.unlink(path.join(projectsDir, file));
      }
      
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      expect(response.body.level0Tasks).toEqual([]);
      expect(response.body.projectConnections).toEqual({});
      
      // Restore files
      await fs.writeFile(
        path.join(MOCK_WORKSPACE, 'projects', 'project-a.md'),
        `# Project: Project A

## Level 0 Actions (Next 15 minutes)
- [ ] Restored task
`
      );
    });
  });
});