import { 
  getCurrentDate, 
  calculateDaysSince, 
  parseMarkdownCheckbox,
  createMarkdownCheckbox,
  sanitizeFilename 
} from '../../src/core/utils';

describe('Utils', () => {
  describe('getCurrentDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('calculateDaysSince', () => {
    it('should calculate days correctly', () => {
      const fixedDate = '2024-01-01';
      const result = calculateDaysSince(fixedDate);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('parseMarkdownCheckbox', () => {
    it('should parse completed checkbox', () => {
      const result = parseMarkdownCheckbox('- [x] Completed task');
      expect(result.checked).toBe(true);
      expect(result.content).toBe('Completed task');
    });

    it('should parse incomplete checkbox', () => {
      const result = parseMarkdownCheckbox('- [ ] Incomplete task');
      expect(result.checked).toBe(false);
      expect(result.content).toBe('Incomplete task');
    });

    it('should handle non-checkbox lines', () => {
      const result = parseMarkdownCheckbox('Just a regular line');
      expect(result.checked).toBe(false);
      expect(result.content).toBe('Just a regular line');
    });
  });

  describe('createMarkdownCheckbox', () => {
    it('should create unchecked checkbox by default', () => {
      const result = createMarkdownCheckbox('New task');
      expect(result).toBe('- [ ] New task');
    });

    it('should create checked checkbox when specified', () => {
      const result = createMarkdownCheckbox('Done task', true);
      expect(result).toBe('- [x] Done task');
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize filename correctly', () => {
      expect(sanitizeFilename('My Project Name')).toBe('my-project-name');
      expect(sanitizeFilename('Special!@#$%Characters')).toBe('special-characters');
      expect(sanitizeFilename('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });
});