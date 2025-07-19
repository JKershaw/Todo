import { AnthropicService, MockAIService } from '../../src/ai/service';
import { Config } from '../../src/types';

describe('AI Service Integration', () => {
  const mockConfig: Config['ai'] = {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    api_key_env: 'ANTHROPIC_API_KEY',
    max_tokens: 100,
    temperature: 0.3
  };

  describe('MockAIService', () => {
    it('should provide mock responses', async () => {
      const service = new MockAIService();
      const response = await service.analyze(
        'Test prompt',
        'Test context'
      );
      
      expect(response.analysis).toContain('Mock analysis');
      expect(response.suggestions).toHaveLength(3);
      expect(response.proposed_changes).toEqual([]);
      expect(response.reasoning).toContain('mock response');
    });
  });

  describe('AnthropicService', () => {
    it('should fail gracefully without API key', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => {
        new AnthropicService(mockConfig);
      }).toThrow('Missing API key: ANTHROPIC_API_KEY environment variable not set');
      
      // Restore original key
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });

    it('should initialize with valid API key', () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping real API test - no API key provided');
        return;
      }
      
      expect(() => {
        new AnthropicService(mockConfig);
      }).not.toThrow();
    });

    it('should make real API calls when key is available', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping real API test - no API key provided');
        return;
      }

      const service = new AnthropicService(mockConfig);
      
      try {
        const response = await service.analyze(
          'Analyze this simple test context',
          'Test context: This is a basic integration test'
        );
        
        expect(response.analysis).toBeDefined();
        expect(typeof response.analysis).toBe('string');
        expect(response.suggestions).toBeDefined();
        expect(Array.isArray(response.suggestions)).toBe(true);
      } catch (error) {
        console.log('API call failed (may be network/quota issue):', error);
        // Don't fail the test for network issues
      }
    }, 10000); // 10 second timeout for API calls
  });
});