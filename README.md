# Productivity System

A minimal, markdown-based, local-first personal productivity system for developers. This system uses AI transparently to help manage tasks across scale levels (0-4) while keeping all data in human-readable files.

## Philosophy

- **Local-first**: All data in human-readable markdown/YAML files
- **AI-transparent**: AI suggests, human decides, no silent changes
- **Scale-aware**: Organize tasks across zoom levels 0-4 (immediate → life goals)
- **Minimal**: Text files over databases, simple commands over complex UI
- **Gentle**: Supportive guidance, not harsh accountability

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Initialize a workspace**
   ```bash
   node dist/index.js init ./my-workspace
   cd my-workspace
   ```

4. **Set up AI integration** (optional but recommended)
   ```bash
   # Create .env file in project root
   echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
   
   # Or export directly
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

5. **Check your status**
   ```bash
   node ../dist/index.js status
   ```

## Core Commands

### `prod init <directory>`
Creates initial file structure with templates, including a self-bootstrapping project for system development.

```bash
prod init ./my-productivity-workspace
```

### `prod status`
Analyzes all files and provides current system state using AI insights.

```bash
prod status
```

### `prod save "<description>"`
Records completion or progress, updates relevant files with AI suggestions.

```bash
prod save "Completed user authentication module"
```

### `prod zoom <in|out|level N>`
Navigate between scale levels for perspective.

```bash
prod zoom in          # Zoom into more immediate tasks
prod zoom out         # Zoom out to higher-level goals  
prod zoom level 2     # Jump to project level
```

## Zoom Levels

The system organizes work across 5 scale levels:

- **Level 0**: Immediate (5-15 min actions)
- **Level 1**: Daily/Weekly (1-3 hour tasks)
- **Level 2**: Projects (days-weeks)
- **Level 3**: Quarterly goals (1-3 months)
- **Level 4**: Annual/life goals

## File Structure

When you initialize a workspace, you get:

```
workspace/
├── README.md              # System status overview
├── plan.md               # Current focus and planning
├── reflect.md            # Reflection history
├── config.yml            # User settings
├── projects/             # Project files
│   └── build-productivity-system.md  # Bootstrap project
├── areas/                # Life areas
└── system/               # System development files
    ├── backlog.md
    └── changelog.md
```

## Configuration

Edit `config.yml` to customize:

```yaml
ai:
  provider: "anthropic"
  model: "claude-3-haiku-20240307"
  api_key_env: "ANTHROPIC_API_KEY"
  max_tokens: 1000
  temperature: 0.3

system:
  workspace_dir: "."
  backup_enabled: true
  auto_save: false
```

## Development

### Setup
```bash
npm install
npm run build
```

### Testing
```bash
npm test
npm run test:watch
```

### Development Mode
```bash
npm run dev -- init test-workspace
```

## Self-Bootstrap Feature

The system includes a special project called "build-productivity-system" that contains tasks for improving the system itself. This demonstrates the system managing its own development - the ultimate dogfooding test.

After initialization, you can immediately start using the system to track its own improvements.

## AI Integration

The system supports multiple AI providers:

- **Anthropic** (default): Uses Claude for analysis
- **Local/Mock**: For testing without API calls

AI is used for:
- Status analysis and suggestions
- Progress tracking and file updates
- Zoom level perspective
- Reflection insights

All AI suggestions are presented to the user for approval before any changes are made.

## Self-Building Workflow

The system includes a special `workspace/` directory that demonstrates the system managing its own development. This is the ultimate dogfooding test - the productivity system uses itself to track its own improvements.

### Getting Started with Self-Building

1. **Explore the system workspace:**
   ```bash
   cd workspace
   node ../dist/index.js status
   ```

2. **See the bootstrap project:**
   ```bash
   cat projects/build-productivity-system.md
   ```
   This file contains the system's own development tasks, organized across all zoom levels (0-4).

3. **Start contributing to the system:**
   ```bash
   # Work on a pending task from the bootstrap project
   # For example, implement the reflect command
   
   # Record your progress
   node ../dist/index.js save "Implemented reflect command for weekly reviews"
   
   # Check how the system updates itself
   node ../dist/index.js status
   ```

4. **Commit improvements back to the repo:**
   ```bash
   # After implementing a feature
   git add .
   git commit -m "Add reflect command implementation"
   git push origin main
   ```

### Recursive Development Pattern

- The `workspace/` shows current system development status
- New features are planned and tracked using the system itself
- Progress is recorded using `prod save`
- The system provides AI insights about its own development
- All improvements are version controlled and shareable

This creates a feedback loop where the system continuously improves itself through its own productivity framework.

## Architecture

- **Functional programming**: Pure functions, immutable data
- **TypeScript**: Type safety throughout
- **Commander.js**: Clean CLI interface
- **No database**: Everything in files
- **Extensible**: Easy to add new commands and AI providers

## License

MIT