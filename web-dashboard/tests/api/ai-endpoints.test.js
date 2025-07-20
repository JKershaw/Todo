const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Mock the AI service
const mockAIService = {
  analyzeStatus: jest.fn(),
  coordinateTasks: jest.fn(),
  recordProgress: jest.fn(),
  generateReflection: jest.fn(),
  getServiceInfo: jest.fn()
};

const MOCK_WORKSPACE = path.join(__dirname, '../mock-workspace-ai');

describe('AI API Endpoints', () => {
  let app;
  
  beforeAll(async () => {
    // Set up mock workspace
    await fs.mkdir(MOCK_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(MOCK_WORKSPACE, 'projects'), { recursive: true });
    
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'README.md'),
      '# AI Test Workspace\n\nWorkspace for testing AI endpoints.'
    );
    
    await fs.writeFile(
      path.join(MOCK_WORKSPACE, 'projects', 'ai-test-project.md'),
      `# Project: AI Test Project

**Status:** Active
**Level:** 2

## Goal
Testing AI endpoints

## Level 0 Actions (Next 15 minutes)
- [ ] AI test task
- [x] Completed AI task
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
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock AI service responses
    mockAIService.analyzeStatus.mockResolvedValue({
      summary: 'Mock status analysis',
      recommendations: ['Mock recommendation 1', 'Mock recommendation 2']
    });
    
    mockAIService.coordinateTasks.mockResolvedValue({
      priority_tasks: ['Task 1', 'Task 2'],
      insights: 'Mock coordination insights'
    });
    
    mockAIService.recordProgress.mockResolvedValue({
      summary: 'Progress recorded',
      proposed_changes: []
    });
    
    mockAIService.generateReflection.mockResolvedValue({
      insights: 'Mock reflection insights',
      patterns: ['Pattern 1', 'Pattern 2']
    });
    
    mockAIService.getServiceInfo.mockReturnValue({
      provider: 'mock',
      model: 'test-model'
    });
    
    // Helper function to gather workspace context
    async function gatherWorkspaceContext() {
      try {
        const context = [];
        const readme = await fs.readFile(path.join(MOCK_WORKSPACE, 'README.md'), 'utf-8');
        context.push(`=== WORKSPACE README ===\\n${readme}\\n`);
        
        const projectsDir = path.join(MOCK_WORKSPACE, 'projects');
        const projectFiles = await fs.readdir(projectsDir);
        
        for (const file of projectFiles.slice(0, 5)) {
          if (file.endsWith('.md')) {
            const projectContent = await fs.readFile(path.join(projectsDir, file), 'utf-8');
            context.push(`=== PROJECT: ${file} ===\\n${projectContent.substring(0, 2000)}\\n`);
          }
        }
        
        return context.join('\\n');
      } catch (error) {
        return 'Error gathering workspace context';
      }
    }
    
    // Set up AI endpoints
    app.post('/api/ai/status', async (req, res) => {
      try {
        const workspaceContext = await gatherWorkspaceContext();
        const analysis = await mockAIService.analyzeStatus(workspaceContext);
        const serviceInfo = mockAIService.getServiceInfo();
        
        res.json({
          success: true,
          analysis: analysis,
          aiService: serviceInfo
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze status' });
      }
    });
    
    app.post('/api/ai/coordinate', async (req, res) => {
      try {
        const workspaceContext = await gatherWorkspaceContext();
        const analysis = await mockAIService.coordinateTasks(workspaceContext);
        const serviceInfo = mockAIService.getServiceInfo();
        
        res.json({
          success: true,
          analysis: analysis,
          aiService: serviceInfo
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to coordinate tasks' });
      }
    });
    
    app.post('/api/ai/save', async (req, res) => {
      try {
        const { description } = req.body;
        
        if (!description || description.trim().length === 0) {
          return res.status(400).json({ error: 'Description is required' });
        }
        
        const workspaceContext = await gatherWorkspaceContext();
        const analysis = await mockAIService.recordProgress(description, workspaceContext);
        const serviceInfo = mockAIService.getServiceInfo();
        
        res.json({
          success: true,
          analysis: analysis,
          fileUpdateApplied: false,
          message: 'Progress recorded',
          aiService: serviceInfo
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to record progress' });
      }
    });
    
    app.post('/api/ai/reflect', async (req, res) => {
      try {
        const workspaceContext = await gatherWorkspaceContext();
        const reflection = await mockAIService.generateReflection(workspaceContext);
        const serviceInfo = mockAIService.getServiceInfo();
        
        res.json({
          success: true,
          reflection: reflection,
          aiService: serviceInfo
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate reflection' });
      }
    });
  });
  
  describe('POST /api/ai/status', () => {
    it('should return AI status analysis', async () => {
      const response = await request(app)
        .post('/api/ai/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('aiService');
      
      expect(response.body.analysis).toHaveProperty('summary');
      expect(response.body.analysis).toHaveProperty('recommendations');
      expect(response.body.aiService).toHaveProperty('provider', 'mock');
      
      expect(mockAIService.analyzeStatus).toHaveBeenCalledTimes(1);
      expect(mockAIService.getServiceInfo).toHaveBeenCalledTimes(1);
    });
    
    it('should handle AI service errors', async () => {
      mockAIService.analyzeStatus.mockRejectedValue(new Error('AI service error'));
      
      const response = await request(app)
        .post('/api/ai/status')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to analyze status');
    });
  });
  
  describe('POST /api/ai/coordinate', () => {
    it('should return AI task coordination', async () => {
      const response = await request(app)
        .post('/api/ai/coordinate')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('aiService');
      
      expect(response.body.analysis).toHaveProperty('priority_tasks');
      expect(response.body.analysis).toHaveProperty('insights');
      
      expect(mockAIService.coordinateTasks).toHaveBeenCalledTimes(1);
    });
    
    it('should handle coordination service errors', async () => {
      mockAIService.coordinateTasks.mockRejectedValue(new Error('Coordination error'));
      
      const response = await request(app)
        .post('/api/ai/coordinate')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to coordinate tasks');
    });
  });
  
  describe('POST /api/ai/save', () => {
    it('should record progress with description', async () => {
      const progressDescription = 'Completed testing setup';
      
      const response = await request(app)
        .post('/api/ai/save')
        .send({ description: progressDescription })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('message', 'Progress recorded');
      
      expect(mockAIService.recordProgress).toHaveBeenCalledWith(
        progressDescription,
        expect.any(String)
      );
    });
    
    it('should reject empty progress description', async () => {
      const response = await request(app)
        .post('/api/ai/save')
        .send({ description: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Description is required');
      expect(mockAIService.recordProgress).not.toHaveBeenCalled();
    });
    
    it('should reject missing progress description', async () => {
      const response = await request(app)
        .post('/api/ai/save')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Description is required');
    });
    
    it('should handle progress recording errors', async () => {
      mockAIService.recordProgress.mockRejectedValue(new Error('Progress error'));
      
      const response = await request(app)
        .post('/api/ai/save')
        .send({ description: 'Test progress' })
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to record progress');
    });
  });
  
  describe('POST /api/ai/reflect', () => {
    it('should return AI reflection', async () => {
      const response = await request(app)
        .post('/api/ai/reflect')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('reflection');
      expect(response.body).toHaveProperty('aiService');
      
      expect(response.body.reflection).toHaveProperty('insights');
      expect(response.body.reflection).toHaveProperty('patterns');
      
      expect(mockAIService.generateReflection).toHaveBeenCalledTimes(1);
    });
    
    it('should handle reflection service errors', async () => {
      mockAIService.generateReflection.mockRejectedValue(new Error('Reflection error'));
      
      const response = await request(app)
        .post('/api/ai/reflect')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to generate reflection');
    });
  });
});