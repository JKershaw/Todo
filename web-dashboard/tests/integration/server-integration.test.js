const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Import the actual server for integration testing
// We need to mock the workspace path to avoid affecting real workspace
const ORIGINAL_WORKSPACE = process.env.WORKSPACE_PATH;
const TEST_WORKSPACE = path.join(__dirname, '../mock-workspace-integration');

describe('Server Integration Tests', () => {
  let server;
  let app;
  
  beforeAll(async () => {
    // Set up test workspace
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(TEST_WORKSPACE, 'projects'), { recursive: true });
    
    // Create test files
    await fs.writeFile(
      path.join(TEST_WORKSPACE, 'README.md'),
      '# Integration Test Workspace\n\nWorkspace for integration testing.'
    );
    
    await fs.writeFile(
      path.join(TEST_WORKSPACE, 'projects', 'integration-test.md'),
      `# Project: Integration Test

**Status:** Active
**Level:** 2

## Goal
Integration testing

## Level 0 Actions (Next 15 minutes)
- [ ] Integration test task
- [x] Completed integration task

## Level 2 Tasks (Current Sprint)
- [ ] Sprint integration task
`
    );
    
    // Override workspace path for testing
    process.env.WORKSPACE_PATH = TEST_WORKSPACE;
    
    // Import server after setting environment
    delete require.cache[require.resolve('../../server/index.js')];
    app = require('../../server/index.js');
  });
  
  afterAll(async () => {
    // Clean up
    try {
      if (server && server.close) {
        server.close();
      }
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
    
    // Restore original workspace path
    if (ORIGINAL_WORKSPACE) {
      process.env.WORKSPACE_PATH = ORIGINAL_WORKSPACE;
    } else {
      delete process.env.WORKSPACE_PATH;
    }
  });
  
  describe('Basic Server Functionality', () => {
    it('should serve static files', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Focus');
    });
    
    it('should handle workspace API', async () => {
      const response = await request(app)
        .get('/api/workspace')
        .expect(200);
      
      expect(response.body).toHaveProperty('readme');
      expect(response.body.readme).toContain('Integration Test Workspace');
    });
    
    it('should handle projects API', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);
      
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });
    
    it('should handle focus flow API', async () => {
      const response = await request(app)
        .get('/api/focus-flow')
        .expect(200);
      
      expect(response.body).toHaveProperty('level0Tasks');
      expect(response.body).toHaveProperty('projectConnections');
    });
  });
  
  describe('Task Management Integration', () => {
    it('should complete tasks through API', async () => {
      const taskData = {
        task: 'Integration test task',
        project: 'Integration Test',
        file: 'integration-test.md'
      };
      
      const response = await request(app)
        .post('/api/tasks/complete')
        .send(taskData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // Verify file was updated
      const content = await fs.readFile(
        path.join(TEST_WORKSPACE, 'projects', 'integration-test.md'),
        'utf-8'
      );
      expect(content).toContain('- [x] Integration test task');
    });
  });
  
  describe('Project Management Integration', () => {
    it('should create new projects', async () => {
      const projectData = {
        name: 'New Integration Project',
        goal: 'Testing project creation integration',
        level: 2
      };
      
      const response = await request(app)
        .post('/api/projects/create')
        .send(projectData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // Verify file was created
      const projectPath = path.join(TEST_WORKSPACE, 'projects', 'new-integration-project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('# Project: New Integration Project');
    });
    
    it('should list created projects', async () => {
      const response = await request(app)
        .get('/api/projects/list')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.projects.length).toBeGreaterThan(1); // Original + newly created
    });
  });
});