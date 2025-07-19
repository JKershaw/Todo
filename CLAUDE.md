# Claude Developer Guide

This guide helps Claude (and other AI assistants) effectively use and improve the productivity system.

## Quick Start: Finding and Managing Tasks

### 1. Get Current Tasks
```bash
# Get system overview and next actions
cd workspace && node ../dist/index.js status

# Get AI-powered task coordination insights
node ../dist/index.js coordinate

# Check specific project status
node ../dist/index.js project status [project-name]
```

### 2. Key Files to Check for Tasks
- **`workspace/plan.md`** - Current Level 0-4 priorities and immediate actions
- **`workspace/projects/`** - All project files with Level 0 tasks
- **`workspace/projects/build-productivity-system.md`** - Core system development tasks
- **Focus Flow API**: `curl http://localhost:3000/api/focus-flow` (when server running)

### 3. Task Completion Workflow
```bash
# Record completed work
node ../dist/index.js save "Completed [description of work]"

# Mark tasks complete via web dashboard (click tasks)
# Or complete via API: POST /api/tasks/complete

# Update project status
node ../dist/index.js project status [project-name]
```

## Using the Tool for Self-Improvement (Recursive Development)

### Core Philosophy
The productivity system manages its own development - this is the ultimate dogfooding test. When improving the system:

1. **Use the system to plan improvements**
2. **Track development tasks in the bootstrap project**
3. **Record progress with `save` command**
4. **Test changes using the system itself**

### Development Workflow

#### Planning New Features
```bash
# Create new project for feature development
node ../dist/index.js project create [feature-name]

# Or add to existing bootstrap project
# Edit: workspace/projects/build-productivity-system.md
```

#### Recording Development Progress
```bash
# Record completed work (AI will suggest file updates)
node ../dist/index.js save "Implemented [feature] with [details]"

# Get AI insights on next steps
node ../dist/index.js coordinate
```

#### System Health Checks
```bash
# Regular system analysis
node ../dist/index.js status

# Weekly reflection on development progress  
node ../dist/index.js reflect

# Check all projects
node ../dist/index.js project list
```

### Key Development Projects
- **`build-productivity-system.md`** - Core system development (95% complete)
- **`mockup-interface-redesign.md`** - UI redesign based on original mockup
- **`productivity-system-development-roadmap.md`** - Long-term vision and roadmap
- **`web-dashboard-for-early-user-feedback.md`** - Dashboard development

## Test Coverage Requirements

### Before Making Changes
```bash
# Always run tests before modifications
npm test

# Run specific test suites
npm run test:commands    # CLI command tests
npm run test:ai         # AI service tests  
npm run test:files      # File system tests
npm run test:e2e        # End-to-end integration
```

### Test Coverage Standards
- **Minimum 80% code coverage** for all new features
- **Unit tests** for all new commands and utilities
- **Integration tests** for AI service interactions
- **E2E tests** for complete workflows

### Adding Tests for New Features
1. **Unit Tests**: `src/[module]/__tests__/[module].test.ts`
2. **Integration Tests**: `tests/integration/[feature].test.ts`
3. **E2E Tests**: `tests/e2e/[workflow].test.ts`

```bash
# Run with coverage report
npm run test:coverage

# Watch mode during development
npm run test:watch
```

### Critical Test Scenarios
- **Command execution** with various workspace states
- **AI service integration** with both success and failure cases
- **File system operations** with proper error handling
- **Web dashboard** task completion and real-time updates
- **Cross-platform compatibility** (especially file paths)

## Keeping Documentation Updated

### Documentation Files to Maintain
- **`README.md`** - Main project documentation and quick start
- **`CLAUDE.md`** - This file - AI development guide
- **`workspace/plan.md`** - Current development priorities
- **`workspace/README.md`** - System status overview
- **Project files** in `workspace/projects/` - Individual project documentation

### Documentation Update Workflow
1. **After implementing features**: Update relevant documentation
2. **Use the system**: `node ../dist/index.js save "Updated documentation for [feature]"`
3. **Keep synchronized**: Ensure all docs reflect current reality
4. **Version consistency**: Update version numbers across files when releasing

### Documentation Standards
- **Accurate command examples** with current CLI syntax
- **Up-to-date file structures** and API endpoints
- **Working code examples** that can be copy-pasted
- **Current project status** and completion percentages
- **Clear Level 0 tasks** for immediate next actions

### Regular Documentation Reviews
```bash
# Monthly documentation review
node ../dist/index.js reflect

# Check for outdated information
grep -r "TODO\|FIXME\|outdated" workspace/
grep -r "TODO\|FIXME\|outdated" README.md
```

## AI Assistant Best Practices

### When Working on the System
1. **Always check current status first**: `node ../dist/index.js status`
2. **Use the coordinate command**: Get AI insights on task relationships
3. **Record all work**: Use `save` command to track progress
4. **Update project files**: Keep Level 0 tasks current
5. **Test thoroughly**: Run full test suite before committing
6. **Commit regularly**: Use descriptive commit messages with system context

### Task Identification Priority
1. **Level 0 tasks** in project files (immediate 5-15 min actions)
2. **Current plan.md priorities** (today's focus)
3. **AI coordination suggestions** (intelligent task ordering)
4. **System health issues** (failing tests, broken features)
5. **User requests and feedback** (new features, bug reports)

### Code Quality Standards
- **TypeScript types** for all new code
- **Error handling** with graceful degradation
- **Logging and debugging** support
- **Cross-platform compatibility**
- **Performance considerations** (especially for AI calls)

### Working with AI Services
- **Always handle AI failures gracefully** with fallback modes
- **Test with both real and mock AI services**
- **Monitor API usage and costs**
- **Validate AI JSON responses** before processing
- **Provide meaningful error messages** when AI fails

## Emergency Procedures

### If System is Broken
1. **Check basic functionality**: `node dist/index.js --help`
2. **Run tests**: `npm test` to identify failures
3. **Check recent changes**: `git log --oneline -10`
4. **Revert if necessary**: `git revert [commit-hash]`
5. **Test in clean environment**: Fresh clone and npm install

### If Tests are Failing
1. **Identify failing tests**: `npm test` and read output carefully
2. **Fix tests first**: Don't ignore failing tests
3. **Check environment**: Ensure all dependencies installed
4. **Update test data**: May need current workspace structure
5. **Add new tests**: If functionality changed

### If Documentation is Outdated
1. **Use the system**: `node ../dist/index.js save "Fixed outdated documentation"`
2. **Check all files**: README, project files, plan.md
3. **Update examples**: Ensure all code examples work
4. **Test workflows**: Follow documentation steps manually
5. **Keep synchronized**: All docs should reflect current state

## Development Environment Setup

### Prerequisites
- Node.js 18+ with npm
- Git for version control
- API key for Anthropic Claude (optional but recommended)

### Initial Setup
```bash
git clone [repository-url]
cd [repository-name]
npm install
npm run build

# Set up environment
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Initialize workspace
node dist/index.js init workspace
cd workspace

# Test system
node ../dist/index.js status
```

### Development Commands
```bash
# Development mode with auto-rebuild
npm run dev

# Build project
npm run build  

# Run all tests
npm test

# Start web dashboard
cd web-dashboard && npm run server:start
```

This guide ensures the productivity system continues to evolve effectively while maintaining quality and documentation standards. The recursive development approach - using the system to improve itself - demonstrates its real-world effectiveness and creates a sustainable development cycle.