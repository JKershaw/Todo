import { renderTemplate, README_TEMPLATE } from '../../src/files/templates';

describe('Templates', () => {
  describe('renderTemplate', () => {
    it('should replace template variables', () => {
      const template = 'Hello {{targetDate}}, today is {{date}}';
      const result = renderTemplate(template, { 
        targetDate: '2024-02-01',
        date: '2024-01-01' 
      });
      
      expect(result).toBe('Hello 2024-02-01, today is 2024-01-01');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Today is {{date}}, unknown is {{unknown}}';
      const result = renderTemplate(template, { date: '2024-01-01' });
      
      expect(result).toContain('2024-01-01');
      expect(result).toContain('{{unknown}}'); // Should remain unchanged
    });

    it('should use default date for README template', () => {
      const result = renderTemplate(README_TEMPLATE);
      
      expect(result).toContain('Last Updated:');
      expect(result).toContain('Current Focus');
      expect(result).toContain('Recent Progress');
    });
  });
});