import Anthropic from '@anthropic-ai/sdk';
import { Config, AIResponse } from '../types';

export interface AIService {
  analyze(prompt: string, context: string): Promise<AIResponse>;
}

export class AnthropicService implements AIService {
  private client: Anthropic;
  private config: Config['ai'];

  constructor(config: Config['ai']) {
    this.config = config;
    const apiKey = process.env[config.api_key_env];
    
    if (!apiKey) {
      throw new Error(`Missing API key: ${config.api_key_env} environment variable not set`);
    }

    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  async analyze(prompt: string, context: string): Promise<AIResponse> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: `${context}\n\n${prompt}\n\n**IMPORTANT: You must respond with ONLY valid JSON. No additional text, explanations, or formatting outside the JSON object.**

Required JSON format:
{
  "analysis": "Brief analysis of the current state",
  "suggestions": ["List of actionable suggestions"],
  "proposed_changes": [
    {
      "file_path": "path/to/file",
      "change_type": "create|update|delete",
      "content": "new content if creating/updating",
      "diff": "description of changes if updating"
    }
  ],
  "reasoning": "Explanation of why these changes are recommended"
}

Response:`
          }
        ]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI service');
      }

      try {
        // Try to extract JSON from the response in case there's extra text
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : content.text;
        return JSON.parse(jsonText) as AIResponse;
      } catch (parseError) {
        console.warn('AI JSON parsing failed:', parseError);
        console.warn('Raw AI response:', content.text);
        return {
          analysis: content.text.substring(0, 500), // First 500 chars as analysis
          suggestions: [
            'AI response was not in JSON format - check the raw response',
            'Consider adjusting AI prompts for better structured responses'
          ],
          proposed_changes: [],
          reasoning: `AI response parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      throw new Error(`AI service error: ${error}`);
    }
  }
}

export class MockAIService implements AIService {
  async analyze(prompt: string, context: string): Promise<AIResponse> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      analysis: 'Mock analysis: System appears to be functioning normally.',
      suggestions: [
        'Continue with current tasks',
        'Consider reviewing completed items',
        'Plan next week\'s priorities'
      ],
      proposed_changes: [],
      reasoning: 'This is a mock response for testing purposes'
    };
  }
}

export const createAIService = (config: Config): AIService => {
  switch (config.ai.provider) {
    case 'anthropic':
      return new AnthropicService(config.ai);
    case 'local':
      return new MockAIService();
    default:
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
  }
};