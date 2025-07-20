// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Projects Area Styling Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should maintain styled project cards after periodic refresh', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(2000);
    
    // Wait for projects to load and check we have project cards or empty state
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && (
        projectsList.querySelector('.project-card') || 
        projectsList.textContent.includes('No projects found')
      );
    }, {}, { timeout: 10000 });

    // Take screenshot of properly loaded state
    await page.screenshot({ 
      path: 'test-results/projects-properly-loaded.png',
      fullPage: false
    });

    // Get the current content to compare
    const initialContent = await page.locator('#projects-list').innerHTML();
    
    // Force the periodic loadProjectsData refresh that was causing the bug
    await page.evaluate(() => {
      if (window.dashboard && window.dashboard.loadProjectsData) {
        return window.dashboard.loadProjectsData();
      }
    });

    // Wait a bit for any refresh to complete
    await page.waitForTimeout(2000);

    // Take screenshot after refresh
    await page.screenshot({ 
      path: 'test-results/projects-after-periodic-refresh.png',
      fullPage: false 
    });

    // Get content after refresh
    const afterRefreshContent = await page.locator('#projects-list').innerHTML();
    
    // Verify the content hasn't changed to raw text
    expect(afterRefreshContent).toBe(initialContent);
    
    // Also verify we don't have raw markdown content showing
    const hasRawMarkdown = await page.evaluate(() => {
      const projectsList = document.querySelector('#projects-list');
      const text = projectsList.textContent || '';
      return text.includes('## Level') || text.includes('**Status:**') || text.includes('- [x]');
    });
    
    expect(hasRawMarkdown).toBe(false);
    
    // Verify we still have proper project structure (cards OR empty state)
    const hasValidStructure = await page.evaluate(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList.querySelector('.project-card') || 
             projectsList.querySelector('.empty-state') ||
             projectsList.textContent.includes('No projects found');
    });
    
    expect(hasValidStructure).toBe(true);
  });

  test('should maintain consistent styling in projects area before and after refresh', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000); // Allow content to load
    
    // Wait for projects to load
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });

    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/projects-initial-styling.png',
      clip: { x: 0, y: 200, width: 800, height: 600 }
    });

    // Capture initial styling properties of project cards
    const initialProjectCards = await page.locator('.project-card').all();
    const initialStyles = [];

    for (const card of initialProjectCards) {
      if (await card.isVisible()) {
        const styles = await card.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            background: computed.background,
            borderRadius: computed.borderRadius,
            padding: computed.padding,
            boxShadow: computed.boxShadow,
            transform: computed.transform,
            opacity: computed.opacity
          };
        });
        initialStyles.push(styles);
      }
    }

    console.log('Initial project cards found:', initialStyles.length);

    // Trigger refresh by switching away and back to projects
    await page.click('[data-mode="do"]');
    await page.waitForTimeout(500);
    await page.click('[data-mode="projects"]');
    
    // Wait for projects to reload
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });

    // Take screenshot after refresh
    await page.screenshot({ 
      path: 'test-results/projects-after-refresh-styling.png',
      clip: { x: 0, y: 200, width: 800, height: 600 }
    });

    // Capture styling properties after refresh
    const refreshedProjectCards = await page.locator('.project-card').all();
    const refreshedStyles = [];

    for (const card of refreshedProjectCards) {
      if (await card.isVisible()) {
        const styles = await card.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            background: computed.background,
            borderRadius: computed.borderRadius,
            padding: computed.padding,
            boxShadow: computed.boxShadow,
            transform: computed.transform,
            opacity: computed.opacity
          };
        });
        refreshedStyles.push(styles);
      }
    }

    console.log('Refreshed project cards found:', refreshedStyles.length);

    // Compare styling - should be identical
    expect(refreshedStyles.length).toBeGreaterThan(0); // Should have project cards
    expect(refreshedStyles.length).toBe(initialStyles.length); // Same number of cards

    // Compare each card's styling
    for (let i = 0; i < initialStyles.length; i++) {
      const initial = initialStyles[i];
      const refreshed = refreshedStyles[i];
      
      // These should be identical for proper styling
      expect(refreshed.background).toBe(initial.background);
      expect(refreshed.borderRadius).toBe(initial.borderRadius); 
      expect(refreshed.padding).toBe(initial.padding);
      expect(refreshed.boxShadow).toBe(initial.boxShadow);
      expect(refreshed.opacity).toBe(initial.opacity);
    }
  });

  test('should verify project cards have proper CSS classes after refresh', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000);
    
    // Wait for projects to load
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });

    // Force a refresh by calling the loadProjectsList method directly
    await page.evaluate(() => {
      if (window.dashboard && window.dashboard.loadProjectsList) {
        window.dashboard.loadProjectsList();
      }
    });

    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Check that project cards still have proper classes and styling
    const projectCards = page.locator('.project-card');
    const cardCount = await projectCards.count();
    
    if (cardCount > 0) {
      // Verify first project card has proper structure
      const firstCard = projectCards.first();
      
      // Should have project-card class
      await expect(firstCard).toHaveClass(/project-card/);
      
      // Should have proper child elements with classes
      await expect(firstCard.locator('.project-card-header')).toBeVisible();
      await expect(firstCard.locator('.project-title')).toBeVisible();
      await expect(firstCard.locator('.project-status')).toBeVisible();
      
      // Should have computed styles indicating CSS is applied
      const hasBackground = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        // Check if backdrop-filter or background is applied (indicates CSS loaded)
        return computed.backdropFilter !== 'none' || 
               computed.background.includes('rgba') ||
               computed.backgroundColor !== 'rgba(0, 0, 0, 0)';
      });
      
      expect(hasBackground).toBe(true);
      
      // Check if border-radius is applied (12px expected)
      const borderRadius = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      expect(borderRadius).toBe('12px');
    }
  });

  test('should detect if projects area loses glassmorphism effects on refresh', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000);
    
    // Wait for projects to load
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });

    const projectCards = page.locator('.project-card');
    const cardCount = await projectCards.count();
    
    if (cardCount > 0) {
      const firstCard = projectCards.first();
      
      // Capture initial glassmorphism properties
      const initialGlassmorphism = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backdropFilter: computed.backdropFilter,
          background: computed.background,
          border: computed.border,
          boxShadow: computed.boxShadow
        };
      });

      console.log('Initial glassmorphism:', initialGlassmorphism);

      // Trigger refresh
      await page.evaluate(() => {
        if (window.dashboard && window.dashboard.loadProjectsList) {
          window.dashboard.loadProjectsList();
        }
      });

      await page.waitForTimeout(2000);
      
      // Check glassmorphism after refresh
      const refreshedGlassmorphism = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backdropFilter: computed.backdropFilter,
          background: computed.background,
          border: computed.border,
          boxShadow: computed.boxShadow
        };
      });

      console.log('Refreshed glassmorphism:', refreshedGlassmorphism);

      // Verify glassmorphism is maintained
      expect(refreshedGlassmorphism.backdropFilter).toBe(initialGlassmorphism.backdropFilter);
      expect(refreshedGlassmorphism.background).toBe(initialGlassmorphism.background);
      expect(refreshedGlassmorphism.border).toBe(initialGlassmorphism.border);
      expect(refreshedGlassmorphism.boxShadow).toBe(initialGlassmorphism.boxShadow);
    }
  });

  test('should maintain hover effects on project cards after refresh', async ({ page }) => {
    // Switch to projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000);
    
    // Wait for projects to load
    await page.waitForFunction(() => {
      const projectsList = document.querySelector('#projects-list');
      return projectsList && !projectsList.textContent.includes('Loading projects...');
    }, {}, { timeout: 10000 });

    const projectCards = page.locator('.project-card');
    const cardCount = await projectCards.count();
    
    if (cardCount > 0) {
      const firstCard = projectCards.first();
      
      // Test hover before refresh
      await firstCard.hover();
      await page.waitForTimeout(300); // Allow transition
      
      const hoverStyleBefore = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          transform: computed.transform,
          boxShadow: computed.boxShadow
        };
      });

      console.log('Hover style before refresh:', hoverStyleBefore);

      // Move away from hover
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);

      // Trigger refresh
      await page.evaluate(() => {
        if (window.dashboard && window.dashboard.loadProjectsList) {
          window.dashboard.loadProjectsList();
        }
      });

      await page.waitForTimeout(2000);
      
      // Test hover after refresh
      await firstCard.hover();
      await page.waitForTimeout(300);
      
      const hoverStyleAfter = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          transform: computed.transform,
          boxShadow: computed.boxShadow
        };
      });

      console.log('Hover style after refresh:', hoverStyleAfter);

      // Hover effects should be present (transform should not be 'none')
      expect(hoverStyleAfter.transform).not.toBe('none');
      expect(hoverStyleAfter.boxShadow).toContain('rgba'); // Should have shadow with alpha
    }
  });
});