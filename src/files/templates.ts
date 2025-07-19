import { getCurrentDate, getTargetDate } from '../core/utils';

interface TemplateVariables {
  date: string;
  targetDate: string;
  activeProjects: number;
  daysSinceReflect: number;
}

export const renderTemplate = (template: string, variables: Partial<TemplateVariables> = {}): string => {
  const defaultVars: TemplateVariables = {
    date: getCurrentDate(),
    targetDate: getTargetDate(),
    activeProjects: 0,
    daysSinceReflect: 0,
    ...variables
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return defaultVars[key as keyof TemplateVariables]?.toString() || match;
  });
};

export const README_TEMPLATE = `# Productivity System Status

**Last Updated:** {{date}}

## Current Focus (Level 2-3)
- [ ] Main project or goal

## This Week (Level 1)
- [ ] Key weekly tasks

## Today (Level 0)
- [ ] Immediate actions (5-15 min each)

## Recent Progress
- Completed: [recent wins]
- Stalled: [needs attention]

## System Health
- Active projects: {{activeProjects}}
- Days since last reflect: {{daysSinceReflect}}
`;

export const PLAN_TEMPLATE = `# Current Planning

**Last Updated:** {{date}}

## Focus Areas

### Level 4 (Annual/Life Goals)
- [ ] Long-term vision item

### Level 3 (Quarterly Objectives)
- [ ] 3-month goal
- [ ] Another quarterly objective

### Level 2 (Current Projects)
- [ ] Active project
- [ ] Secondary project

### Level 1 (This Week)
- [ ] Weekly milestone
- [ ] Important task

### Level 0 (Today)
- [ ] Quick action (15 min)
- [ ] Another immediate task

## Notes
*Add context, dependencies, or insights here*
`;

export const REFLECT_TEMPLATE = `# Reflection History

## {{date}} - System Initialization
- System created and initialized
- Ready to begin tracking productivity patterns
- Next reflection scheduled for weekly review

---

*Previous reflections will appear above this line*
`;

export const CONFIG_TEMPLATE = `# Productivity System Configuration

ai:
  provider: "anthropic"
  model: "claude-3-haiku"
  api_key_env: "ANTHROPIC_API_KEY"
  max_tokens: 1000
  temperature: 0.3

system:
  workspace_dir: "."
  backup_enabled: true
  auto_save: false
  
# Reflection schedule (in days)
reflection:
  weekly: 7
  monthly: 30

# Zoom level defaults
zoom:
  default_level: 1
  show_context: true
`;

export const BOOTSTRAP_PROJECT_TEMPLATE = `# Project: Build Productivity System

**Status:** Active  
**Level:** 2  
**Started:** {{date}}  
**Target:** {{targetDate}}  

## Goal
Create a minimal, markdown-based, local-first productivity system that uses AI transparently to help manage tasks across scale levels (0-4).

## Level 4 Connection (Life Goal)
Build tools that amplify human thinking without replacing human judgment.

## Level 3 Milestones (Quarterly)
- [ ] Core system functional (Week 1)
- [ ] Recursive development workflow (Week 2)  
- [ ] Daily use validated (Week 4)

## Level 2 Projects (Current Sprint)
- [x] Design system philosophy and file structure
- [ ] Implement core commands (init, status, save, zoom, reflect)
- [ ] Test system by using it to manage its own development
- [ ] Add habit tracking capabilities
- [ ] Improve reflection algorithms

## Level 1 Tasks (This Week)
- [ ] Set up development environment
- [ ] Implement init command with templates  
- [ ] Implement status command with AI integration
- [ ] Test basic workflow with real tasks
- [ ] Start recursive development pattern

## Level 0 Actions (Next 15 minutes)
- [ ] Run system init
- [ ] Complete first status check
- [ ] Save first task completion
- [ ] Test zoom functionality

## Completed
- [x] Define system philosophy
- [x] Design file structure and templates
- [x] Create implementation specification

## Notes
This project demonstrates the system managing its own development - the ultimate dogfooding test.
`;

export const SYSTEM_BACKLOG_TEMPLATE = `# System Development Backlog

**Last Updated:** {{date}}

## High Priority
- [ ] Core command implementation
- [ ] AI integration stability
- [ ] Error handling improvements

## Medium Priority
- [ ] Additional AI providers support
- [ ] Advanced reflection features
- [ ] Habit tracking integration

## Low Priority
- [ ] Web interface exploration
- [ ] Mobile companion app
- [ ] Advanced analytics

## Completed
- [x] Initial system architecture
- [x] File structure design
`;

export const SYSTEM_CHANGELOG_TEMPLATE = `# System Development Changelog

## v1.0.0 - {{date}}
### Added
- Initial system architecture
- Core command framework
- AI integration foundation
- Template system
- File structure management

### Changed
- N/A

### Fixed
- N/A

---

*Future changes will be logged above*
`;