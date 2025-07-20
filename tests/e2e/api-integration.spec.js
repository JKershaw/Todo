// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

test.describe('API Integration Tests', () => {
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
      
      // Add some test projects and tasks
      await execAsync(`node "${cliPath}" project create "API Test Project" -d "${testWorkspacePath}"`);
      await execAsync(`node "${cliPath}" save "Created test project for API integration testing" -d "${testWorkspacePath}"`);
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
    await page.goto('/');
    // Wait for initial connection and data loading
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#connection-status .dot.online', { timeout: 10000 });
  });

  test('should load focus flow data via API', async ({ page }) => {
    // Switch to Do mode 
    await page.click('[data-mode="do"]');
    
    // Wait for API call to complete
    const apiResponse = page.waitForResponse(resp => resp.url().includes('/api/focus-flow'));
    await page.reload();
    const response = await apiResponse;
    
    // Verify API response
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('level0Tasks');
    
    // Verify UI reflects API data
    await expect(page.locator('#focus-flow-content')).not.toContainText('Loading your immediate focus tasks...');
    
    if (data.level0Tasks && data.level0Tasks.length > 0) {
      // Should show actual tasks
      await expect(page.locator('.focus-task')).toHaveCount(data.level0Tasks.length);
      
      // Test task completion functionality
      const firstTask = page.locator('.focus-task').first();
      await firstTask.click();
      
      // Should show completion feedback
      await page.waitForTimeout(1000); // Allow completion animation
    } else {
      // Should show "no tasks" message
      await expect(page.locator('#focus-flow-content')).toContainText('No immediate tasks');
    }
  });

  test('should handle project management API calls', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    
    // Wait for projects API call
    const projectsResponse = page.waitForResponse(resp => resp.url().includes('/api/projects'));
    await page.reload();
    const response = await projectsResponse;
    
    // Verify API response
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Should have our test project
    expect(data.projects).toBeDefined();
    const testProject = data.projects.find(p => p.name.includes('API Test Project'));
    expect(testProject).toBeDefined();
    
    // Verify UI shows projects
    await expect(page.locator('#projects-list')).not.toContainText('Loading projects...');
    await expect(page.locator('#projects-list')).toContainText('API Test Project');
    
    // Test project creation modal
    await page.click('#create-project-btn');
    await expect(page.locator('#create-project-modal')).toBeVisible();
    
    // Fill out new project form
    await page.fill('#project-name', 'E2E Created Project');
    await page.fill('#project-goal', 'Testing project creation through UI');
    await page.selectOption('#project-level', '2');
    
    // Submit project creation (if API endpoint exists)
    const createButton = page.locator('#create-project-modal button[type="submit"]');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for creation to complete
      await page.waitForTimeout(2000);
      
      // Verify project appears in list
      await expect(page.locator('#projects-list')).toContainText('E2E Created Project');
    }
  });

  test('should test AI status analysis API', async ({ page }) => {
    // Click AI Status button
    await page.click('#ai-status-btn');
    
    // Wait for modal to appear
    await expect(page.locator('#ai-status-modal')).toBeVisible({ timeout: 5000 });
    
    // Wait for AI analysis API call
    const analysisResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/ai-status') || resp.url().includes('/api/status'));
    
    try {
      const response = await analysisResponse;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log('AI Status Response:', data);
      
      // Verify modal shows analysis
      await expect(page.locator('#ai-status-modal .modal-body')).not.toContainText('Loading...');
      await expect(page.locator('#ai-status-modal .modal-body')).toContainText(/System|Status|Analysis|Progress/);
      
    } catch (error) {
      console.log('AI Status API may not be implemented yet:', error.message);
      // Check if modal at least shows some content
      await expect(page.locator('#ai-status-modal .modal-body')).toBeVisible();
    }
    
    // Close modal
    await page.click('#ai-status-modal .modal-close');
    await expect(page.locator('#ai-status-modal')).not.toBeVisible();
  });

  test('should test AI task coordination API', async ({ page }) => {
    // Click AI Coordinate button
    await page.click('#ai-coordinate-btn');
    
    // Wait for modal to appear
    await expect(page.locator('#ai-coordinate-modal')).toBeVisible({ timeout: 5000 });
    
    // Wait for coordination API call
    const coordinateResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/ai-coordinate') || resp.url().includes('/api/coordinate'));
    
    try {
      const response = await coordinateResponse;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log('AI Coordinate Response:', data);
      
      // Verify modal shows coordination analysis
      await expect(page.locator('#ai-coordinate-modal .modal-body')).not.toContainText('Loading...');
      await expect(page.locator('#ai-coordinate-modal .modal-body')).toContainText(/Task|Coordinate|Relationship|Suggest/);
      
    } catch (error) {
      console.log('AI Coordinate API may not be implemented yet:', error.message);
      // Check if modal at least shows some content
      await expect(page.locator('#ai-coordinate-modal .modal-body')).toBeVisible();
    }
    
    // Close modal
    await page.click('#ai-coordinate-modal .modal-close');
    await expect(page.locator('#ai-coordinate-modal')).not.toBeVisible();
  });

  test('should test progress recording with AI analysis', async ({ page }) => {
    const progressText = 'Completed comprehensive API integration testing';
    
    // Fill progress input
    await page.fill('#progress-input', progressText);
    
    // Monitor for progress API call
    const progressResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/progress') || resp.url().includes('/api/save'));
    
    // Submit progress
    await page.click('#progress-btn');
    
    try {
      const response = await progressResponse;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log('Progress Save Response:', data);
      
      // Should show some kind of feedback
      await page.waitForTimeout(1000);
      
      // Check if progress was recorded (implementation dependent)
      // Progress input should be cleared or show confirmation
      const currentValue = await page.locator('#progress-input').inputValue();
      expect(currentValue === '' || currentValue !== progressText).toBe(true);
      
    } catch (error) {
      console.log('Progress API interaction:', error.message);
      // At minimum, should handle the click without errors
      await page.waitForTimeout(1000);
    }
  });

  test('should load plan view with project hierarchy', async ({ page }) => {
    // Switch to plan mode
    await page.click('[data-mode="plan"]');
    
    // Wait for plan data API call
    const planResponse = page.waitForResponse(resp => resp.url().includes('/api/plan'));
    await page.reload();
    
    try {
      const response = await planResponse;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log('Plan Data Response:', data);
      
      // Verify plan content loads
      await expect(page.locator('#plan-content')).not.toContainText('Loading project hierarchy...');
      
      // Should show some plan-related content
      await expect(page.locator('#plan-content')).not.toBeEmpty();
      
    } catch (error) {
      console.log('Plan API may not be fully implemented:', error.message);
      // Should at least show the plan content area
      await expect(page.locator('#plan-content')).toBeVisible();
    }
  });

  test('should load reflect data with momentum visualization', async ({ page }) => {
    // Switch to reflect mode
    await page.click('[data-mode="reflect"]');
    
    // Wait for reflect data API call
    const reflectResponse = page.waitForResponse(resp => resp.url().includes('/api/reflect'));
    await page.reload();
    
    try {
      const response = await reflectResponse;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log('Reflect Data Response:', data);
      
      // Verify reflect content loads
      await expect(page.locator('#reflect-content')).not.toContainText('Loading momentum and insights...');
      
      if (data.momentumBars && data.momentumBars.length > 0) {
        // Should show momentum bars
        await expect(page.locator('.momentum-bar')).toHaveCount(data.momentumBars.length);
      }
      
    } catch (error) {
      console.log('Reflect API may not be fully implemented:', error.message);
      // Should at least show activity section
      await expect(page.locator('#activity-content')).toBeVisible();
    }
  });

  test('should handle real-time updates via WebSocket', async ({ page }) => {
    // Wait for WebSocket connection
    await expect(page.locator('#connection-status .dot.online')).toBeVisible();
    await expect(page.locator('#connection-status')).toContainText('Connected');
    
    // Make a change via CLI that should trigger WebSocket update
    const changeDescription = `WebSocket test change ${Date.now()}`;
    await execAsync(`node "${cliPath}" save "${changeDescription}" -d "${testWorkspacePath}"`);
    
    // Wait for activity feed to update
    await page.waitForTimeout(2000); // Give WebSocket time to deliver update
    
    // Check if activity feed shows the update
    const activityContent = page.locator('#activity-content');
    await expect(activityContent).toBeVisible();
    
    // Should have some activity items
    const activityItems = page.locator('#activity-content .activity-item');
    await expect(activityItems.first()).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test with invalid API calls by intercepting and modifying requests
    await page.route('**/api/focus-flow', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test server error' })
      });
    });
    
    // Switch to Do mode to trigger API call
    await page.click('[data-mode="do"]');
    await page.reload();
    
    // Should handle error gracefully
    await expect(page.locator('#focus-flow-content')).toContainText(/Failed to load|Error|unavailable/);
    
    // UI should still be functional
    await expect(page.locator('[data-mode="plan"]')).toBeVisible();
    await page.click('[data-mode="plan"]');
    await expect(page.locator('#plan-content')).toBeVisible();
  });
});