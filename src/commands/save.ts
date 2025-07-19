import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { SAVE_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  writeFile,
  fileExists,
  createBackup
} from '../files/filesystem';
import { getCurrentDateTime } from '../core/utils';

export const saveCommand = async (description: string, workspaceDir: string = '.'): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    console.log(chalk.blue(`Recording progress: "${description}"`));
    
    const config = await loadConfig(workspaceDir);
    const aiService = createAIService(config);
    
    // Gather context for AI analysis
    const context = await gatherSaveContext(workspaceDir, files, description);
    
    try {
      const prompt = SAVE_PROMPT.replace('{{userAction}}', description);
      const response = await aiService.analyze(prompt, context);
      
      console.log(chalk.green('\n📝 Progress Analysis:'));
      console.log(chalk.white(response.analysis));
      
      if (response.proposed_changes.length > 0) {
        console.log(chalk.blue('\n🔄 Proposed File Updates:'));
        
        for (const change of response.proposed_changes) {
          console.log(chalk.white(`  • ${change.change_type}: ${change.file_path}`));
          if (change.diff) {
            console.log(chalk.gray(`    ${change.diff}`));
          }
        }
        
        // Prompt for confirmation
        const confirmed = await promptConfirmation('\nApply these changes?');
        
        if (confirmed) {
          await applyChanges(response.proposed_changes, files);
          await updateRecentProgress(files, description);
          console.log(chalk.green('\n✓ Changes applied successfully!'));
        } else {
          console.log(chalk.yellow('Changes cancelled. Progress recorded in notes only.'));
          await recordProgressOnly(files, description);
        }
      } else {
        await recordProgressOnly(files, description);
        console.log(chalk.green('✓ Progress recorded!'));
      }
      
      if (response.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Next Steps:'));
        response.suggestions.forEach((suggestion, index) => {
          console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
        });
      }
      
    } catch (aiError) {
      console.log(chalk.yellow('⚠️  AI service unavailable, recording basic progress...'));
      await recordProgressOnly(files, description);
      console.log(chalk.green('✓ Progress recorded!'));
    }
    
  } catch (error) {
    console.error(chalk.red(`Save command failed: ${error}`));
    process.exit(1);
  }
};

const gatherSaveContext = async (workspaceDir: string, files: any, action: string): Promise<string> => {
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

const applyChanges = async (changes: any[], files: any): Promise<void> => {
  for (const change of changes) {
    try {
      if (change.change_type === 'create') {
        await writeFile(change.file_path, change.content || '');
        console.log(chalk.gray(`  ✓ Created: ${change.file_path}`));
      } else if (change.change_type === 'update') {
        if (await fileExists(change.file_path)) {
          await createBackup(change.file_path);
          await writeFile(change.file_path, change.content || '');
          console.log(chalk.gray(`  ✓ Updated: ${change.file_path}`));
        }
      } else if (change.change_type === 'delete') {
        // For safety, we'll just log deletion requests but not actually delete
        console.log(chalk.yellow(`  ! Deletion requested but not executed: ${change.file_path}`));
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to apply change to ${change.file_path}: ${error}`));
    }
  }
};

const updateRecentProgress = async (files: any, description: string): Promise<void> => {
  if (await fileExists(files.readme)) {
    try {
      const content = await readFile(files.readme);
      const timestamp = getCurrentDateTime();
      const progressEntry = `- ${timestamp}: ${description}`;
      
      // Simple approach: add to recent progress section
      const updatedContent = content.replace(
        /## Recent Progress\s*\n- Completed: \[recent wins\]/,
        `## Recent Progress\n${progressEntry}\n- Completed: [recent wins]`
      );
      
      await createBackup(files.readme);
      await writeFile(files.readme, updatedContent);
    } catch (error) {
      console.log(chalk.yellow(`Warning: Could not update README: ${error}`));
    }
  }
};

const recordProgressOnly = async (files: any, description: string): Promise<void> => {
  await updateRecentProgress(files, description);
};

const promptConfirmation = async (message: string): Promise<boolean> => {
  // For now, return true. In a real implementation, you'd use readline or similar
  // to get user input. This is a simple V1 approach.
  console.log(chalk.blue(message + ' [Y/n]'));
  return true;
};