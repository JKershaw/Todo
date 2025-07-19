#!/usr/bin/env node

import { config } from 'dotenv';
import { Command } from 'commander';
import * as path from 'path';

// Load .env from multiple possible locations
config({ path: path.join(__dirname, '../.env') }); // Build directory
config({ path: path.join(process.cwd(), '.env') }); // Current directory
config(); // Default behavior
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { saveCommand } from './commands/save';
import { zoomCommand } from './commands/zoom';

const program = new Command();

program
  .name('prod')
  .description('Minimal, markdown-based, local-first personal productivity system')
  .version('1.0.0');

program
  .command('init')
  .argument('<directory>', 'Directory to initialize')
  .description('Initialize a new productivity workspace')
  .action(async (directory) => {
    await initCommand(directory);
  });

program
  .command('status')
  .description('Analyze current system state and provide insights')
  .option('-d, --directory <dir>', 'Workspace directory', '.')
  .action(async (options) => {
    await statusCommand(options.directory);
  });

program
  .command('save')
  .argument('<description>', 'Description of completed work or progress')
  .description('Record completion or progress, update relevant files')
  .option('-d, --directory <dir>', 'Workspace directory', '.')
  .action(async (description, options) => {
    await saveCommand(description, options.directory);
  });

program
  .command('zoom')
  .argument('<direction>', 'Zoom direction: in, out, or level N (0-4)')
  .description('Navigate between scale levels for perspective')
  .option('-d, --directory <dir>', 'Workspace directory', '.')
  .action(async (direction, options) => {
    await zoomCommand(direction, options.directory);
  });

program
  .command('reflect')
  .description('Guided reflection and system improvement')
  .option('-t, --type <type>', 'Reflection type: weekly, monthly', 'weekly')
  .option('-d, --directory <dir>', 'Workspace directory', '.')
  .action(async (options) => {
    console.log(chalk.yellow('Reflect command not yet implemented'));
    console.log(chalk.white('This will provide guided reflection and system improvement'));
  });

program
  .command('project')
  .argument('<action>', 'Action: create, status, complete')
  .argument('[name]', 'Project name')
  .description('Project lifecycle management')
  .option('-d, --directory <dir>', 'Workspace directory', '.')
  .action(async (action, name, options) => {
    console.log(chalk.yellow('Project command not yet implemented'));
    console.log(chalk.white(`Would ${action} project: ${name || 'current'}`));
  });

// Handle unknown commands
program.on('command:*', () => {
  console.log(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(chalk.white('Run "prod --help" for available commands'));
  process.exit(1);
});

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});