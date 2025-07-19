export interface Config {
  ai: {
    provider: 'anthropic' | 'openai' | 'local';
    model: string;
    api_key_env: string;
    max_tokens: number;
    temperature: number;
  };
  system: {
    workspace_dir: string;
    backup_enabled: boolean;
    auto_save: boolean;
  };
}

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  level: 0 | 1 | 2 | 3 | 4;
  created: Date;
  completed?: Date;
  project?: string;
  area?: string;
}

export interface Project {
  name: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  level: 2 | 3 | 4;
  started: Date;
  target?: Date;
  completed?: Date;
  goal: string;
  milestones: Task[];
  notes: string[];
}

export interface SystemStatus {
  current_focus: string[];
  recent_progress: string[];
  stalled_areas: string[];
  suggested_actions: string[];
  health_metrics: {
    active_projects: number;
    days_since_reflect: number;
    completion_rate: number;
  };
}

export interface AIResponse {
  analysis: string;
  suggestions: string[];
  proposed_changes: FileChange[];
  reasoning: string;
}

export interface TaskRelationship {
  from_task: string;
  to_task: string;
  relationship_type: 'dependency' | 'enables' | 'blocks' | 'supports';
  strength: 'weak' | 'medium' | 'strong';
  description: string;
}

export interface AITaskAnalysis {
  task_relationships: TaskRelationship[];
  coordination_suggestions: string[];
  optimization_opportunities: string[];
  priority_adjustments: {
    task: string;
    current_priority: number;
    suggested_priority: number;
    reasoning: string;
  }[];
}

export interface FileChange {
  file_path: string;
  change_type: 'create' | 'update' | 'delete';
  content?: string;
  diff?: string;
}

export interface ZoomLevel {
  level: 0 | 1 | 2 | 3 | 4;
  name: string;
  description: string;
  time_horizon: string;
}

export const ZOOM_LEVELS: Record<number, ZoomLevel> = {
  0: { level: 0, name: 'Immediate', description: 'Quick actions', time_horizon: '5-15 min' },
  1: { level: 1, name: 'Daily/Weekly', description: 'Regular tasks', time_horizon: '1-3 hours' },
  2: { level: 2, name: 'Projects', description: 'Short-term projects', time_horizon: 'days-weeks' },
  3: { level: 3, name: 'Quarterly', description: 'Goals and objectives', time_horizon: '1-3 months' },
  4: { level: 4, name: 'Annual/Life', description: 'Long-term vision', time_horizon: 'years' }
};

export interface WorkspaceFiles {
  readme: string;
  plan: string;
  reflect: string;
  config: string;
  projects_dir: string;
  areas_dir: string;
  system_dir: string;
}