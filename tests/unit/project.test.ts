import * as fs from 'fs/promises';
import * as path from 'path';
import { projectCommand } from '../../src/commands/project';

describe('Project Command', () => {
  const testDir = path.join(__dirname, 'test-project-workspace');

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'projects'), { recursive: true });
    
    // Create basic config file
    await fs.writeFile(
      path.join(testDir, 'config.yml'),
      'ai:\n  provider: "local"\n  model: "test"\n  api_key_env: "TEST_KEY"\n  max_tokens: 100\n  temperature: 0.3'
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

  it('should create a new project', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await projectCommand('create', 'Test Project', testDir);
      
      // Check that project file was created
      const projectFile = path.join(testDir, 'projects', 'test-project.md');
      const fileExists = await fs.access(projectFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Check file content
      const content = await fs.readFile(projectFile, 'utf8');
      expect(content).toContain('# Project: Test Project');
      expect(content).toContain('**Status:** Active');
      expect(content).toContain('Level 4 Connection');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Project created:')
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should list projects', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await projectCommand('list', undefined, testDir);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Projects Overview')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-project')
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should show project status', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await projectCommand('status', 'Test Project', testDir);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project Status: test-project')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Progress:')
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should complete a project', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await projectCommand('complete', 'Test Project', testDir);
      
      // Check that project file was updated
      const projectFile = path.join(testDir, 'projects', 'test-project.md');
      const content = await fs.readFile(projectFile, 'utf8');
      expect(content).toContain('**Status:** Completed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Project "Test Project" marked as completed!')
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should handle missing project gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await projectCommand('status', 'Non-existent Project', testDir);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project "Non-existent Project" not found')
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should handle missing workspace gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    try {
      await projectCommand('list', undefined, 'non-existent-directory');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Workspace not initialized')
      );
    } finally {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    }
  });
});