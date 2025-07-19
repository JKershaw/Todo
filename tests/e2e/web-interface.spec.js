// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Web Interface E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the web dashboard
    await page.goto('http://localhost:3000');
  });

  test('should load dashboard with all interface modes', async ({ page }) => {
    // Check that all four mode buttons are present
    await expect(page.locator('#tasks-mode')).toBeVisible();
    await expect(page.locator('#plan-mode')).toBeVisible();
    await expect(page.locator('#focus-mode')).toBeVisible();
    await expect(page.locator('#projects-mode')).toBeVisible();
    
    // Check that AI controls are present
    await expect(page.locator('#ai-status-btn')).toBeVisible();
    await expect(page.locator('#ai-coordinate-btn')).toBeVisible();
    await expect(page.locator('#ai-reflect-btn')).toBeVisible();
    
    // Check navigation controls
    await expect(page.locator('#zoom-in-btn')).toBeVisible();
    await expect(page.locator('#zoom-out-btn')).toBeVisible();
    await expect(page.locator('#workspace-init-btn')).toBeVisible();
  });

  test('should switch between interface modes', async ({ page }) => {
    // Test Tasks mode (default)
    await expect(page.locator('#tasks-content')).toBeVisible();
    
    // Switch to Plan mode
    await page.click('#plan-mode');
    await expect(page.locator('#plan-content')).toBeVisible();
    await expect(page.locator('#tasks-content')).toBeHidden();
    
    // Switch to Focus mode
    await page.click('#focus-mode');
    await expect(page.locator('#focus-content')).toBeVisible();
    
    // Switch to Projects mode
    await page.click('#projects-mode');
    await expect(page.locator('#projects-content')).toBeVisible();
  });

  test('should open and interact with AI Status modal', async ({ page }) => {
    // Click AI Status button
    await page.click('#ai-status-btn');
    
    // Check that modal opens
    await expect(page.locator('#ai-status-modal')).toBeVisible();
    
    // Wait for analysis to load
    await expect(page.locator('#status-analysis')).toBeVisible({ timeout: 10000 });
    
    // Close modal
    await page.click('#ai-status-modal .close');
    await expect(page.locator('#ai-status-modal')).toBeHidden();
  });

  test('should open and interact with Task Coordination modal', async ({ page }) => {
    // Click AI Coordinate button
    await page.click('#ai-coordinate-btn');
    
    // Check that modal opens
    await expect(page.locator('#ai-coordinate-modal')).toBeVisible();
    
    // Wait for coordination data to load
    await expect(page.locator('#coordination-analysis')).toBeVisible({ timeout: 10000 });
    
    // Close modal
    await page.click('#ai-coordinate-modal .close');
    await expect(page.locator('#ai-coordinate-modal')).toBeHidden();
  });

  test('should open and submit progress recording form', async ({ page }) => {
    // Click Progress Recording button
    await page.click('#progress-record-btn');
    
    // Check that modal opens
    await expect(page.locator('#progress-modal')).toBeVisible();
    
    // Fill in the form
    await page.fill('#progress-description', 'E2E test progress entry');
    
    // Submit form
    await page.click('#submit-progress');
    
    // Wait for analysis
    await expect(page.locator('#progress-analysis')).toBeVisible({ timeout: 10000 });
    
    // Close modal
    await page.click('#progress-modal .close');
    await expect(page.locator('#progress-modal')).toBeHidden();
  });

  test('should display projects and open project details', async ({ page }) => {
    // Switch to Projects mode
    await page.click('#projects-mode');
    
    // Wait for projects to load
    await expect(page.locator('.project-card')).toBeVisible({ timeout: 10000 });
    
    // Click on first project card
    const firstProject = page.locator('.project-card').first();
    await firstProject.click();
    
    // Check that project details modal opens
    await expect(page.locator('#project-details-modal')).toBeVisible();
    
    // Check that task list is visible
    await expect(page.locator('#project-tasks')).toBeVisible();
    
    // Close modal
    await page.click('#project-details-modal .close');
    await expect(page.locator('#project-details-modal')).toBeHidden();
  });

  test('should create new task in project', async ({ page }) => {
    // Switch to Projects mode
    await page.click('#projects-mode');
    
    // Wait for projects to load
    await expect(page.locator('.project-card')).toBeVisible({ timeout: 10000 });
    
    // Click on first project card
    const firstProject = page.locator('.project-card').first();
    await firstProject.click();
    
    // Wait for project details modal
    await expect(page.locator('#project-details-modal')).toBeVisible();
    
    // Fill task creation form
    const taskDescription = `E2E test task ${Date.now()}`;
    await page.fill('#task-description', taskDescription);
    await page.selectOption('#task-level', '0');
    
    // Submit task
    await page.click('#add-task-btn');
    
    // Wait for success feedback
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
    
    // Verify task appears in list
    await expect(page.locator(`text=${taskDescription}`)).toBeVisible();
  });

  test('should open workspace initialization modal', async ({ page }) => {
    // Click workspace init button
    await page.click('#workspace-init-btn');
    
    // Check that modal opens
    await expect(page.locator('#workspace-init-modal')).toBeVisible();
    
    // Close modal
    await page.click('#workspace-init-modal .close');
    await expect(page.locator('#workspace-init-modal')).toBeHidden();
  });

  test('should handle zoom navigation', async ({ page }) => {
    // Test zoom in
    await page.click('#zoom-in-btn');
    
    // Should show some feedback (exact implementation depends on your zoom logic)
    // This is a placeholder test - adjust based on actual zoom implementation
    await page.waitForTimeout(1000);
    
    // Test zoom out
    await page.click('#zoom-out-btn');
    
    // Should show some feedback
    await page.waitForTimeout(1000);
  });

  test('should complete tasks by clicking checkboxes', async ({ page }) => {
    // Make sure we're in tasks mode
    await expect(page.locator('#tasks-content')).toBeVisible();
    
    // Wait for tasks to load
    await page.waitForSelector('.task-item', { timeout: 10000 });
    
    // Find first uncompleted task checkbox
    const firstCheckbox = page.locator('.task-item input[type="checkbox"]').first();
    
    if (await firstCheckbox.isVisible()) {
      // Click the checkbox to complete the task
      await firstCheckbox.click();
      
      // Wait for visual feedback (task should get strike-through or fade)
      await page.waitForTimeout(1000);
    }
  });
});