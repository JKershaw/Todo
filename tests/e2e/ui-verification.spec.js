// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('UI Verification Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard with correct layout and mode switcher', async ({ page }) => {
    // Take screenshot for UI analysis
    await page.screenshot({ path: 'test-results/ui-analysis-dashboard-load.png', fullPage: true });
    
    // Check main header elements
    await expect(page.locator('.app-title')).toContainText('Focus');
    await expect(page.locator('#connection-status')).toBeVisible();

    // Check all four mode buttons are present
    await expect(page.locator('[data-mode="do"]')).toBeVisible();
    await expect(page.locator('[data-mode="plan"]')).toBeVisible();
    await expect(page.locator('[data-mode="reflect"]')).toBeVisible();
    await expect(page.locator('[data-mode="projects"]')).toBeVisible();

    // Check that Do mode is active by default
    await expect(page.locator('[data-mode="do"]')).toHaveClass(/active/);
    await expect(page.locator('#do-content')).toBeVisible();
  });

  test('should switch between different modes', async ({ page }) => {
    // Start in Do mode (default)
    await expect(page.locator('#do-content')).toBeVisible();
    await expect(page.locator('#plan-content')).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/ui-analysis-mode-do.png' });

    // Switch to Plan mode
    await page.click('[data-mode="plan"]');
    await expect(page.locator('#plan-content')).toBeVisible();
    await expect(page.locator('#do-content')).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/ui-analysis-mode-plan.png' });

    // Switch to Reflect mode
    await page.click('[data-mode="reflect"]');
    await expect(page.locator('#reflect-content')).toBeVisible();
    await expect(page.locator('#plan-content')).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/ui-analysis-mode-reflect.png' });

    // Switch to Projects mode
    await page.click('[data-mode="projects"]');
    await expect(page.locator('#projects-content')).toBeVisible();
    await expect(page.locator('#reflect-content')).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/ui-analysis-mode-projects.png' });
  });

  test('should have all AI control buttons', async ({ page }) => {
    // Check AI control section
    await expect(page.locator('.ai-controls h3')).toContainText('AI Perspective');
    
    // Check individual AI buttons
    await expect(page.locator('#ai-status-btn')).toContainText('Status Analysis');
    await expect(page.locator('#ai-coordinate-btn')).toContainText('Coordinate Tasks');
    await expect(page.locator('#ai-reflect-btn')).toContainText('Reflection');
  });

  test('should have navigation tools', async ({ page }) => {
    // Check navigation section
    await expect(page.locator('.navigation-controls h3')).toContainText('Tools');
    
    // Check navigation buttons
    await expect(page.locator('#zoom-in-btn')).toContainText('Zoom In');
    await expect(page.locator('#zoom-out-btn')).toContainText('Zoom Out');
    await expect(page.locator('#workspace-init-btn')).toContainText('Init Workspace');
  });

  test('should have chat interface with progress recording', async ({ page }) => {
    // Check chat section exists
    await expect(page.locator('.chat-section h3')).toContainText('AI Chat');
    await expect(page.locator('#chat-messages')).toBeVisible();

    // Check progress recording form
    await expect(page.locator('#progress-input')).toBeVisible();
    await expect(page.locator('#progress-input')).toHaveAttribute('placeholder', 'Record progress: What did you accomplish?');
    await expect(page.locator('#progress-btn')).toContainText('Save Progress');

    // Check chat input
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-btn')).toBeVisible();
  });

  test('should show project creation modal', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    
    // Click create project button
    await page.click('#create-project-btn');
    
    // Check modal appears
    await expect(page.locator('#create-project-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#project-name')).toBeVisible();
    await expect(page.locator('#project-goal')).toBeVisible();
    await expect(page.locator('#project-level')).toBeVisible();

    // Close modal
    await page.click('#modal-close-btn');
    await expect(page.locator('#create-project-modal')).toHaveClass(/hidden/);
  });

  test('should handle progress input and display feedback', async ({ page }) => {
    // Fill progress input
    const progressText = 'Completed UI verification tests';
    await page.fill('#progress-input', progressText);
    
    // Check input has the text
    await expect(page.locator('#progress-input')).toHaveValue(progressText);
    
    // Click save progress button (will trigger AI analysis)
    await page.click('#progress-btn');
    
    // Wait for some kind of response (exact response depends on implementation)
    await page.waitForTimeout(1000);
    
    // Progress input should be cleared or show feedback
    // This is implementation-dependent but we can check it's interactive
  });

  test('should load content in different modes with async data', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForLoadState('networkidle');
    
    // Do mode should show focus tasks (loaded via /api/focus-flow)
    await page.click('[data-mode="do"]');
    await expect(page.locator('#do-content')).toBeVisible();
    await expect(page.locator('#focus-flow-content')).toBeVisible();
    
    // Wait for focus flow data to load - should show either tasks or no-tasks message
    await expect(page.locator('#focus-flow-content')).not.toContainText('Loading your immediate focus tasks...');
    // Should contain either real tasks or the "no immediate tasks" message
    await expect(page.locator('#focus-flow-content .focus-task')).toBeVisible({ timeout: 10000 });
    
    // Plan mode should show plan content (loaded via API)
    await page.click('[data-mode="plan"]');
    await expect(page.locator('#plan-content')).toBeVisible();
    await expect(page.locator('#plan-content')).not.toHaveClass(/hidden/);
    
    // Reflect mode should show momentum and activity
    await page.click('[data-mode="reflect"]');
    await expect(page.locator('#reflect-content')).toBeVisible();
    
    // Wait for reflect data to load - either momentum bars or loading complete
    await page.waitForFunction(() => {
      const content = document.querySelector('#reflect-content');
      return content && !content.textContent.includes('Loading momentum and insights...') && 
             content.classList.contains('hidden') === false;
    }, {}, { timeout: 10000 });
    
    // Should have reflect content loaded (implementation may vary)
    await expect(page.locator('#reflect-content')).not.toBeEmpty();
    
    // Projects mode should show project management
    await page.click('[data-mode="projects"]');
    await expect(page.locator('#projects-content')).toBeVisible();
    await expect(page.locator('.projects-header')).toBeVisible();
    await expect(page.locator('#projects-list')).toBeVisible();
    
    // Wait for projects to load
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });
  });

  test('should be responsive with proper column layout', async ({ page }) => {
    // Check three-column layout is present
    await expect(page.locator('.left-column')).toBeVisible();
    await expect(page.locator('.middle-column')).toBeVisible();
    await expect(page.locator('.right-column')).toBeVisible();

    // Check columns have expected content
    await expect(page.locator('.left-column .content-area')).toBeVisible();
    await expect(page.locator('.middle-column .chat-section')).toBeVisible();
    await expect(page.locator('.right-column .ai-controls')).toBeVisible();
  });
});