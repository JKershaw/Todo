import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { REFLECT_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  writeFile,
  fileExists,
  createBackup
} from '../files/filesystem';
import { getCurrentDate, getCurrentDateTime, calculateDaysSince } from '../core/utils';

export const reflectCommand = async (
  type: 'weekly' | 'monthly' = 'weekly',
  workspaceDir: string = '.'
): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    console.log(chalk.blue(`Starting ${type} reflection...`));
    
    const config = await loadConfig(workspaceDir);
    const aiService = createAIService(config);
    
    // Gather reflection context
    const context = await gatherReflectionContext(workspaceDir, files, type);
    
    try {
      const prompt = REFLECT_PROMPT
        .replace('{{reflectionType}}', type)
        .replace('{{timePeriod}}', getTimePeriodLabel(type));
      
      const response = await aiService.analyze(prompt, context);
      
      // Display reflection analysis
      console.log(chalk.green(`\n🤔 ${capitalize(type)} Reflection`));
      console.log(chalk.white('─'.repeat(50)));
      
      console.log(chalk.blue('\nProgress Analysis:'));
      console.log(chalk.white(response.analysis));
      
      if (response.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Insights & Recommendations:'));
        response.suggestions.forEach((suggestion, index) => {
          console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
        });
      }
      
      if (response.reasoning) {
        console.log(chalk.blue('\n🔍 Patterns Observed:'));
        console.log(chalk.white(response.reasoning));
      }
      
      // Update reflect.md file
      await updateReflectFile(files, response, type);
      
      console.log(chalk.green('\n✓ Reflection completed and saved!'));
      console.log(chalk.white(`Check ${files.reflect} for your reflection history.`));
      
    } catch (aiError) {
      console.log(chalk.yellow('⚠️  AI service unavailable, providing basic reflection...'));
      await performBasicReflection(files, type, workspaceDir);
    }
    
  } catch (error) {
    console.error(chalk.red(`Reflect command failed: ${error}`));
    process.exit(1);
  }
};

const gatherReflectionContext = async (workspaceDir: string, files: any, type: string): Promise<string> => {
  const context = [`=== ${type.toUpperCase()} REFLECTION CONTEXT ===\n`];
  
  // Add current system state
  if (await fileExists(files.readme)) {
    const readme = await readFile(files.readme);
    context.push('=== CURRENT STATUS ===');
    context.push(readme);
    context.push('');
  }
  
  // Add recent reflection history
  if (await fileExists(files.reflect)) {
    const reflectContent = await readFile(files.reflect);
    context.push('=== REFLECTION HISTORY ===');
    context.push(reflectContent);
    context.push('');
  }
  
  // Add project progress
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  for (const projectFile of projectFiles.slice(0, 3)) { // Limit to avoid token limits
    const content = await readFile(projectFile);
    context.push(`=== PROJECT: ${projectFile} ===`);
    context.push(content);
    context.push('');
  }
  
  // Add plan status
  if (await fileExists(files.plan)) {
    const plan = await readFile(files.plan);
    context.push('=== CURRENT PLAN ===');
    context.push(plan);
    context.push('');
  }
  
  return context.join('\n');
};

const updateReflectFile = async (files: any, response: any, type: string): Promise<void> => {
  try {
    let reflectContent = '';
    
    if (await fileExists(files.reflect)) {
      await createBackup(files.reflect);
      reflectContent = await readFile(files.reflect);
    }
    
    const timestamp = getCurrentDateTime();
    const newEntry = `
## ${timestamp} - ${capitalize(type)} Reflection

### Progress Analysis
${response.analysis}

### Key Insights
${response.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

### Patterns & Observations  
${response.reasoning}

### Next Period Focus
Based on this reflection, focus areas for the coming ${type === 'weekly' ? 'week' : 'month'}:
- Review and act on the insights above
- Address any stalled areas identified
- Continue building on successful patterns

---

`;
    
    // Prepend new reflection to existing content
    const updatedContent = newEntry + reflectContent;
    await writeFile(files.reflect, updatedContent);
    
  } catch (error) {
    console.log(chalk.yellow(`Warning: Could not update reflection file: ${error}`));
  }
};

const performBasicReflection = async (files: any, type: string, workspaceDir: string): Promise<void> => {
  console.log(chalk.green(`\n🤔 Basic ${capitalize(type)} Reflection`));
  console.log(chalk.white('─'.repeat(50)));
  
  // Count basic metrics
  let activeProjects = 0;
  let completedTasks = 0;
  let totalTasks = 0;
  
  try {
    const projectFiles = await getAllMarkdownFiles(files.projects_dir);
    activeProjects = projectFiles.length;
    
    // Analyze README for task completion
    if (await fileExists(files.readme)) {
      const readmeContent = await readFile(files.readme);
      const lines = readmeContent.split('\n');
      
      for (const line of lines) {
        if (line.includes('[ ]') || line.includes('[x]')) {
          totalTasks++;
          if (line.includes('[x]')) completedTasks++;
        }
      }
    }
  } catch {
    // Ignore errors in basic reflection
  }
  
  console.log(chalk.blue('\nBasic Progress Summary:'));
  console.log(chalk.white(`  • Active Projects: ${activeProjects}`));
  console.log(chalk.white(`  • Task Completion: ${completedTasks}/${totalTasks} tasks`));
  
  if (totalTasks > 0) {
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    console.log(chalk.white(`  • Completion Rate: ${completionRate}%`));
  }
  
  console.log(chalk.blue('\n💡 Basic Reflection Questions:'));
  console.log(chalk.white('  1. What did you accomplish this period?'));
  console.log(chalk.white('  2. What challenges did you face?'));
  console.log(chalk.white('  3. What patterns do you notice?'));
  console.log(chalk.white('  4. What should you focus on next?'));
  
  console.log(chalk.blue('\n🎯 Suggested Actions:'));
  console.log(chalk.white('  • Update your plan.md with insights'));
  console.log(chalk.white('  • Review stalled tasks and projects'));
  console.log(chalk.white('  • Set priorities for the next period'));
  
  // Simple reflection entry
  const basicReflection = {
    analysis: `Basic ${type} reflection completed. ${activeProjects} active projects, ${completedTasks}/${totalTasks} tasks completed.`,
    suggestions: [
      'Review completed tasks and celebrate progress',
      'Identify any stalled projects that need attention',
      'Set clear priorities for the next period',
      'Consider what patterns are working well'
    ],
    reasoning: `This was a basic reflection due to AI unavailability. Consider running again when AI is available for deeper insights.`
  };
  
  await updateReflectFile(files, basicReflection, type);
  console.log(chalk.green('\n✓ Basic reflection saved to reflect.md'));
};

const getTimePeriodLabel = (type: string): string => {
  return type === 'weekly' ? 'past week' : 'past month';
};

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};