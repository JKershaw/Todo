// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

test.describe('Projects Styling Bug - With Real Data', () => {
  const testWorkspaceDir = path.join(__dirname, '../../test-workspace-projects');
  const projectsDir = path.join(testWorkspaceDir, 'projects');

  test.beforeAll(async () => {
    // Create test workspace with real project data
    await fs.mkdir(testWorkspaceDir, { recursive: true });
    await fs.mkdir(projectsDir, { recursive: true });

    // Create a sample project file with realistic content
    const projectContent = `# Project: Test Project

**Status:** Active  
**Level:** 2

## Goal
Build a comprehensive testing framework for UI validation

## Level 4 Connection (Life Goal)
Create better development tools and workflows

## Level 3 Milestones (Quarterly)
- [x] Set up basic project structure
- [ ] Complete UI testing implementation
- [ ] Deploy to production

## Level 2 Projects (Current Sprint)
- [x] Create project management system
- [ ] Implement comprehensive testing
- [x] Add styling validation

## Level 1 Tasks (This Week)
- [ ] Fix styling bugs in projects area
- [ ] Add automated test coverage
- [x] Create test project for validation

## Level 0 Actions (Next 15 minutes)
- [ ] Run tests to verify fix works
- [ ] Check styling consistency
- [x] Create sample project data

## Completed
- [x] Initial project setup
- [x] Basic structure implementation
`;

    await fs.writeFile(path.join(projectsDir, 'test-project.md'), projectContent);
    
    // Create a second project for more comprehensive testing
    const project2Content = `# Project: UI Enhancement Project

**Status:** Active
**Level:** 2

## Goal
Enhance the user interface with better visual feedback and accessibility

## Level 1 Tasks (This Week)
- [ ] Improve button hierarchy
- [x] Add responsive design features
- [ ] Implement dark mode toggle

## Level 0 Actions (Next 15 minutes)
- [ ] Test responsive layouts
- [x] Validate accessibility improvements
`;

    await fs.writeFile(path.join(projectsDir, 'ui-enhancement-project.md'), project2Content);
  });

  test.afterAll(async () => {
    // Clean up test workspace
    try {
      await fs.rmdir(testWorkspaceDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should not display raw markdown when projects exist and periodic refresh occurs', async ({ page }) => {
    // Set custom workspace for this test
    await page.addInitScript((workspace) => {
      window.TEST_WORKSPACE_PATH = workspace;
    }, testWorkspaceDir);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(2000);
    
    // Wait for projects to load - should have project cards now
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && (
        projectsList.querySelector('.project-card') || 
        !projectsList.textContent.includes('Loading projects...')
      );
    }, {}, { timeout: 15000 });

    // Take screenshot of initial load
    await page.screenshot({ 
      path: 'test-results/projects-with-data-initial.png',
      fullPage: false
    });

    // Verify we have properly styled project cards (not raw text)
    const hasProjectCards = await page.locator('.project-card').count();
    console.log('Project cards found:', hasProjectCards);

    // Check for signs of raw markdown content (the bug)
    const hasRawMarkdown = await page.evaluate(() => {
      const projectsList = document.querySelector('#projects-list');
      const text = projectsList?.textContent || '';
      return {
        hasLevelHeaders: text.includes('## Level'),
        hasStatusMarkdown: text.includes('**Status:**'),
        hasTaskMarkers: text.includes('- [x]') || text.includes('- [ ]'),
        hasGoalHeaders: text.includes('## Goal'),
        fullText: text
      };
    });

    console.log('Initial markdown check:', hasRawMarkdown);

    // Should NOT have raw markdown in initial state
    expect(hasRawMarkdown.hasLevelHeaders).toBe(false);
    expect(hasRawMarkdown.hasStatusMarkdown).toBe(false);
    expect(hasRawMarkdown.hasTaskMarkers).toBe(false);
    expect(hasRawMarkdown.hasGoalHeaders).toBe(false);

    // Now trigger the periodic refresh that was causing the bug
    await page.evaluate(() => {
      if (window.dashboard && window.dashboard.loadProjectsData) {
        return window.dashboard.loadProjectsData();
      }
    });

    // Wait for refresh to complete
    await page.waitForTimeout(3000);

    // Take screenshot after refresh
    await page.screenshot({ 
      path: 'test-results/projects-with-data-after-refresh.png',
      fullPage: false
    });

    // Check for raw markdown after refresh (this was the bug)
    const hasRawMarkdownAfter = await page.evaluate(() => {
      const projectsList = document.querySelector('#projects-list');
      const text = projectsList?.textContent || '';
      return {
        hasLevelHeaders: text.includes('## Level'),
        hasStatusMarkdown: text.includes('**Status:**'),
        hasTaskMarkers: text.includes('- [x]') || text.includes('- [ ]'),
        hasGoalHeaders: text.includes('## Goal'),
        fullText: text.substring(0, 500) // First 500 chars for debugging
      };
    });

    console.log('After refresh markdown check:', hasRawMarkdownAfter);

    // CRITICAL TEST: Should still NOT have raw markdown after refresh
    expect(hasRawMarkdownAfter.hasLevelHeaders).toBe(false);
    expect(hasRawMarkdownAfter.hasStatusMarkdown).toBe(false);
    expect(hasRawMarkdownAfter.hasTaskMarkers).toBe(false);
    expect(hasRawMarkdownAfter.hasGoalHeaders).toBe(false);

    // Should still have properly structured project cards
    const hasProjectCardsAfter = await page.locator('.project-card').count();
    console.log('Project cards after refresh:', hasProjectCardsAfter);
    
    expect(hasProjectCardsAfter).toBeGreaterThan(0);

    // Verify project cards have proper styling applied
    if (hasProjectCardsAfter > 0) {
      const firstCard = page.locator('.project-card').first();
      
      // Check key styling properties
      const cardStyles = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          background: computed.background,
          borderRadius: computed.borderRadius,
          backdropFilter: computed.backdropFilter,
          padding: computed.padding
        };
      });

      console.log('Card styling after refresh:', cardStyles);

      // Should have glassmorphism styling applied
      expect(cardStyles.borderRadius).toBe('12px');
      expect(cardStyles.backdropFilter).toContain('blur');
      expect(cardStyles.padding).toContain('20px');
    }
  });
});