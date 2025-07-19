import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { STATUS_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  fileExists 
} from '../files/filesystem';
import { parseMarkdownCheckbox, calculateDaysSince } from '../core/utils';

export const statusCommand = async (workspaceDir: string = '.'): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    console.log(chalk.blue('Analyzing productivity system status...'));
    
    const config = await loadConfig(workspaceDir);
    const aiService = createAIService(config);
    
    // Gather all context files
    const context = await gatherContextFiles(workspaceDir, files);
    
    try {
      const response = await aiService.analyze(STATUS_PROMPT, context);
      
      // Display status
      console.log(chalk.green('\n📊 System Status'));
      console.log(chalk.white('─'.repeat(50)));
      
      console.log(chalk.blue('\nCurrent Analysis:'));
      console.log(chalk.white(response.analysis));
      
      if (response.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        response.suggestions.forEach((suggestion, index) => {
          console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
        });
      }
      
      if (response.proposed_changes.length > 0) {
        console.log(chalk.yellow('\n🔄 Proposed Updates:'));
        response.proposed_changes.forEach(change => {
          console.log(chalk.gray(`  • ${change.change_type}: ${change.file_path}`));
          if (change.diff) {
            console.log(chalk.gray(`    ${change.diff}`));
          }
        });
        console.log(chalk.yellow('\nUse "prod save" command to apply these changes.'));
      }
      
      if (response.reasoning) {
        console.log(chalk.blue('\n🤔 Reasoning:'));
        console.log(chalk.white(response.reasoning));
      }
      
    } catch (aiError) {
      console.log(chalk.yellow('⚠️  AI service unavailable, showing basic status...'));
      await showBasicStatus(files);
    }
    
  } catch (error) {
    console.error(chalk.red(`Status command failed: ${error}`));
    process.exit(1);
  }
};

const gatherContextFiles = async (workspaceDir: string, files: any): Promise<string> => {
  const context = ['=== PRODUCTIVITY SYSTEM CONTEXT ===\n'];
  
  // Read core files
  const coreFiles = [
    { name: 'README', path: files.readme },
    { name: 'PLAN', path: files.plan },
    { name: 'REFLECT', path: files.reflect }
  ];
  
  for (const file of coreFiles) {
    if (await fileExists(file.path)) {
      const content = await readFile(file.path);
      context.push(`=== ${file.name} ===`);
      context.push(content);
      context.push('');
    }
  }
  
  // Read all project files
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  for (const projectFile of projectFiles) {
    const content = await readFile(projectFile);
    context.push(`=== PROJECT: ${projectFile} ===`);
    context.push(content);
    context.push('');
  }
  
  // Read area files if they exist
  try {
    const areaFiles = await getAllMarkdownFiles(files.areas_dir);
    for (const areaFile of areaFiles) {
      const content = await readFile(areaFile);
      context.push(`=== AREA: ${areaFile} ===`);
      context.push(content);
      context.push('');
    }
  } catch {
    // Areas directory might not exist or be empty
  }
  
  return context.join('\n');
};

const showBasicStatus = async (files: any): Promise<void> => {
  console.log(chalk.green('\n📊 Basic Status (AI unavailable)'));
  console.log(chalk.white('─'.repeat(50)));
  
  // Count basic metrics
  let totalTasks = 0;
  let completedTasks = 0;
  let activeProjects = 0;
  
  // Analyze README
  if (await fileExists(files.readme)) {
    const readmeContent = await readFile(files.readme);
    const lines = readmeContent.split('\n');
    
    for (const line of lines) {
      const checkbox = parseMarkdownCheckbox(line);
      if (line.includes('[ ]') || line.includes('[x]')) {
        totalTasks++;
        if (checkbox.checked) completedTasks++;
      }
    }
  }
  
  // Count projects
  try {
    const projectFiles = await getAllMarkdownFiles(files.projects_dir);
    activeProjects = projectFiles.length;
  } catch {
    activeProjects = 0;
  }
  
  console.log(chalk.white(`Active Projects: ${activeProjects}`));
  console.log(chalk.white(`Total Tasks: ${totalTasks}`));
  console.log(chalk.white(`Completed Tasks: ${completedTasks}`));
  
  if (totalTasks > 0) {
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    console.log(chalk.white(`Completion Rate: ${completionRate}%`));
  }
  
  console.log(chalk.blue('\n💡 Basic Suggestions:'));
  console.log(chalk.white('  1. Review your current plan.md'));
  console.log(chalk.white('  2. Check active projects for next actions'));
  console.log(chalk.white('  3. Run "prod reflect" for deeper insights'));
};