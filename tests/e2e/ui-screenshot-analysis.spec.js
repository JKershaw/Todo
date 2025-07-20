// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('UI Screenshot Analysis Tests', () => {
  const screenshotsDir = path.join(__dirname, '../../test-results/screenshots');

  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial load and network settling
    await page.waitForLoadState('networkidle');
  });

  test('capture full dashboard layout for visual analysis', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard-full-layout.png'),
      fullPage: true 
    });

    // Take viewport screenshot for above-fold analysis
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard-viewport.png') 
    });

    // Verify main layout elements are present
    await expect(page.locator('.left-column')).toBeVisible();
    await expect(page.locator('.middle-column')).toBeVisible();
    await expect(page.locator('.right-column')).toBeVisible();
  });

  test('capture mode switching UI states', async ({ page }) => {
    const modes = ['do', 'plan', 'reflect', 'projects'];
    
    for (const mode of modes) {
      // Switch to mode
      await page.click(`[data-mode="${mode}"]`);
      await page.waitForTimeout(500); // Allow transition
      
      // Take screenshot of active mode
      await page.screenshot({ 
        path: path.join(screenshotsDir, `mode-${mode}-active.png`) 
      });
      
      // Verify mode is active
      await expect(page.locator(`[data-mode="${mode}"]`)).toHaveClass(/active/);
      await expect(page.locator(`#${mode}-content`)).toBeVisible();
    }
  });

  test('capture responsive layout at different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-standard' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 812, name: 'mobile-iphone' },
      { width: 360, height: 640, name: 'mobile-android' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300); // Allow layout adjustment
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, `responsive-${viewport.name}.png`) 
      });
      
      // Verify layout adapts appropriately
      const columns = await page.locator('.left-column, .middle-column, .right-column').count();
      if (viewport.width < 768) {
        // Mobile should stack columns or hide some
        console.log(`Mobile layout (${viewport.name}): ${columns} columns visible`);
      } else {
        // Desktop should show all columns
        expect(columns).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('capture UI interactions and state changes', async ({ page }) => {
    // Initial state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-initial.png') 
    });

    // Hover states on buttons
    await page.hover('#ai-status-btn');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-hover-ai-status.png') 
    });

    await page.hover('#zoom-in-btn');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-hover-zoom.png') 
    });

    // Modal interaction
    await page.click('[data-mode="projects"]');
    await page.click('#create-project-btn');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-modal-open.png') 
    });

    // Form states
    await page.fill('#project-name', 'Test Project');
    await page.fill('#project-goal', 'Test Goal');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-form-filled.png') 
    });

    await page.click('#modal-close-btn');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'interaction-modal-closed.png') 
    });
  });

  test('capture loading and error states', async ({ page }) => {
    // Capture loading states by intercepting API calls
    await page.route('**/api/focus-flow', route => {
      // Delay response to capture loading state
      setTimeout(() => {
        route.fulfill({ 
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [] })
        });
      }, 2000);
    });

    await page.goto('/');
    
    // Capture loading state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'state-loading.png') 
    });
    
    // Wait for load complete
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'state-loaded.png') 
    });

    // Test error state by intercepting with error
    await page.route('**/api/status', route => {
      route.fulfill({ 
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error' })
      });
    });

    await page.click('#ai-status-btn');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'state-error.png') 
    });
  });

  test('capture focus flow visualization states', async ({ page }) => {
    // Switch to Do mode for focus flow
    await page.click('[data-mode="do"]');
    await page.waitForLoadState('networkidle');
    
    // Capture focus flow in different states
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'focus-flow-loaded.png') 
    });

    // Take screenshot of individual focus task if present
    const focusTasks = page.locator('.focus-task');
    const taskCount = await focusTasks.count();
    
    if (taskCount > 0) {
      await focusTasks.first().screenshot({ 
        path: path.join(screenshotsDir, 'focus-task-individual.png') 
      });
      
      // Capture task interaction (hover/click)
      await focusTasks.first().hover();
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'focus-task-hover.png') 
      });
    }

    // Capture different zoom levels if zoom functionality exists
    const zoomButtons = ['#zoom-in-btn', '#zoom-out-btn'];
    for (const button of zoomButtons) {
      const buttonEl = page.locator(button);
      if (await buttonEl.isVisible()) {
        await buttonEl.click();
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `focus-flow-${button.replace('#', '').replace('-btn', '')}.png`) 
        });
      }
    }
  });

  test('capture AI chat interface states', async ({ page }) => {
    // Initial chat state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-initial.png') 
    });

    // Fill chat input
    await page.fill('#chat-input', 'Test message for UI analysis');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-input-filled.png') 
    });

    // Fill progress input
    await page.fill('#progress-input', 'Completed screenshot analysis implementation');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'progress-input-filled.png') 
    });

    // Focus states
    await page.focus('#chat-input');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-input-focused.png') 
    });

    await page.focus('#progress-input');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'progress-input-focused.png') 
    });
  });

  test('capture theme and styling consistency', async ({ page }) => {
    // Capture overall color scheme and styling
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'theme-overall.png') 
    });

    // Capture specific UI components for style analysis
    const components = [
      { selector: '.mode-switcher', name: 'mode-switcher' },
      { selector: '.ai-controls', name: 'ai-controls' },
      { selector: '.navigation-controls', name: 'navigation-controls' },
      { selector: '.chat-section', name: 'chat-section' },
      { selector: '#create-project-modal', name: 'modal', action: () => page.click('#create-project-btn') }
    ];

    for (const component of components) {
      if (component.action) {
        await page.click('[data-mode="projects"]');
        await component.action();
        await page.waitForTimeout(300);
      }
      
      const element = page.locator(component.selector);
      if (await element.isVisible()) {
        await element.screenshot({ 
          path: path.join(screenshotsDir, `component-${component.name}.png`) 
        });
      }
      
      if (component.action) {
        await page.keyboard.press('Escape'); // Close modal
      }
    }
  });

  test.afterAll(async () => {
    // Generate screenshot analysis report
    const reportPath = path.join(screenshotsDir, 'analysis-report.md');
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    
    const report = `# UI Screenshot Analysis Report

Generated: ${new Date().toISOString()}
Total Screenshots: ${screenshots.length}

## Screenshots Captured

${screenshots.map(screenshot => `- ![${screenshot}](${screenshot})`).join('\n')}

## Analysis Points

### Layout Consistency
- Check column alignment across different modes
- Verify responsive breakpoints work correctly
- Ensure spacing and margins are consistent

### Visual Hierarchy
- Verify button prominence and grouping
- Check typography scales and contrast
- Ensure focus states are clearly visible

### Interactive States
- Hover states should provide clear feedback
- Loading states should be informative
- Error states should be helpful and clear

### Cross-Browser Compatibility
- Screenshots captured across Chromium, Firefox, and WebKit
- Check for rendering differences
- Verify responsive behavior consistency

## Next Steps
1. Review screenshots for visual inconsistencies
2. Identify areas for UI improvement
3. Create design system documentation
4. Implement visual regression testing

## Files for Review
${screenshots.map(s => `- ${s}`).join('\n')}
`;

    fs.writeFileSync(reportPath, report);
    console.log(`Screenshot analysis report generated: ${reportPath}`);
  });
});