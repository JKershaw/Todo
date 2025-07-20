const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const MOCK_WORKSPACE = path.join(__dirname, '../mock-workspace-tasks');

describe('Task Management API Endpoints', () => {
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
    
    // Create fresh test project for each test
    const testProjectContent = `# Project: Task Test Project

**Status:** Active
**Level:** 2

## Goal
Testing task management endpoints

## Level 0 Actions (Next 15 minutes)
- [ ] Test task for completion
- [x] Already completed task

## Level 2 Tasks (Current Sprint)
- [ ] Sprint task 1
- [ ] Sprint task 2
`;
    
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'task-test-project.md'),
      testProjectContent
    );
    
    // Set up task completion endpoint
    app.post('/api/tasks/complete', async (req, res) => {
      try {
        const { task, project, file } = req.body;
        
        if (!task || !project || !file) {
          return res.status(400).json({ error: 'Missing required fields: task, project, file' });
        }
        
        const filePath = path.join(MOCK_WORKSPACE, 'projects', file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\\n');
        
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
        await fs.writeFile(filePath, lines.join('\\n'), 'utf-8');
        
        res.json({ success: true, message: 'Task marked as completed' });
        
      } catch (error) {
        res.status(500).json({ error: 'Failed to complete task' });
      }
    });
  });
  
  describe('POST /api/tasks/complete', () => {
    it('should complete a task successfully', async () => {
      const taskData = {
        task: 'Test task for completion',
        project: 'Task Test Project',
        file: 'task-test-project.md'
      };
      
      const response = await request(app)
        .post('/api/tasks/complete')
        .send(taskData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Task marked as completed');
      
      // Verify the file was updated
      const updatedContent = await fs.readFile(
        path.join(MOCK_WORKSPACE, 'projects', 'task-test-project.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('- [x] Test task for completion');
      expect(updatedContent).not.toContain('- [ ] Test task for completion');
    });
    
    it('should return 404 for non-existent task', async () => {
      const taskData = {
        task: 'Non-existent task',
        project: 'Task Test Project',
        file: 'task-test-project.md'
      };
      
      const response = await request(app)
        .post('/api/tasks/complete')
        .send(taskData)
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Task not found in file');
    });
    
    it('should return 400 for missing required fields', async () => {
      const testCases = [
        { project: 'Test', file: 'test.md' }, // missing task
        { task: 'Test task', file: 'test.md' }, // missing project
        { task: 'Test task', project: 'Test' }, // missing file
        {} // missing all fields
      ];
      
      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/tasks/complete')
          .send(testCase)
          .expect(400);
        
        expect(response.body).toHaveProperty('error', 'Missing required fields: task, project, file');
      }
    });
    
    it('should handle file system errors', async () => {
      const taskData = {
        task: 'Test task',
        project: 'Non-existent Project',
        file: 'non-existent-file.md'
      };
      
      const response = await request(app)
        .post('/api/tasks/complete')
        .send(taskData)
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to complete task');
    });
    
    it('should not complete already completed tasks', async () => {
      const taskData = {
        task: 'Already completed task',
        project: 'Task Test Project',
        file: 'task-test-project.md'
      };
      
      const response = await request(app)
        .post('/api/tasks/complete')
        .send(taskData)
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Task not found in file');
    });
  });
});