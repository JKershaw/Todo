// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

test.describe('Comprehensive E2E Workflow Tests', () => {
  const testWorkspacePath = path.join(__dirname, '../../test-workspace');
  const cliPath = path.join(__dirname, '../../dist/index.js');

  test.beforeAll(async () => {
    // Clean up any existing test workspace
    try {
      await fs.rm(testWorkspacePath, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Initialize test workspace using CLI
    try {
      const { stdout } = await execAsync(`node "${cliPath}" init "${testWorkspacePath}"`);
      console.log('Workspace initialization:', stdout);
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Clean up test workspace
    try {
      await fs.rm(testWorkspacePath, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the test server
    await page.goto('/');
  });

  test('should complete full user workflow: create project, add tasks, use AI features', async ({ page }) => {
    // Step 1: Create a new project using CLI
    const projectName = 'E2E Test Project';
    const { stdout: createOutput } = await execAsync(`node "${cliPath}" project create "${projectName}" -d "${testWorkspacePath}"`);
    expect(createOutput).toContain('created');

    // Step 2: Add some tasks to the project file
    const projectFilePath = path.join(testWorkspacePath, 'projects', 'e2e-test-project.md');
    const projectContent = await fs.readFile(projectFilePath, 'utf-8');
    
    const updatedContent = projectContent.replace(
      '## Level 0 Tasks (Immediate - 5-15 minutes)',
      `## Level 0 Tasks (Immediate - 5-15 minutes)
- [ ] Review project requirements and setup development environment
- [ ] Create initial project structure and configuration files
- [ ] Write basic test cases for core functionality

## Level 1 Tasks (Today - 1-4 hours)
- [ ] Implement core feature set with proper error handling
- [ ] Add comprehensive logging and monitoring capabilities
- [ ] Deploy to staging environment for testing`
    );
    
    await fs.writeFile(projectFilePath, updatedContent);

    // Step 3: Test dashboard loads and shows our project
    await page.reload(); // Refresh to pick up file changes
    
    // Switch to Projects mode
    await page.click('[data-mode="projects"]');
    await expect(page.locator('#projects-content')).toBeVisible();
    
    // Wait for projects to load and find our test project
    await expect(page.locator('.project-card')).toBeVisible({ timeout: 10000 });
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toContainText('E2E Test Project');

    // Step 4: Open project details
    const testProjectCard = page.locator('.project-card').filter({ hasText: 'E2E Test Project' });
    await testProjectCard.click();
    await expect(page.locator('#project-details-modal')).toBeVisible();

    // Verify tasks are shown
    await expect(page.locator('#project-tasks')).toBeVisible();
    await expect(page.locator('#project-tasks')).toContainText('Review project requirements');
    await expect(page.locator('#project-tasks')).toContainText('Implement core feature set');

    // Step 5: Test AI Status functionality
    await page.click('#ai-status-btn');
    await expect(page.locator('#ai-status-modal')).toBeVisible();
    
    // Wait for AI analysis to load (real API call, no mocking)
    await expect(page.locator('#status-analysis')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#status-analysis')).toContainText('System Status');
    
    await page.click('#ai-status-modal .close');
    await expect(page.locator('#ai-status-modal')).toBeHidden();

    // Step 6: Test AI Coordination functionality
    await page.click('#ai-coordinate-btn');
    await expect(page.locator('#ai-coordinate-modal')).toBeVisible();
    
    // Wait for coordination analysis to load
    await expect(page.locator('#coordination-analysis')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#coordination-analysis')).toContainText('Task Relationships');
    
    await page.click('#ai-coordinate-modal .close');
    await expect(page.locator('#ai-coordinate-modal')).toBeHidden();

    // Step 7: Test progress recording with AI analysis
    const progressDescription = `Completed E2E test setup and validation for project: ${projectName}`;
    await page.fill('#progress-input', progressDescription);
    await page.click('#progress-btn');
    
    // Wait for AI analysis of progress
    await expect(page.locator('#progress-analysis')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#progress-analysis')).toContainText('Progress Analysis');
    
    await page.click('#progress-modal .close');
    await expect(page.locator('#progress-modal')).toBeHidden();

    // Step 8: Verify CLI commands work with the test workspace
    // Test status command
    const { stdout: statusOutput } = await execAsync(`node "${cliPath}" status -d "${testWorkspacePath}"`);
    expect(statusOutput).toContain('System Status');

    // Test coordinate command  
    const { stdout: coordinateOutput } = await execAsync(`node "${cliPath}" coordinate -d "${testWorkspacePath}"`);
    expect(coordinateOutput).toContain('Task Relationships');

    // Step 9: Test task completion in dashboard
    await page.click('[data-mode="do"]');
    await expect(page.locator('#do-content')).toBeVisible();
    
    // Wait for tasks to load
    await page.waitForSelector('.task-item', { timeout: 10000 });
    
    // Find and complete a task
    const taskCheckboxes = page.locator('.task-item input[type="checkbox"]');
    if (await taskCheckboxes.first().isVisible()) {
      await taskCheckboxes.first().click();
      
      // Wait for visual feedback
      await page.waitForTimeout(1000);
    }

    // Step 10: Verify project status reflects our work
    const { stdout: projectStatusOutput } = await execAsync(`node "${cliPath}" project status "${projectName}" -d "${testWorkspacePath}"`);
    expect(projectStatusOutput).toContain('Project Status');
    expect(projectStatusOutput).toContain('e2e-test-project');
  }, 60000); // 60 second timeout for comprehensive test

  test('should handle workspace operations safely', async ({ page }) => {
    // Test workspace initialization modal
    await page.click('#workspace-init-btn');
    await expect(page.locator('#workspace-init-modal')).toBeVisible();
    await page.click('#workspace-init-modal .close');
    await expect(page.locator('#workspace-init-modal')).toBeHidden();

    // Test zoom functionality
    await page.click('#zoom-in-btn');
    await page.waitForTimeout(500);
    
    await page.click('#zoom-out-btn');
    await page.waitForTimeout(500);
  });

  test('should demonstrate AI-powered task creation and management', async ({ page }) => {
    // Create a project focused on AI-assisted development
    const aiProjectName = 'AI-Assisted Development';
    await execAsync(`node "${cliPath}" project create "${aiProjectName}" -d "${testWorkspacePath}"`);

    // Add some initial goals using save command with AI analysis
    const progressEntry = 'Set up AI-assisted development workflow with task automation and intelligent suggestions';
    const { stdout: saveOutput } = await execAsync(`node "${cliPath}" save "${progressEntry}" -d "${testWorkspacePath}"`);
    expect(saveOutput).toContain('Progress recorded');

    // Reload page to see updates
    await page.reload();
    
    // Switch to Plan mode to see hierarchical task view
    await page.click('[data-mode="plan"]');
    await expect(page.locator('#plan-content')).toBeVisible();
    
    // Should show planning information
    await page.waitForSelector('.plan-section', { timeout: 5000 });

    // Test reflect functionality  
    const { stdout: reflectOutput } = await execAsync(`node "${cliPath}" reflect -d "${testWorkspacePath}"`);
    expect(reflectOutput).toContain('Weekly Reflection');
    
    // Check that reflection was recorded
    const reflectPath = path.join(testWorkspacePath, 'reflect.md');
    const reflectContent = await fs.readFile(reflectPath, 'utf-8');
    expect(reflectContent).toContain('Weekly Reflection');
  });

  test('should handle multiple projects and cross-project coordination', async ({ page }) => {
    // Create multiple test projects
    const projects = ['Frontend Development', 'Backend API', 'Database Design'];
    
    for (const project of projects) {
      await execAsync(`node "${cliPath}" project create "${project}" -d "${testWorkspacePath}"`);
    }

    // Test project list command
    const { stdout: listOutput } = await execAsync(`node "${cliPath}" project list -d "${testWorkspacePath}"`);
    expect(listOutput).toContain('Projects Overview');
    
    for (const project of projects) {
      expect(listOutput).toContain(project.toLowerCase().replace(/\s+/g, '-'));
    }

    // Test coordination across multiple projects
    const { stdout: enhancedCoordinate } = await execAsync(`node "${cliPath}" coordinate-enhanced -d "${testWorkspacePath}"`);
    expect(enhancedCoordinate).toContain('Enhanced Task Relationship Analysis');

    // Verify in dashboard that all projects appear
    await page.click('[data-mode="projects"]');
    await expect(page.locator('#projects-content')).toBeVisible();
    await page.waitForSelector('.project-card', { timeout: 10000 });
    
    const projectCards = page.locator('.project-card');
    for (const project of projects) {
      await expect(projectCards).toContainText(project);
    }
  });
});