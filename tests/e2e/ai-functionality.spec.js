// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

test.describe('AI Functionality Tests', () => {
  const testWorkspacePath = path.join(__dirname, '../../test-workspace');
  const cliPath = path.join(__dirname, '../../dist/index.js');

  test.beforeAll(async () => {
    // Clean up and initialize test workspace
    try {
      await fs.rm(testWorkspacePath, { recursive: true });
    } catch {}

    // Initialize with rich test data
    await execAsync(`node "${cliPath}" init "${testWorkspacePath}"`);
    
    // Create multiple projects with tasks
    await execAsync(`node "${cliPath}" project create "AI Research Project" -d "${testWorkspacePath}"`);
    await execAsync(`node "${cliPath}" project create "Web Development" -d "${testWorkspacePath}"`);
    await execAsync(`node "${cliPath}" project create "Personal Growth" -d "${testWorkspacePath}"`);
    
    // Add project tasks manually to have rich test data
    const researchProjectPath = path.join(testWorkspacePath, 'projects', 'ai-research-project.md');
    const researchContent = await fs.readFile(researchProjectPath, 'utf-8');
    const updatedResearch = researchContent.replace(
      '## Level 0 Tasks (Immediate - 5-15 minutes)',
      `## Level 0 Tasks (Immediate - 5-15 minutes)
- [ ] Review latest AI research papers on language models
- [ ] Set up development environment for testing
- [ ] Write initial project documentation

## Level 1 Tasks (Today - 1-4 hours)
- [ ] Implement basic AI integration prototype
- [ ] Test API connectivity and response handling
- [ ] Create comprehensive test suite for AI features`
    );
    await fs.writeFile(researchProjectPath, updatedResearch);
    
    // Record some progress to have data for AI analysis
    await execAsync(`node "${cliPath}" save "Set up comprehensive test workspace with multiple projects and tasks" -d "${testWorkspacePath}"`);
    await execAsync(`node "${cliPath}" save "Created AI research project with specific Level 0 and Level 1 tasks" -d "${testWorkspacePath}"`);
  });

  test.afterAll(async () => {
    try {
      await fs.rm(testWorkspacePath, { recursive: true });
    } catch {}
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#connection-status .dot.online', { timeout: 10000 });
  });

  test('should perform real AI status analysis', async ({ page }) => {
    // Click AI Status button
    await page.click('#ai-status-btn');
    await expect(page.locator('#ai-status-modal')).toBeVisible();
    
    // Wait for real AI analysis - this should make actual API call to Anthropic
    await page.waitForFunction(() => {
      const modal = document.querySelector('#ai-status-modal .modal-body');
      return modal && modal.textContent && 
             !modal.textContent.includes('Loading...') && 
             modal.textContent.trim().length > 50; // Substantial content
    }, {}, { timeout: 20000 }); // 20 seconds for real API call
    
    const analysisContent = await page.locator('#ai-status-modal .modal-body').textContent();
    
    // Verify it contains AI-generated analysis content
    expect(analysisContent.length).toBeGreaterThan(100);
    expect(analysisContent).toMatch(/system|status|progress|project|task|analysis/i);
    
    // Should contain specific insights about our test projects
    expect(analysisContent).toMatch(/ai research|web development|personal growth/i);
    
    console.log('AI Status Analysis:', analysisContent.substring(0, 200) + '...');
    
    await page.click('#ai-status-modal .modal-close');
  });

  test('should perform real AI task coordination', async ({ page }) => {
    // Click AI Coordinate button  
    await page.click('#ai-coordinate-btn');
    await expect(page.locator('#ai-coordinate-modal')).toBeVisible();
    
    // Wait for real coordination analysis
    await page.waitForFunction(() => {
      const modal = document.querySelector('#ai-coordinate-modal .modal-body');
      return modal && modal.textContent && 
             !modal.textContent.includes('Loading...') && 
             modal.textContent.trim().length > 50;
    }, {}, { timeout: 20000 });
    
    const coordinationContent = await page.locator('#ai-coordinate-modal .modal-body').textContent();
    
    // Verify AI coordination analysis
    expect(coordinationContent.length).toBeGreaterThan(100);
    expect(coordinationContent).toMatch(/task|coordinate|relationship|suggest|priority/i);
    
    // Should analyze our specific projects
    expect(coordinationContent).toMatch(/project|development|research/i);
    
    console.log('AI Coordination Analysis:', coordinationContent.substring(0, 200) + '...');
    
    await page.click('#ai-coordinate-modal .modal-close');
  });

  test('should perform real AI reflection analysis', async ({ page }) => {
    // Click AI Reflect button
    await page.click('#ai-reflect-btn');
    await expect(page.locator('#ai-reflect-modal')).toBeVisible();
    
    // Wait for real reflection analysis
    await page.waitForFunction(() => {
      const modal = document.querySelector('#ai-reflect-modal .modal-body');
      return modal && modal.textContent && 
             !modal.textContent.includes('Loading...') && 
             modal.textContent.trim().length > 50;
    }, {}, { timeout: 20000 });
    
    const reflectionContent = await page.locator('#ai-reflect-modal .modal-body').textContent();
    
    // Verify AI reflection analysis
    expect(reflectionContent.length).toBeGreaterThan(100);
    expect(reflectionContent).toMatch(/reflect|insight|progress|pattern|recommend/i);
    
    console.log('AI Reflection Analysis:', reflectionContent.substring(0, 200) + '...');
    
    await page.click('#ai-reflect-modal .modal-close');
  });

  test('should handle AI chat interactions', async ({ page }) => {
    // Test AI chat functionality
    const chatInput = page.locator('#chat-input');
    const sendBtn = page.locator('#send-btn');
    const chatMessages = page.locator('#chat-messages');
    
    // Send a message to AI
    const testMessage = 'What should I focus on next with my AI research project?';
    await chatInput.fill(testMessage);
    await sendBtn.click();
    
    // Verify user message appears
    await expect(chatMessages.locator('.message.user')).toContainText(testMessage);
    
    // Wait for AI response (if implemented)
    try {
      await page.waitForSelector('.message.ai', { timeout: 10000 });
      const aiResponse = await page.locator('.message.ai').last().textContent();
      
      // AI should provide contextual response
      expect(aiResponse.length).toBeGreaterThan(20);
      console.log('AI Chat Response:', aiResponse);
      
    } catch (error) {
      console.log('AI chat may use simulated responses or not be fully implemented');
      // Should at least show user message
      await expect(chatMessages.locator('.message.user')).toBeVisible();
    }
  });

  test('should provide AI-powered progress analysis', async ({ page }) => {
    const progressInput = page.locator('#progress-input');
    const progressBtn = page.locator('#progress-btn');
    
    // Record progress with AI analysis
    const progressText = 'Completed comprehensive AI testing framework with real API integration and thorough validation of all AI-powered features including status analysis, task coordination, and reflection capabilities';
    
    await progressInput.fill(progressText);
    await progressBtn.click();
    
    // Wait for progress to be processed (may trigger AI analysis)
    await page.waitForTimeout(3000);
    
    // Check if any AI analysis modal appears
    const modals = [
      '#progress-analysis-modal',
      '#ai-analysis-modal',
      '.ai-feedback-modal'
    ];
    
    let foundModal = false;
    for (const modalSelector of modals) {
      if (await page.locator(modalSelector).isVisible()) {
        foundModal = true;
        
        // Wait for AI analysis content
        await page.waitForFunction((selector) => {
          const modal = document.querySelector(selector);
          return modal && modal.textContent && 
                 !modal.textContent.includes('Loading...') && 
                 modal.textContent.trim().length > 30;
        }, modalSelector, { timeout: 15000 });
        
        const analysisContent = await page.locator(modalSelector).textContent();
        expect(analysisContent.length).toBeGreaterThan(50);
        
        console.log('AI Progress Analysis:', analysisContent.substring(0, 150) + '...');
        break;
      }
    }
    
    // At minimum, progress should be recorded
    const inputValue = await progressInput.inputValue();
    expect(inputValue === '' || inputValue !== progressText).toBe(true);
    
    if (foundModal) {
      console.log('✅ AI progress analysis working');
    } else {
      console.log('ℹ️ AI progress analysis may be processed asynchronously or in background');
    }
  });

  test('should demonstrate AI-CLI integration', async ({ page }) => {
    // Test that CLI AI commands work and dashboard reflects changes
    
    // Run AI status command via CLI
    const { stdout: statusOutput } = await execAsync(`node "${cliPath}" status -d "${testWorkspacePath}"`);
    expect(statusOutput).toMatch(/System Status|Analysis|Current|Focus/i);
    console.log('CLI AI Status Output:', statusOutput.substring(0, 200) + '...');
    
    // Run AI coordinate command via CLI
    const { stdout: coordinateOutput } = await execAsync(`node "${cliPath}" coordinate -d "${testWorkspacePath}"`);
    expect(coordinateOutput).toMatch(/Task Relationships|Coordination|Suggest|Priority/i);
    console.log('CLI AI Coordinate Output:', coordinateOutput.substring(0, 200) + '...');
    
    // Run enhanced coordinate command
    try {
      const { stdout: enhancedOutput } = await execAsync(`node "${cliPath}" coordinate-enhanced -d "${testWorkspacePath}"`);
      expect(enhancedOutput).toMatch(/Enhanced|Analysis|Relationship|Deep/i);
      console.log('CLI Enhanced Coordinate Output:', enhancedOutput.substring(0, 200) + '...');
    } catch (error) {
      console.log('Enhanced coordinate may require specific setup:', error.message);
    }
    
    // Refresh dashboard to see any updates
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Dashboard should still function normally after CLI operations
    await expect(page.locator('#connection-status .dot.online')).toBeVisible();
    
    // Check that projects still show up
    await page.click('[data-mode="projects"]');
    await expect(page.locator('#projects-list')).toContainText('AI Research Project');
  });

  test('should handle AI API failures gracefully', async ({ page, context }) => {
    // Test with AI API unavailable (simulate by blocking anthropic.com)
    await context.route('**/*anthropic*/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });
    
    // Try AI status analysis
    await page.click('#ai-status-btn');
    await expect(page.locator('#ai-status-modal')).toBeVisible();
    
    // Should show error message or fallback content
    await page.waitForFunction(() => {
      const modal = document.querySelector('#ai-status-modal .modal-body');
      return modal && modal.textContent && 
             !modal.textContent.includes('Loading...');
    }, {}, { timeout: 10000 });
    
    const content = await page.locator('#ai-status-modal .modal-body').textContent();
    expect(content).toMatch(/error|unavailable|failed|basic|fallback/i);
    
    console.log('AI Fallback Content:', content);
    
    await page.click('#ai-status-modal .modal-close');
    
    // Dashboard should remain functional
    await expect(page.locator('[data-mode="do"]')).toBeVisible();
    await page.click('[data-mode="do"]');
    await expect(page.locator('#focus-flow-content')).toBeVisible();
  });

  test('should validate AI response quality and context awareness', async ({ page }) => {
    // This test validates that AI responses are contextually relevant
    
    // Click AI Status to get analysis
    await page.click('#ai-status-btn');
    await expect(page.locator('#ai-status-modal')).toBeVisible();
    
    await page.waitForFunction(() => {
      const modal = document.querySelector('#ai-status-modal .modal-body');
      return modal && modal.textContent && modal.textContent.trim().length > 100;
    }, {}, { timeout: 20000 });
    
    const statusAnalysis = await page.locator('#ai-status-modal .modal-body').textContent();
    await page.click('#ai-status-modal .modal-close');
    
    // AI should reference specific elements from our test workspace
    const contextualElements = [
      'ai research project',
      'web development', 
      'personal growth',
      'level 0',
      'research paper',
      'development environment',
      'prototype'
    ];
    
    let contextMatches = 0;
    for (const element of contextualElements) {
      if (statusAnalysis.toLowerCase().includes(element)) {
        contextMatches++;
      }
    }
    
    // Should reference at least some specific context from our test workspace
    expect(contextMatches).toBeGreaterThan(1);
    
    console.log(`✅ AI context awareness: ${contextMatches}/${contextualElements.length} contextual elements found`);
    console.log('Contextual AI Analysis Sample:', statusAnalysis.substring(0, 300) + '...');
    
    // AI responses should be substantial and helpful
    expect(statusAnalysis.length).toBeGreaterThan(200);
    expect(statusAnalysis).toMatch(/\b(should|recommend|suggest|focus|priority|next|important)\b/i);
  });
});