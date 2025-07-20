const WebDashboardAIService = require('../../server/ai-service');
const fs = require('fs').promises;
const path = require('path');

// Mock fs and other dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn()
  }
}));

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('WebDashboardAIService', () => {
  let aiService;
  let mockAnthropicClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the Anthropic client
    const AnthropicMock = require('@anthropic-ai/sdk');
    mockAnthropicClient = {
      messages: {
        create: jest.fn()
      }
    };
    AnthropicMock.mockImplementation(() => mockAnthropicClient);
    
    aiService = new WebDashboardAIService();
  });
  
  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(aiService).toBeDefined();
      expect(aiService.config).toBeDefined();
      expect(aiService.config.provider).toBe('mock');
    });
    
    it('should load configuration from files', async () => {
      // Mock config file existence and content
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(`
provider: anthropic
model: claude-3-sonnet
max_tokens: 2000
temperature: 0.3
`);
      
      await aiService.initialize();
      
      expect(aiService.config.provider).toBe('anthropic');
      expect(aiService.config.model).toBe('claude-3-sonnet');
    });
    
    it('should handle missing config gracefully', async () => {
      fs.access.mockRejectedValue(new Error('File not found'));
      
      await aiService.initialize();
      
      expect(aiService.config.provider).toBe('mock');
    });
  });
  
  describe('Service Information', () => {
    it('should return service info', () => {
      const serviceInfo = aiService.getServiceInfo();
      
      expect(serviceInfo).toHaveProperty('provider');
      expect(serviceInfo).toHaveProperty('model');
      expect(serviceInfo).toHaveProperty('status');
    });
  });
  
  describe('AI Analysis Methods', () => {
    beforeEach(async () => {
      // Set up Anthropic mode
      aiService.config.provider = 'anthropic';
      aiService.config.api_key = 'test-key';
      await aiService.initialize();
    });
    
    it('should analyze status', async () => {
      const mockResponse = {
        content: [{ text: JSON.stringify({
          summary: 'Test analysis',
          recommendations: ['Test recommendation']
        })}]
      };
      
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeStatus('test context');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.any(Array)
        })
      );
    });
    
    it('should coordinate tasks', async () => {
      const mockResponse = {
        content: [{ text: JSON.stringify({
          priority_tasks: ['Task 1', 'Task 2'],
          insights: 'Test insights'
        })}]
      };
      
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.coordinateTasks('test context');
      
      expect(result).toHaveProperty('priority_tasks');
      expect(result).toHaveProperty('insights');
    });
    
    it('should record progress', async () => {
      const mockResponse = {
        content: [{ text: JSON.stringify({
          summary: 'Progress recorded',
          proposed_changes: []
        })}]
      };
      
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.recordProgress('test progress', 'test context');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('proposed_changes');
    });
    
    it('should generate reflection', async () => {
      const mockResponse = {
        content: [{ text: JSON.stringify({
          insights: 'Test insights',
          patterns: ['Pattern 1']
        })}]
      };
      
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.generateReflection('test context');
      
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('patterns');
    });
  });
  
  describe('Mock Mode Fallback', () => {
    beforeEach(() => {
      aiService.config.provider = 'mock';
    });
    
    it('should return mock status analysis', async () => {
      const result = await aiService.analyzeStatus('test context');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');
      expect(result.summary).toContain('mock');
    });
    
    it('should return mock coordination', async () => {
      const result = await aiService.coordinateTasks('test context');
      
      expect(result).toHaveProperty('priority_tasks');
      expect(result).toHaveProperty('insights');
    });
    
    it('should return mock progress recording', async () => {
      const result = await aiService.recordProgress('test progress', 'test context');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('proposed_changes');
    });
    
    it('should return mock reflection', async () => {
      const result = await aiService.generateReflection('test context');
      
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('patterns');
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(async () => {
      aiService.config.provider = 'anthropic';
      aiService.config.api_key = 'test-key';
      await aiService.initialize();
    });
    
    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));
      
      const result = await aiService.analyzeStatus('test context');
      
      // Should fall back to mock response
      expect(result).toHaveProperty('summary');
      expect(result.summary).toContain('mock');
    });
    
    it('should handle invalid JSON responses', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'Invalid JSON response' }]
      });
      
      const result = await aiService.analyzeStatus('test context');
      
      // Should fall back to mock response
      expect(result).toHaveProperty('summary');
    });
  });
});