import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { TASK_RELATIONSHIPS_PROMPT } from '../ai/prompts';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  fileExists 
} from '../files/filesystem';

export const coordinateCommand = async (workspaceDir: string = '.'): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    console.log(chalk.blue('Analyzing task relationships and coordination opportunities...'));
    
    const config = await loadConfig(workspaceDir);
    const aiService = createAIService(config);
    
    // Gather all context files
    const context = await gatherContextFiles(workspaceDir, files);
    
    try {
      const analysis = await aiService.analyzeTaskRelationships(TASK_RELATIONSHIPS_PROMPT, context);
      
      // Display task relationships
      console.log(chalk.green('\n🔗 Task Relationships'));
      console.log(chalk.white('─'.repeat(50)));
      
      if (analysis.task_relationships.length > 0) {
        analysis.task_relationships.forEach((rel, index) => {
          const strengthColor = rel.strength === 'strong' ? 'red' : 
                              rel.strength === 'medium' ? 'yellow' : 'white';
          const typeIcon = rel.relationship_type === 'dependency' ? '🔸' :
                          rel.relationship_type === 'enables' ? '🚀' :
                          rel.relationship_type === 'blocks' ? '⚠️' : '🤝';
          
          console.log(chalk.white(`${index + 1}. ${typeIcon} ${rel.from_task}`));
          console.log(chalk[strengthColor](`   ${rel.relationship_type} (${rel.strength})`));
          console.log(chalk.white(`   → ${rel.to_task}`));
          console.log(chalk.gray(`   ${rel.description}\n`));
        });
      } else {
        console.log(chalk.gray('No significant task relationships identified.'));
      }
      
      // Display coordination suggestions
      if (analysis.coordination_suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Coordination Suggestions'));
        console.log(chalk.white('─'.repeat(50)));
        analysis.coordination_suggestions.forEach((suggestion, index) => {
          console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
        });
      }
      
      // Display optimization opportunities
      if (analysis.optimization_opportunities.length > 0) {
        console.log(chalk.blue('\n⚡ Optimization Opportunities'));
        console.log(chalk.white('─'.repeat(50)));
        analysis.optimization_opportunities.forEach((opportunity, index) => {
          console.log(chalk.white(`  ${index + 1}. ${opportunity}`));
        });
      }
      
      // Display priority adjustments
      if (analysis.priority_adjustments.length > 0) {
        console.log(chalk.yellow('\n📈 Priority Adjustments'));
        console.log(chalk.white('─'.repeat(50)));
        analysis.priority_adjustments.forEach((adjustment, index) => {
          const arrow = adjustment.suggested_priority > adjustment.current_priority ? '↗️' : '↘️';
          console.log(chalk.white(`  ${index + 1}. ${arrow} ${adjustment.task}`));
          console.log(chalk.gray(`     Priority: ${adjustment.current_priority} → ${adjustment.suggested_priority}`));
          console.log(chalk.gray(`     Reason: ${adjustment.reasoning}\n`));
        });
      }
      
    } catch (aiError) {
      console.log(chalk.yellow('⚠️  AI service unavailable, showing basic task coordination...'));
      await showBasicCoordination(files);
    }
    
  } catch (error) {
    console.error(chalk.red(`Coordinate command failed: ${error}`));
    process.exit(1);
  }
};

const gatherContextFiles = async (workspaceDir: string, files: any): Promise<string> => {
  const context = ['=== TASK RELATIONSHIP ANALYSIS CONTEXT ===\n'];
  
  // Read core files
  const coreFiles = [
    { name: 'README', path: files.readme },
    { name: 'PLAN', path: files.plan },
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
  
  return context.join('\n');
};

const showBasicCoordination = async (files: any): Promise<void> => {
  console.log(chalk.green('\n🔗 Basic Task Coordination (AI unavailable)'));
  console.log(chalk.white('─'.repeat(50)));
  
  // Basic coordination suggestions without AI
  console.log(chalk.blue('\n💡 Basic Suggestions:'));
  console.log(chalk.white('  1. Review tasks in current projects for dependencies'));
  console.log(chalk.white('  2. Group similar tasks together for efficient batching'));
  console.log(chalk.white('  3. Identify tasks that unlock multiple other tasks'));
  console.log(chalk.white('  4. Look for tasks that could be done in parallel'));
  console.log(chalk.white('  5. Consider if any Level 0 tasks are blocking higher-level work'));
};