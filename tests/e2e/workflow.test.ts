import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const testDir = path.join(__dirname, 'test-e2e-workspace');

describe('End-to-End Workflow', () => {
  beforeAll(async () => {
    // Clean up any existing test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should complete full init -> status -> save workflow', async () => {
    const distPath = path.join(__dirname, '../../dist/index.js');
    
    // Test init command
    const { stdout: initOutput } = await execAsync(`node "${distPath}" init "${testDir}"`);
    expect(initOutput).toContain('✓ Productivity system initialized successfully!');
    
    // Verify files were created
    const readmePath = path.join(testDir, 'README.md');
    const configPath = path.join(testDir, 'config.yml');
    const projectPath = path.join(testDir, 'projects/build-productivity-system.md');
    
    expect(await fs.access(readmePath).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(configPath).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(projectPath).then(() => true).catch(() => false)).toBe(true);
    
    // Test status command (will use mock AI since no API key in test env)
    const { stdout: statusOutput } = await execAsync(`node "${distPath}" status -d "${testDir}"`);
    expect(statusOutput).toContain('Basic Status');
    
    // Test save command
    const { stdout: saveOutput } = await execAsync(`node "${distPath}" save "Test progress entry" -d "${testDir}"`);
    expect(saveOutput).toContain('Progress recorded');
    
    // Verify README was updated
    const readmeContent = await fs.readFile(readmePath, 'utf8');
    expect(readmeContent).toContain('Test progress entry');
    
  }, 15000); // 15 second timeout for full workflow

  it('should handle zoom commands', async () => {
    const distPath = path.join(__dirname, '../../dist/index.js');
    
    // Test zoom command
    const { stdout: zoomOutput } = await execAsync(`node "${distPath}" zoom "level 2" -d "${testDir}"`);
    expect(zoomOutput).toContain('Level 2: Projects');
    expect(zoomOutput).toContain('Short-term projects');
  });

  it('should handle missing workspace gracefully', async () => {
    const distPath = path.join(__dirname, '../../dist/index.js');
    const nonExistentDir = path.join(__dirname, 'non-existent-workspace');
    
    try {
      await execAsync(`node "${distPath}" status -d "${nonExistentDir}"`);
    } catch (error: any) {
      expect(error.stdout || error.stderr).toContain('not initialized');
    }
  });
});