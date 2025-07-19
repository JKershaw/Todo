import * as fs from 'fs/promises';
import * as path from 'path';
import { reflectCommand } from '../../src/commands/reflect';

describe('Reflect Command', () => {
  const testDir = path.join(__dirname, 'test-reflect-workspace');

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'projects'), { recursive: true });
    
    // Create basic files
    await fs.writeFile(
      path.join(testDir, 'config.yml'),
      'ai:\n  provider: "local"\n  model: "test"\n  api_key_env: "TEST_KEY"\n  max_tokens: 100\n  temperature: 0.3'
    );
    
    await fs.writeFile(
      path.join(testDir, 'README.md'),
      '# Test Workspace\n## Recent Progress\n- [x] Completed task\n- [ ] Pending task'
    );
    
    await fs.writeFile(
      path.join(testDir, 'reflect.md'),
      '# Reflection History\n\nInitial reflection file.'
    );
    
    await fs.writeFile(
      path.join(testDir, 'projects', 'test-project.md'),
      '# Test Project\n\n- [x] Done item\n- [ ] Todo item'
    );
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should perform weekly reflection', async () => {
    await reflectCommand('weekly', testDir);
    
    // Check that reflect.md was updated
    const reflectContent = await fs.readFile(path.join(testDir, 'reflect.md'), 'utf8');
    expect(reflectContent).toContain('Weekly Reflection');
    expect(reflectContent).toContain('Progress Analysis');
    expect(reflectContent).toContain('Key Insights');
    expect(reflectContent).toContain('Next Period Focus');
  });

  it('should perform monthly reflection', async () => {
    await reflectCommand('monthly', testDir);
    
    const reflectContent = await fs.readFile(path.join(testDir, 'reflect.md'), 'utf8');
    expect(reflectContent).toContain('Monthly Reflection');
    expect(reflectContent).toContain('coming month');
  });

  it('should handle missing workspace gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    try {
      await reflectCommand('weekly', 'non-existent-directory');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Workspace not initialized')
      );
    } finally {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    }
  });
});