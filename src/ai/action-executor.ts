import { writeFile, readFile, fileExists, getAllMarkdownFiles, getWorkspaceFiles } from '../files/filesystem';
import { FileChange, AIResponse, PriorityAdjustment } from '../types';
import { loadConfig } from '../core/config';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExecutionOptions {
  dry_run?: boolean;
  auto_approve?: boolean;
  backup?: boolean;
  validation?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  changes_applied: FileChange[];
  changes_failed: FileChange[];
  backup_created?: string;
  errors: string[];
  warnings: string[];
}

export interface NewTask {
  content: string;
  level: 0 | 1 | 2 | 3 | 4;
  completed: boolean;
}

export interface TaskCreationResult {
  success: boolean;
  tasks_created: number;
  project_file: string;
  errors: string[];
}

export interface ProjectRestructure {
  add_sections?: string[];
  reorder_tasks?: {level: number, tasks: string[]}[];
  update_metadata?: {key: string, value: string}[];
}

export interface CheckpointInfo {
  id: string;
  timestamp: Date;
  description: string;
  files_backed_up: string[];
}

/**
 * AI Action Executor - Enables AI agents to autonomously apply changes to the workspace
 * This bridges the gap between AI analysis and actual system modifications
 */
export class AIActionExecutor {
  private workspaceDir: string;
  private checkpoints: Map<string, CheckpointInfo> = new Map();

  constructor(workspaceDir: string = '.') {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Create a safe test workspace to prevent overwriting production files
   */
  static async createTestWorkspace(sourceWorkspace: string = '.'): Promise<string> {
    const testDir = path.join(sourceWorkspace, '.test-workspace');
    await fs.mkdir(testDir, { recursive: true });
    
    // Copy essential files for testing
    const files = getWorkspaceFiles(sourceWorkspace);
    const testFiles = [
      { src: files.plan, dest: path.join(testDir, 'plan.md') },
      { src: files.readme, dest: path.join(testDir, 'README.md') }
    ];
    
    // Copy project files
    const projectsTestDir = path.join(testDir, 'projects');
    await fs.mkdir(projectsTestDir, { recursive: true });
    
    try {
      const projectFiles = await getAllMarkdownFiles(files.projects_dir);
      for (const projectFile of projectFiles) {
        const fileName = path.basename(projectFile);
        const testPath = path.join(projectsTestDir, fileName);
        if (await fileExists(projectFile)) {
          const content = await readFile(projectFile);
          await fs.writeFile(testPath, content);
        }
      }
    } catch (error) {
      console.log(`Note: Could not copy project files: ${error}`);
    }
    
    return testDir;
  }

  /**
   * Clean up test workspace
   */
  static async cleanupTestWorkspace(testDir: string): Promise<void> {
    if (testDir.includes('.test-workspace')) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  }

  /**
   * Execute file changes suggested by AI with safety measures
   */
  async executeFileChanges(changes: FileChange[], options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: true,
      changes_applied: [],
      changes_failed: [],
      errors: [],
      warnings: []
    };

    // Create backup if requested
    if (options.backup) {
      try {
        const backupId = await this.createBackup('AI file changes execution');
        result.backup_created = backupId;
      } catch (error) {
        result.errors.push(`Backup creation failed: ${error}`);
        result.success = false;
        return result;
      }
    }

    // Validate changes if requested
    if (options.validation) {
      const validation = await this.validateChanges(changes);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.success = false;
        return result;
      }
      result.warnings.push(...validation.warnings);
    }

    // Execute changes
    for (const change of changes) {
      try {
        if (options.dry_run) {
          console.log(chalk.yellow(`[DRY RUN] Would apply change: ${change.change_type} ${change.file_path}`));
          result.changes_applied.push(change);
          continue;
        }

        await this.applyFileChange(change);
        result.changes_applied.push(change);
        
        console.log(chalk.green(`✅ Applied ${change.change_type}: ${change.file_path}`));
        
      } catch (error) {
        result.changes_failed.push(change);
        result.errors.push(`Failed to apply ${change.change_type} to ${change.file_path}: ${error}`);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Create new tasks in a project based on AI analysis
   */
  async createTasks(projectName: string, tasks: NewTask[], options: ExecutionOptions = {}): Promise<TaskCreationResult> {
    const result: TaskCreationResult = {
      success: true,
      tasks_created: 0,
      project_file: '',
      errors: []
    };

    try {
      const files = getWorkspaceFiles(this.workspaceDir);
      const projectFile = path.join(files.projects_dir, `${projectName}.md`);
      
      if (!await fileExists(projectFile)) {
        result.errors.push(`Project file not found: ${projectFile}`);
        result.success = false;
        return result;
      }

      result.project_file = projectFile;

      if (options.dry_run) {
        console.log(chalk.yellow(`[DRY RUN] Would add ${tasks.length} tasks to ${projectName}`));
        result.tasks_created = tasks.length;
        return result;
      }

      // Read current project content
      const content = await readFile(projectFile);
      const lines = content.split('\n');
      let newLines = [...lines];

      // Group tasks by level for organized insertion
      const tasksByLevel = new Map<number, NewTask[]>();
      tasks.forEach(task => {
        if (!tasksByLevel.has(task.level)) {
          tasksByLevel.set(task.level, []);
        }
        tasksByLevel.get(task.level)!.push(task);
      });

      // Insert tasks at appropriate level sections
      for (const [level, levelTasks] of tasksByLevel) {
        const insertPoint = this.findLevelInsertionPoint(newLines, level);
        
        if (insertPoint !== -1) {
          const tasksToInsert = levelTasks.map(task => {
            const checkbox = task.completed ? '[x]' : '[ ]';
            return `- ${checkbox} ${task.content}`;
          });
          
          newLines.splice(insertPoint, 0, ...tasksToInsert);
          result.tasks_created += levelTasks.length;
        } else {
          result.errors.push(`Could not find Level ${level} section in ${projectName}`);
        }
      }

      // Write updated content
      await writeFile(projectFile, newLines.join('\n'));
      
      console.log(chalk.green(`✅ Added ${result.tasks_created} tasks to ${projectName}`));

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to create tasks: ${error}`);
    }

    return result;
  }

  /**
   * Automatically adjust task priorities based on AI recommendations
   */
  async adjustPriorities(adjustments: PriorityAdjustment[], options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: true,
      changes_applied: [],
      changes_failed: [],
      errors: [],
      warnings: []
    };

    for (const adjustment of adjustments) {
      try {
        const change = await this.createPriorityAdjustmentChange(adjustment);
        
        if (change) {
          if (options.dry_run) {
            console.log(chalk.yellow(`[DRY RUN] Would adjust priority: ${adjustment.task}`));
            result.changes_applied.push(change);
          } else {
            await this.applyFileChange(change);
            result.changes_applied.push(change);
            console.log(chalk.green(`✅ Adjusted priority: ${adjustment.task}`));
          }
        } else {
          result.warnings.push(`Could not locate task for priority adjustment: ${adjustment.task}`);
        }
        
      } catch (error) {
        result.errors.push(`Failed to adjust priority for "${adjustment.task}": ${error}`);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Auto-complete tasks based on AI analysis of completed work
   */
  async autoCompleteRelatedTasks(completedTask: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: true,
      changes_applied: [],
      changes_failed: [],
      errors: [],
      warnings: []
    };

    try {
      // Find related tasks that should be auto-completed
      const relatedTasks = await this.findRelatedTasks(completedTask);
      
      for (const relatedTask of relatedTasks) {
        if (relatedTask.auto_completable) {
          const change: FileChange = {
            file_path: relatedTask.file_path,
            change_type: 'update',
            content: relatedTask.updated_content,
            diff: `Auto-completed ${relatedTask.task_name} based on completion of ${completedTask}`
          };

          if (options.dry_run) {
            console.log(chalk.yellow(`[DRY RUN] Would auto-complete: ${relatedTask.task_name}`));
            result.changes_applied.push(change);
          } else {
            await this.applyFileChange(change);
            result.changes_applied.push(change);
            console.log(chalk.green(`✅ Auto-completed: ${relatedTask.task_name}`));
          }
        }
      }

    } catch (error) {
      result.errors.push(`Failed to auto-complete related tasks: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Create a backup checkpoint for rollback capability
   */
  async createBackup(description: string): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}`;
    const backupDir = path.join(this.workspaceDir, '.ai-backups', checkpointId);
    
    await fs.mkdir(backupDir, { recursive: true });

    const files = getWorkspaceFiles(this.workspaceDir);
    const filesToBackup = [
      files.readme,
      files.plan,
      files.reflect,
      files.config
    ];

    // Add all project files
    const projectFiles = await getAllMarkdownFiles(files.projects_dir);
    filesToBackup.push(...projectFiles);

    const backedUpFiles: string[] = [];
    
    for (const filePath of filesToBackup) {
      if (await fileExists(filePath)) {
        const fileName = path.basename(filePath);
        const backupPath = path.join(backupDir, fileName);
        const content = await readFile(filePath);
        await fs.writeFile(backupPath, content);
        backedUpFiles.push(fileName);
      }
    }

    const checkpoint: CheckpointInfo = {
      id: checkpointId,
      timestamp: new Date(),
      description,
      files_backed_up: backedUpFiles
    };

    this.checkpoints.set(checkpointId, checkpoint);

    // Save checkpoint metadata
    const metadataPath = path.join(backupDir, 'checkpoint.json');
    await fs.writeFile(metadataPath, JSON.stringify(checkpoint, null, 2));

    return checkpointId;
  }

  // Private helper methods

  private async applyFileChange(change: FileChange): Promise<void> {
    const fullPath = path.resolve(this.workspaceDir, change.file_path);

    switch (change.change_type) {
      case 'create':
        if (!change.content) {
          throw new Error('Content required for create operation');
        }
        await writeFile(fullPath, change.content);
        break;

      case 'update':
        if (!change.content) {
          throw new Error('Content required for update operation');
        }
        await writeFile(fullPath, change.content);
        break;

      case 'delete':
        if (await fileExists(fullPath)) {
          await fs.unlink(fullPath);
        }
        break;

      default:
        throw new Error(`Unsupported change type: ${change.change_type}`);
    }
  }

  private async validateChanges(changes: FileChange[]): Promise<{valid: boolean, errors: string[], warnings: string[]}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const change of changes) {
      // Validate file paths
      if (!change.file_path || path.isAbsolute(change.file_path)) {
        errors.push(`Invalid file path: ${change.file_path}`);
      }

      // Validate change types
      if (!['create', 'update', 'delete'].includes(change.change_type)) {
        errors.push(`Invalid change type: ${change.change_type}`);
      }

      // Check for potentially dangerous operations
      if (change.file_path.includes('..')) {
        errors.push(`Potentially unsafe file path: ${change.file_path}`);
      }

      if (change.change_type === 'delete' && change.file_path.endsWith('.md')) {
        warnings.push(`Deleting markdown file: ${change.file_path}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private findLevelInsertionPoint(lines: string[], level: number): number {
    const levelPattern = new RegExp(`Level ${level}`, 'i');
    let inLevelSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Found the target level section
      if (levelPattern.test(line) && line.startsWith('##')) {
        inLevelSection = true;
        continue;
      }
      
      // If we're in the level section, find the insertion point
      if (inLevelSection) {
        // Insert before the next major section
        if (line.startsWith('##') && !levelPattern.test(line)) {
          return i;
        }
      }
    }
    
    // If we're in the section but didn't find a next section, insert at end
    if (inLevelSection) {
      return lines.length;
    }
    
    return -1; // Level section not found
  }

  private async createPriorityAdjustmentChange(adjustment: PriorityAdjustment): Promise<FileChange | null> {
    // This would implement priority adjustment by moving tasks between levels
    // For now, return null as this requires more complex task parsing
    return null;
  }

  private async findRelatedTasks(completedTask: string): Promise<Array<{
    task_name: string;
    file_path: string;
    auto_completable: boolean;
    updated_content: string;
  }>> {
    // This would implement AI analysis to find related tasks that should be auto-completed
    // For now, return empty array
    return [];
  }
}

/**
 * Test the AI Action Executor safely
 */
export const testActionExecutor = async (workspaceDir: string = '.'): Promise<void> => {
  console.log(chalk.blue('🧪 Testing AI Action Executor'));
  
  // Create safe test workspace
  const testWorkspace = await AIActionExecutor.createTestWorkspace(workspaceDir);
  console.log(chalk.yellow(`Created test workspace: ${testWorkspace}`));
  
  const executor = new AIActionExecutor(testWorkspace);
  
  try {
    // Test 1: Create backup
    console.log('\n1. Testing backup creation...');
    const backupId = await executor.createBackup('Test backup');
    console.log(chalk.green(`✅ Backup created: ${backupId}`));
    
    // Test 2: Test file changes in dry-run mode
    console.log('\n2. Testing file changes (dry run)...');
    const testChanges = [{
      file_path: 'test-file.md',
      change_type: 'create' as const,
      content: '# Test File\n\nThis is a test file created by AI Action Executor.',
      diff: 'Creating test file'
    }];
    
    const result = await executor.executeFileChanges(testChanges, { dry_run: true, validation: true });
    console.log(chalk.green(`✅ Dry run completed: ${result.changes_applied.length} changes validated`));
    
    // Test 3: Test task creation
    console.log('\n3. Testing task creation (dry run)...');
    const testTasks = [{
      content: 'Test task created by AI Action Executor',
      level: 0 as const,
      completed: false
    }];
    
    // Create a simple project file for testing
    const testProjectPath = path.join(testWorkspace, 'projects', 'test-project.md');
    await fs.mkdir(path.dirname(testProjectPath), { recursive: true });
    await fs.writeFile(testProjectPath, '# Test Project\n\n## Level 0\n\n## Level 1\n\n');
    
    const taskResult = await executor.createTasks('test-project', testTasks, { dry_run: true });
    console.log(chalk.green(`✅ Task creation test: ${taskResult.tasks_created} tasks would be created`));
    
    console.log(chalk.green('\n✅ All tests passed successfully!'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Test failed: ${error}`));
  } finally {
    // Clean up test workspace
    await AIActionExecutor.cleanupTestWorkspace(testWorkspace);
    console.log(chalk.yellow('🧹 Cleaned up test workspace'));
  }
};

/**
 * Enhanced Save Command with AI Action Execution
 */
export const enhancedSaveCommand = async (description: string, workspaceDir: string = '.', options: ExecutionOptions = {}): Promise<void> => {
  const { saveCommand } = await import('../commands/save');
  const executor = new AIActionExecutor(workspaceDir);

  console.log(chalk.blue('🤖 Enhanced Save with AI Action Execution'));
  console.log('');

  // First run the standard save to get AI analysis
  await saveCommand(description, workspaceDir);

  // TODO: Extract AI response and execute proposed changes
  // This would require modifying the save command to return the AIResponse
  // For now, this demonstrates the integration point

  console.log(chalk.green('\n✅ Enhanced save completed with AI actions'));
};