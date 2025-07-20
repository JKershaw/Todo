// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('UI Scrollability and Chat Analysis', () => {
  const screenshotsDir = path.join(__dirname, '../../test-results/ui-analysis');

  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('capture chat area in different states for analysis', async ({ page }) => {
    // Initial chat state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-initial-state.png'),
      clip: { x: 600, y: 150, width: 400, height: 600 }
    });

    // Fill chat with some messages to test scrolling
    await page.fill('#chat-input', 'Test message 1 - This is a longer message to see how it wraps and displays in the chat interface.');
    await page.click('#send-btn');
    await page.waitForTimeout(1000);

    await page.fill('#chat-input', 'Test message 2 - Another message to fill the chat area and test scrolling behavior when there are multiple messages.');
    await page.click('#send-btn');
    await page.waitForTimeout(1000);

    await page.fill('#chat-input', 'Test message 3 - Yet another message to continue filling the chat area with content.');
    await page.click('#send-btn');
    await page.waitForTimeout(1000);

    // Take screenshot with multiple messages
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-with-messages.png'),
      clip: { x: 600, y: 150, width: 400, height: 600 }
    });

    // Try AI status to add more content
    await page.click('#ai-status-btn');
    await page.waitForTimeout(3000);

    // Screenshot with AI response
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-with-ai-response.png'),
      clip: { x: 600, y: 150, width: 400, height: 600 }
    });

    // Test progress recording
    await page.fill('#progress-input', 'Testing progress recording functionality with a longer description to see how it handles text wrapping and display.');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-progress-filled.png'),
      clip: { x: 600, y: 150, width: 400, height: 600 }
    });

    await page.click('#progress-btn');
    await page.waitForTimeout(2000);

    // Screenshot after progress recording
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'chat-after-progress.png'),
      clip: { x: 600, y: 150, width: 400, height: 600 }
    });
  });

  test('analyze scrolling behavior in different modes', async ({ page }) => {
    // Do mode - Focus Flow content
    await page.click('[data-mode="do"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'do-mode-content.png'),
      clip: { x: 0, y: 150, width: 600, height: 600 }
    });

    // Plan mode
    await page.click('[data-mode="plan"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'plan-mode-content.png'),
      clip: { x: 0, y: 150, width: 600, height: 600 }
    });

    // Reflect mode
    await page.click('[data-mode="reflect"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'reflect-mode-content.png'),
      clip: { x: 0, y: 150, width: 600, height: 600 }
    });

    // Projects mode
    await page.click('[data-mode="projects"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'projects-mode-content.png'),
      clip: { x: 0, y: 150, width: 600, height: 600 }
    });
  });

  test('analyze right column scrolling and layout', async ({ page }) => {
    // Right column with AI controls and tools
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'right-column-full.png'),
      clip: { x: 950, y: 150, width: 350, height: 600 }
    });

    // Test what happens with smaller viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'compact-viewport-layout.png')
    });
  });

  test('check for overflow and scrolling issues', async ({ page }) => {
    // Check if any elements have overflow issues
    const overflowElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const overflows = [];
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        if (rect.width > window.innerWidth || rect.height > window.innerHeight) {
          if (styles.overflow === 'visible' && 
              !el.classList.contains('mode-switcher') && 
              !el.classList.contains('tooltip')) {
            overflows.push({
              tag: el.tagName,
              class: el.className,
              id: el.id,
              width: rect.width,
              height: rect.height,
              overflow: styles.overflow,
              overflowX: styles.overflowX,
              overflowY: styles.overflowY
            });
          }
        }
      });
      
      return overflows;
    });

    console.log('Elements with potential overflow issues:', overflowElements);

    // Check specific scrollable areas
    const scrollableAreas = await page.evaluate(() => {
      const areas = [
        '#chat-messages',
        '#do-content', 
        '#plan-content',
        '#reflect-content',
        '#projects-content',
        '.ai-controls',
        '.navigation-controls'
      ];
      
      return areas.map(selector => {
        const el = document.querySelector(selector);
        if (!el) return { selector, exists: false };
        
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        return {
          selector,
          exists: true,
          height: rect.height,
          scrollHeight: el.scrollHeight,
          overflow: styles.overflow,
          overflowY: styles.overflowY,
          needsScroll: el.scrollHeight > rect.height,
          canScroll: styles.overflowY === 'auto' || styles.overflowY === 'scroll'
        };
      });
    });

    console.log('Scrollable areas analysis:', scrollableAreas);

    // Generate analysis report
    const reportPath = path.join(screenshotsDir, 'scroll-analysis-report.md');
    const report = `# UI Scrollability Analysis Report

Generated: ${new Date().toISOString()}

## Overflow Issues Found
${overflowElements.length === 0 ? 'No overflow issues detected.' : 
  overflowElements.map(el => `- **${el.tag}** (${el.class || el.id}): ${el.width}x${el.height}px, overflow: ${el.overflow}`).join('\n')}

## Scrollable Areas Analysis
${scrollableAreas.map(area => `
### ${area.selector}
- Exists: ${area.exists}
${area.exists ? `- Height: ${area.height}px, Scroll Height: ${area.scrollHeight}px
- Needs Scroll: ${area.needsScroll}
- Can Scroll: ${area.canScroll}
- Overflow Y: ${area.overflowY}` : ''}
`).join('\n')}

## Screenshots Captured
- chat-initial-state.png
- chat-with-messages.png  
- chat-with-ai-response.png
- chat-progress-filled.png
- chat-after-progress.png
- do-mode-content.png
- plan-mode-content.png
- reflect-mode-content.png
- projects-mode-content.png
- right-column-full.png
- compact-viewport-layout.png

## Recommendations
Based on the analysis above, areas that need scrolling improvements will be identified.
`;

    fs.writeFileSync(reportPath, report);
    console.log(`Analysis report generated: ${reportPath}`);
  });
});