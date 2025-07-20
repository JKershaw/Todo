import * as path from 'path';
import chalk from 'chalk';
import { 
  ensureDirectory, 
  writeFile, 
  fileExists, 
  getWorkspaceFiles 
} from '../files/filesystem';
import {
  renderTemplate,
  README_TEMPLATE,
  PLAN_TEMPLATE,
  REFLECT_TEMPLATE,
  CONFIG_TEMPLATE,
  BOOTSTRAP_PROJECT_TEMPLATE
} from '../files/templates';

export const initCommand = async (directory: string): Promise<void> => {
  const workspaceDir = path.resolve(directory);
  
  console.log(chalk.blue(`Initializing productivity system in: ${workspaceDir}`));
  
  try {
    await ensureDirectory(workspaceDir);
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if already initialized
    if (await fileExists(files.config)) {
      console.log(chalk.yellow('Workspace already initialized. Use status command to check current state.'));
      return;
    }
    
    // Create directory structure
    await ensureDirectory(files.projects_dir);
    await ensureDirectory(files.areas_dir);
    
    // Create core files
    await writeFile(files.readme, renderTemplate(README_TEMPLATE));
    await writeFile(files.plan, renderTemplate(PLAN_TEMPLATE));
    await writeFile(files.reflect, renderTemplate(REFLECT_TEMPLATE));
    await writeFile(files.config, CONFIG_TEMPLATE);
    
    // Create bootstrap project (self-development)
    const bootstrapProjectPath = path.join(files.projects_dir, 'build-productivity-system.md');
    await writeFile(bootstrapProjectPath, renderTemplate(BOOTSTRAP_PROJECT_TEMPLATE));
    
    // Success message
    console.log(chalk.green('\n✓ Productivity system initialized successfully!'));
    console.log(chalk.white('\nFiles created:'));
    console.log(chalk.gray(`  ${files.readme}`));
    console.log(chalk.gray(`  ${files.plan}`));
    console.log(chalk.gray(`  ${files.reflect}`));
    console.log(chalk.gray(`  ${files.config}`));
    console.log(chalk.gray(`  ${bootstrapProjectPath}`));
    
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.white('  1. Review and edit config.yml for your preferences'));
    console.log(chalk.white('  2. Set up your AI API key (see config.yml for details)'));
    console.log(chalk.white('  3. Run "prod status" to see your current state'));
    console.log(chalk.white('  4. Start with the bootstrap project to improve the system itself'));
    
  } catch (error) {
    console.error(chalk.red(`Failed to initialize workspace: ${error}`));
    process.exit(1);
  }
};