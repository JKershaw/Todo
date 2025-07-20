// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('UI Improvements Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('verify all content areas have proper scrolling', async ({ page }) => {
    // Test each mode for scrolling capability
    const modes = ['do', 'plan', 'reflect', 'projects'];
    
    for (const mode of modes) {
      await page.click(`[data-mode="${mode}"]`);
      await page.waitForTimeout(1000);
      
      const contentArea = page.locator(`#${mode}-content`);
      
      // Check if scrolling is enabled
      const hasScroll = await contentArea.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.overflowY === 'auto' || styles.overflowY === 'scroll';
      });
      
      expect(hasScroll).toBe(true);
      
      // Check max-height is set
      const maxHeight = await contentArea.evaluate((el) => {
        return window.getComputedStyle(el).maxHeight;
      });
      
      expect(maxHeight).not.toBe('none');
      console.log(`${mode} mode max-height: ${maxHeight}`);
    }
  });

  test('verify chat message improvements', async ({ page }) => {
    // Add some test messages
    await page.fill('#chat-input', 'Test user message');
    await page.click('#send-btn');
    await page.waitForTimeout(1000);

    // Click AI status to get an AI response
    await page.click('#ai-status-btn');
    await page.waitForTimeout(3000);

    // Check for improved chat message styling
    const userMessages = page.locator('.chat-message.user-message');
    const aiMessages = page.locator('.chat-message.ai-message');

    if (await userMessages.count() > 0) {
      const userMessageStyles = await userMessages.first().evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          marginLeft: styles.marginLeft,
          borderLeft: styles.borderLeft,
          background: styles.background,
          animation: styles.animation
        };
      });
      
      console.log('User message styles:', userMessageStyles);
      expect(userMessageStyles.marginLeft).toContain('px'); // Should have left margin
      expect(userMessageStyles.borderLeft).toContain('solid'); // Should have border
    }

    if (await aiMessages.count() > 0) {
      const aiMessageStyles = await aiMessages.first().evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          marginRight: styles.marginRight,
          borderLeft: styles.borderLeft,
          background: styles.background
        };
      });
      
      console.log('AI message styles:', aiMessageStyles);
      expect(aiMessageStyles.marginRight).toContain('px'); // Should have right margin
      expect(aiMessageStyles.borderLeft).toContain('solid'); // Should have border
    }
  });

  test('verify input field improvements', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    const progressInput = page.locator('#progress-input');

    // Test focus states
    await chatInput.focus();
    const chatFocusStyles = await chatInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        borderColor: styles.borderColor,
        boxShadow: styles.boxShadow,
        background: styles.background
      };
    });

    console.log('Chat input focus styles:', chatFocusStyles);
    expect(chatFocusStyles.boxShadow).toContain('rgba'); // Should have focus shadow

    await progressInput.focus();
    const progressFocusStyles = await progressInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        boxShadow: styles.boxShadow,
        transform: styles.transform
      };
    });

    console.log('Progress input focus styles:', progressFocusStyles);
    expect(progressFocusStyles.boxShadow).toContain('rgba'); // Should have focus shadow
  });

  test('verify right column scrolling on small screens', async ({ page }) => {
    // Test with a smaller viewport that might cause overflow
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForTimeout(500);

    const rightColumn = page.locator('.right-column');
    const hasScroll = await rightColumn.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        overflowY: styles.overflowY,
        maxHeight: styles.maxHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    });

    console.log('Right column scroll properties:', hasScroll);
    expect(hasScroll.overflowY).toBe('auto');
    expect(hasScroll.maxHeight).not.toBe('none');
  });

  test('verify scroll behavior with large content', async ({ page }) => {
    // Switch to projects mode and add large content
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000);

    // Simulate adding large content by injecting test content
    await page.evaluate(() => {
      const projectsContent = document.getElementById('projects-list');
      if (projectsContent) {
        const largeContent = '<div style="height: 800px; background: linear-gradient(to bottom, red, blue); padding: 20px;">Large test content that should trigger scrolling</div>';
        projectsContent.innerHTML = largeContent;
      }
    });

    await page.waitForTimeout(500);
    
    // Check if scrolling is working
    const projectsContainer = page.locator('#projects-content');
    const scrollTest = await projectsContainer.evaluate((el) => {
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        needsScroll: el.scrollHeight > el.clientHeight,
        canScroll: window.getComputedStyle(el).overflowY !== 'visible'
      };
    });

    console.log('Projects scroll test:', scrollTest);
    
    if (scrollTest.needsScroll) {
      expect(scrollTest.canScroll).toBe(true);
    }
  });
});