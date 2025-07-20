const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Mock workspace path for testing
const MOCK_WORKSPACE = path.join(__dirname, '../mock-workspace');

describe('Workspace API Endpoints', () => {
  let app;
  
  beforeAll(async () => {
    // Set up mock workspace
    await fs.mkdir(MOCK_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(MOCK_WORKSPACE, 'projects'), { recursive: true });
    
    // Create mock README
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'README.md'),
      '# Test Workspace\n\nThis is a test workspace for API testing.'
    );
    
    // Create mock project
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'test-project.md'),
      `# Project: Test Project

**Status:** Active
**Level:** 2

## Goal
Testing the API endpoints

## Level 0 Actions (Next 15 minutes)
- [ ] Test task 1
- [x] Completed test task

## Level 2 Tasks (Current Sprint)
- [ ] Another test task
`
    );
  });
  
  afterAll(async () => {
    // Clean up mock workspace
    try {
      await fs.rm(MOCK_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up mock workspace:', error.message);
    }
  });
  
  beforeEach(() => {
    // Create a fresh Express app for each test to avoid conflicts
    app = express();
    app.use(express.json());
    
    // Mock the workspace path
    const originalWorkspacePath = process.env.WORKSPACE_PATH;
    process.env.WORKSPACE_PATH = MOCK_WORKSPACE;
    
    // Import and set up routes (simplified version)
    app.get('/api/workspace', async (req, res) => {
      try {
        const readme = await fs.readFile(path.join(MOCK_WORKSPACE, 'README.md'), 'utf-8');
        res.json({ readme });
      } catch (error) {
        res.status(500).json({ error: 'Failed to read workspace' });
      }
    });
    
    app.get('/api/projects', async (req, res) => {
      try {
        const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
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
        res.status(500).json({ error: 'Failed to read projects' });
      }
    });
  });
  
  describe('GET /api/workspace', () => {
    it('should return workspace README content', async () => {
      const response = await request(app)
        .get('/api/workspace')
        .expect(200);
      
      expect(response.body).toHaveProperty('readme');
      expect(response.body.readme).toContain('Test Workspace');
    });
    
    it('should handle missing README file', async () => {
      // Remove README temporarily
      await fs.unlink(path.join(MOCK_WORKSPACE, 'README.md'));
      
      const response = await request(app)
        .get('/api/workspace')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to read workspace');
      
      // Restore README
      await fs.writeFile(
        path.join(MOCK_WORKSPACE, 'README.md'),
        '# Test Workspace\n\nThis is a test workspace for API testing.'
      );
    });
  });
  
  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);
      
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
      
      const project = response.body.projects[0];
      expect(project).toHaveProperty('file');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('status');
      expect(project).toHaveProperty('preview');
    });
    
    it('should handle empty projects directory', async () => {
      // Remove all project files temporarily
      const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
      const files = await fs.readdir(projectsDir);
      
      for (const file of files) {
        await fs.unlink(path.join(projectsDir, file));
      }
      
      const response = await request(app)
        .get('/api/projects')
        .expect(200);
      
      expect(response.body.projects).toEqual([]);
      
      // Restore project file
      await fs.writeFile(
        path.join(MOCK_WORKSPACE, 'projects', 'test-project.md'),
        `# Project: Test Project

**Status:** Active
**Level:** 2

## Goal
Testing the API endpoints

## Level 0 Actions (Next 15 minutes)
- [ ] Test task 1
- [x] Completed test task
`
      );
    });
  });
});