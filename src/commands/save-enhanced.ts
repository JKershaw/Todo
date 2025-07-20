import chalk from 'chalk';
import { saveCommand } from './save';
import { AIActionExecutor, ExecutionOptions } from '../ai/action-executor';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { SAVE_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  fileExists, 
  getAllMarkdownFiles, 
  readFile 
} from '../files/filesystem';

/**
 * Enhanced Save Command with AI Action Execution capabilities
 * This provides autonomous AI-driven improvements to the workspace
 */
export const saveEnhancedCommand = async (
  description: string, 
  workspaceDir: string = '.', 
  options: { 
    dryRun?: boolean, 
    autoApprove?: boolean, 
    useExecutor?: boolean 
  } = {}
): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }

    console.log(chalk.blue(`🤖 Enhanced Save: "${description}"`));
    
    // First run the standard save command
    await saveCommand(description, workspaceDir);
    
    // If AI Action Executor is enabled, provide autonomous improvements
    if (options.useExecutor !== false) {
      console.log(chalk.blue('\n🚀 AI Action Executor: Analyzing for autonomous improvements...'));
      
      const executor = new AIActionExecutor(workspaceDir);
      const config = await loadConfig(workspaceDir);
      const aiService = createAIService(config);
      
      try {
        // Get AI analysis for autonomous actions
        const enhancedPrompt = `${SAVE_PROMPT.replace('{{userAction}}', description)}

ADDITIONAL AUTONOMOUS ACTIONS:
Based on this completed work, identify autonomous improvements you can make:

1. Task Creation: Are there logical next steps that should be automatically created?
2. Priority Adjustments: Should any task priorities be adjusted based on this completion?
3. Related Task Completion: Are there any trivial tasks that can be auto-completed?
4. System Maintenance: Any housekeeping or organizational improvements needed?

For each suggested autonomous action, provide:
- The specific change to make
- The rationale for making it automatically
- The risk level (low/medium/high)

Only suggest LOW RISK autonomous actions that clearly improve the system.`;

        const context = await gatherEnhancedContext(workspaceDir, files, description);
        const response = await aiService.analyze(enhancedPrompt, context);
        
        if (response.proposed_changes && response.proposed_changes.length > 0) {
          console.log(chalk.green('\n🧠 AI Autonomous Improvements Available:'));
          
          // Filter for low-risk changes only
          const safeChanges = response.proposed_changes.filter((change: any) => 
            change.risk_level === 'low' || !change.risk_level
          );
          
          if (safeChanges.length > 0) {
            const executionOptions: ExecutionOptions = {
              dry_run: options.dryRun ?? false,
              auto_approve: options.autoApprove ?? false,
              backup: true,
              validation: true
            };
            
            console.log(chalk.yellow('\n🔄 Applying safe autonomous improvements...'));
            const result = await executor.executeFileChanges(safeChanges, executionOptions);
            
            if (result.success) {
              console.log(chalk.green(`✅ Applied ${result.changes_applied.length} autonomous improvements`));
              
              if (result.warnings.length > 0) {
                console.log(chalk.yellow('\n⚠️ Warnings:'));
                result.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
              }
            } else {
              console.log(chalk.red('❌ Some autonomous improvements failed:'));
              result.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
            }
            
            if (result.backup_created) {
              console.log(chalk.gray(`💾 Backup created: ${result.backup_created}`));
            }
          } else {
            console.log(chalk.gray('No safe autonomous improvements identified'));
          }
        } else {
          console.log(chalk.gray('No autonomous improvements suggested'));
        }
        
      } catch (aiError) {
        console.log(chalk.yellow('⚠️ AI autonomous analysis unavailable, standard save completed'));
      }
    }
    
    console.log(chalk.green('\n✅ Enhanced save completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red(`Enhanced save command failed: ${error}`));
    process.exit(1);
  }
};

/**
 * Gather enhanced context for autonomous AI actions
 */
const gatherEnhancedContext = async (workspaceDir: string, files: any, action: string): Promise<string> => {
  // Duplicate the gatherSaveContext logic since it's not exported
  const baseContext = await gatherBasicSaveContext(workspaceDir, files, action);
  
  // Add context specifically for autonomous actions
  const enhancedContext = [
    baseContext,
    '\n=== AUTONOMOUS ACTION CONTEXT ===',
    'The user has completed work and the system should identify:',
    '1. Logical next tasks that flow from this completion',
    '2. Priority adjustments that make sense given new progress',
    '3. Related tasks that might now be completable',
    '4. System improvements that reduce future friction',
    '',
    'Focus on LOW RISK improvements that clearly benefit productivity.',
    'Avoid any changes that could disrupt existing work or require user decision-making.',
    ''
  ];
  
  return enhancedContext.join('\n');
};

/**
 * Basic context gathering for save operations
 */
const gatherBasicSaveContext = async (workspaceDir: string, files: any, action: string): Promise<string> => {
  const context = [`=== USER ACTION ===\n${action}\n`];
  context.push('=== CURRENT SYSTEM STATE ===\n');
  
  // Read core files for context
  const coreFiles = [
    { name: 'README', path: files.readme },
    { name: 'PLAN', path: files.plan }
  ];
  
  for (const file of coreFiles) {
    if (await fileExists(file.path)) {
      const content = await readFile(file.path);
      context.push(`=== ${file.name} ===`);
      context.push(content);
      context.push('');
    }
  }
  
  // Include relevant project files
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  for (const projectFile of projectFiles.slice(0, 3)) { // Limit to avoid token limits
    const content = await readFile(projectFile);
    context.push(`=== PROJECT: ${projectFile} ===`);
    context.push(content);
    context.push('');
  }
  
  return context.join('\n');
};

/**
 * Test the enhanced save command safely
 */
export const testEnhancedSave = async (workspaceDir: string = '.'): Promise<void> => {
  console.log(chalk.blue('🧪 Testing Enhanced Save Command'));
  
  // Create safe test workspace
  const testWorkspace = await AIActionExecutor.createTestWorkspace(workspaceDir);
  console.log(chalk.yellow(`Created test workspace: ${testWorkspace}`));
  
  try {
    // Test enhanced save in dry-run mode
    console.log('\n🔄 Testing enhanced save with dry-run mode...');
    await saveEnhancedCommand(
      'Completed implementing AI Action Executor for autonomous system improvements', 
      testWorkspace,
      { dryRun: true, autoApprove: true, useExecutor: true }
    );
    
    console.log(chalk.green('\n✅ Enhanced save test completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Enhanced save test failed: ${error}`));
  } finally {
    // Clean up test workspace
    await AIActionExecutor.cleanupTestWorkspace(testWorkspace);
    console.log(chalk.yellow('🧹 Cleaned up test workspace'));
  }
};