import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { PROJECT_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  writeFile,
  fileExists
} from '../files/filesystem';
import { getCurrentDate, sanitizeFilename } from '../core/utils';
import * as path from 'path';

export const projectCommand = async (
  action: 'create' | 'status' | 'complete' | 'list',
  projectName?: string,
  workspaceDir: string = '.'
): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    switch (action) {
      case 'create':
        await createProject(projectName, workspaceDir, files);
        break;
      case 'status':
        await showProjectStatus(projectName, workspaceDir, files);
        break;
      case 'complete':
        await completeProject(projectName, workspaceDir, files);
        break;
      case 'list':
        await listProjects(workspaceDir, files);
        break;
      default:
        console.log(chalk.red(`Unknown action: ${action}`));
        console.log(chalk.white('Available actions: create, status, complete, list'));
    }
    
  } catch (error) {
    console.error(chalk.red(`Project command failed: ${error}`));
    process.exit(1);
  }
};

const createProject = async (projectName: string | undefined, workspaceDir: string, files: any): Promise<void> => {
  if (!projectName) {
    console.log(chalk.red('Project name is required for create action.'));
    console.log(chalk.white('Usage: prod project create "My Project Name"'));
    return;
  }
  
  console.log(chalk.blue(`Creating project: ${projectName}`));
  
  const config = await loadConfig(workspaceDir);
  const aiService = createAIService(config);
  
  try {
    const prompt = PROJECT_PROMPT
      .replace('{{projectAction}}', 'create')
      .replace('{{projectName}}', projectName);
    
    const context = `Creating new project: ${projectName}\nCurrent date: ${getCurrentDate()}`;
    const response = await aiService.analyze(prompt, context);
    
    // Create project file
    const projectFile = await generateProjectFile(projectName, response, files.projects_dir);
    
    console.log(chalk.green('\n📋 AI Project Structure Suggestions:'));
    console.log(chalk.white(response.analysis));
    
    if (response.suggestions.length > 0) {
      console.log(chalk.blue('\n💡 Project Setup Recommendations:'));
      response.suggestions.forEach((suggestion, index) => {
        console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
      });
    }
    
    console.log(chalk.green(`\n✓ Project created: ${projectFile}`));
    console.log(chalk.white(`Edit the file to customize your project structure and goals.`));
    
  } catch (aiError) {
    console.log(chalk.yellow('⚠️  AI service unavailable, creating basic project...'));
    const projectFile = await createBasicProject(projectName, files.projects_dir);
    console.log(chalk.green(`✓ Basic project created: ${projectFile}`));
  }
};

const showProjectStatus = async (projectName: string | undefined, workspaceDir: string, files: any): Promise<void> => {
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  
  if (projectName) {
    // Show specific project status
    const projectFile = findProjectFile(projectFiles, projectName);
    if (!projectFile) {
      console.log(chalk.red(`Project "${projectName}" not found.`));
      await listProjects(workspaceDir, files);
      return;
    }
    
    const content = await readFile(projectFile);
    const analysis = analyzeProjectContent(content);
    
    console.log(chalk.green(`\n📋 Project Status: ${path.basename(projectFile, '.md')}`));
    console.log(chalk.white('─'.repeat(50)));
    
    console.log(chalk.blue(`Status: ${analysis.status}`));
    console.log(chalk.blue(`Progress: ${analysis.completedTasks}/${analysis.totalTasks} tasks completed`));
    
    if (analysis.totalTasks > 0) {
      const percentage = Math.round((analysis.completedTasks / analysis.totalTasks) * 100);
      console.log(chalk.blue(`Completion: ${percentage}%`));
    }
    
    if (analysis.pendingTasks.length > 0) {
      console.log(chalk.blue('\n📝 Next Actions:'));
      analysis.pendingTasks.slice(0, 3).forEach(task => {
        console.log(chalk.white(`  • ${task}`));
      });
    }
    
  } else {
    // Show all projects overview
    await listProjects(workspaceDir, files);
  }
};

const completeProject = async (projectName: string | undefined, workspaceDir: string, files: any): Promise<void> => {
  if (!projectName) {
    console.log(chalk.red('Project name is required for complete action.'));
    console.log(chalk.white('Usage: prod project complete "Project Name"'));
    return;
  }
  
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  const projectFile = findProjectFile(projectFiles, projectName);
  
  if (!projectFile) {
    console.log(chalk.red(`Project "${projectName}" not found.`));
    return;
  }
  
  console.log(chalk.blue(`Completing project: ${projectName}`));
  
  const config = await loadConfig(workspaceDir);
  const aiService = createAIService(config);
  
  try {
    const projectContent = await readFile(projectFile);
    const prompt = PROJECT_PROMPT
      .replace('{{projectAction}}', 'complete')
      .replace('{{projectName}}', projectName);
    
    const response = await aiService.analyze(prompt, projectContent);
    
    // Update project status to completed
    await updateProjectCompletion(projectFile, projectContent);
    
    console.log(chalk.green('\n🎉 Project Completion Analysis:'));
    console.log(chalk.white(response.analysis));
    
    if (response.suggestions.length > 0) {
      console.log(chalk.blue('\n💡 Post-Completion Recommendations:'));
      response.suggestions.forEach((suggestion, index) => {
        console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
      });
    }
    
    console.log(chalk.green(`\n✓ Project "${projectName}" marked as completed!`));
    
  } catch (aiError) {
    console.log(chalk.yellow('⚠️  AI service unavailable, marking project as complete...'));
    await updateProjectCompletion(projectFile, await readFile(projectFile));
    console.log(chalk.green(`✓ Project "${projectName}" marked as completed!`));
  }
};

const listProjects = async (workspaceDir: string, files: any): Promise<void> => {
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  
  if (projectFiles.length === 0) {
    console.log(chalk.yellow('No projects found.'));
    console.log(chalk.white('Create a new project with: prod project create "Project Name"'));
    return;
  }
  
  console.log(chalk.green('\n📋 Projects Overview'));
  console.log(chalk.white('─'.repeat(50)));
  
  for (const projectFile of projectFiles) {
    const content = await readFile(projectFile);
    const analysis = analyzeProjectContent(content);
    const name = path.basename(projectFile, '.md');
    
    const statusColor = analysis.status === 'Completed' ? chalk.green : 
                       analysis.status === 'Active' ? chalk.blue : chalk.yellow;
    
    console.log(`${statusColor('●')} ${chalk.white(name)}`);
    console.log(`   Status: ${statusColor(analysis.status)}`);
    console.log(`   Progress: ${analysis.completedTasks}/${analysis.totalTasks} tasks`);
    
    if (analysis.totalTasks > 0) {
      const percentage = Math.round((analysis.completedTasks / analysis.totalTasks) * 100);
      console.log(`   Completion: ${percentage}%`);
    }
    console.log('');
  }
};

const generateProjectFile = async (projectName: string, aiResponse: any, projectsDir: string): Promise<string> => {
  const filename = sanitizeFilename(projectName) + '.md';
  const filepath = path.join(projectsDir, filename);
  
  const template = `# Project: ${projectName}

**Status:** Active  
**Level:** 2  
**Started:** ${getCurrentDate()}  
**Target:** (Set target date)

## Goal
${aiResponse.analysis || 'Define the main goal and purpose of this project.'}

## Level 4 Connection (Life Goal)
Connect this project to your broader life vision and long-term objectives.

## Level 3 Milestones (Quarterly)
- [ ] Major milestone 1
- [ ] Major milestone 2
- [ ] Major milestone 3

## Level 2 Tasks (Current Sprint)
- [ ] Break down project into specific deliverables
- [ ] Set up necessary tools and resources
- [ ] Define success criteria

## Level 1 Tasks (This Week)
- [ ] First concrete step
- [ ] Research and planning tasks
- [ ] Initial implementation

## Level 0 Actions (Next 15 minutes)
- [ ] Quick actionable task
- [ ] Review project scope
- [ ] Set up workspace/files

## Completed
- [x] Project created and structured

## Notes
${aiResponse.reasoning || 'Add notes about dependencies, blockers, insights, or relevant context here.'}

## Resources
- Links to relevant documentation
- Contact information for stakeholders
- Reference materials
`;
  
  await writeFile(filepath, template);
  return filepath;
};

const createBasicProject = async (projectName: string, projectsDir: string): Promise<string> => {
  const aiResponse = {
    analysis: 'A well-structured project requires clear goals, defined milestones, and actionable next steps.',
    reasoning: 'This basic project template provides a framework for organizing work across all zoom levels.'
  };
  
  return await generateProjectFile(projectName, aiResponse, projectsDir);
};

const analyzeProjectContent = (content: string): {
  status: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: string[];
} => {
  const lines = content.split('\n');
  let totalTasks = 0;
  let completedTasks = 0;
  const pendingTasks: string[] = [];
  
  // Check for explicit status
  const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/);
  let status = statusMatch ? statusMatch[1] : 'Active';
  
  for (const line of lines) {
    if (line.includes('[ ]') || line.includes('[x]')) {
      totalTasks++;
      if (line.includes('[x]')) {
        completedTasks++;
      } else {
        const taskText = line.replace(/^.*\[\s\]\s*/, '').trim();
        if (taskText) {
          pendingTasks.push(taskText);
        }
      }
    }
  }
  
  // Override status based on completion
  if (totalTasks > 0 && completedTasks === totalTasks) {
    status = 'Completed';
  } else if (completedTasks > 0) {
    status = 'In Progress';
  }
  
  return { status, totalTasks, completedTasks, pendingTasks };
};

const updateProjectCompletion = async (projectFile: string, content: string): Promise<void> => {
  const updatedContent = content
    .replace(/\*\*Status:\*\*\s*\w+/, '**Status:** Completed')
    .replace(/\*\*Target:\*\*.*/, `**Completed:** ${getCurrentDate()}`);
  
  await writeFile(projectFile, updatedContent);
};

const findProjectFile = (projectFiles: string[], projectName: string): string | null => {
  const sanitizedName = sanitizeFilename(projectName);
  
  return projectFiles.find(file => {
    const basename = path.basename(file, '.md');
    return basename === sanitizedName || basename.includes(sanitizedName);
  }) || null;
};