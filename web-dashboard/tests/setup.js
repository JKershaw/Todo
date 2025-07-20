// Global test setup
const fs = require('fs').promises;
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Clean up function for test workspaces
global.cleanupTestWorkspace = async (workspacePath) => {
  try {
    await fs.rm(workspacePath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up test workspace ${workspacePath}:`, error.message);
  }
};

// Create test workspace function
global.createTestWorkspace = async (workspacePath) => {
  try {
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'projects'), { recursive: true });
    return true;
  } catch (error) {
    console.error(`Failed to create test workspace ${workspacePath}:`, error.message);
    return false;
  }
};

// Global test utilities
global.testUtils = {
  createMockProject: (name, content) => ({
    name,
    content: content || `# Project: ${name}

**Status:** Active
**Level:** 2

## Goal
Test project

## Level 0 Actions (Next 15 minutes)
- [ ] Test task

## Level 2 Tasks (Current Sprint)
- [ ] Sprint task
`
  }),
  
  createMockTask: (description, completed = false) => ({
    task: description,
    project: 'Test Project',
    file: 'test-project.md',
    completed
  }),
  
  mockWorkspaceContext: () => `=== WORKSPACE README ===
# Test Workspace

This is a test workspace for API testing.

=== PROJECT: test-project.md ===
# Project: Test Project

**Status:** Active
**Level:** 2

## Goal
Testing project

## Level 0 Actions (Next 15 minutes)
- [ ] Test task 1
- [x] Completed test task
`
};