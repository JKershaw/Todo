import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { createAIService } from '../ai/service';
import { ZOOM_PROMPT } from '../ai/prompts';
import { ZOOM_LEVELS } from '../types';
import { 
  getWorkspaceFiles, 
  getAllMarkdownFiles, 
  readFile, 
  fileExists 
} from '../files/filesystem';

export const zoomCommand = async (
  direction: 'in' | 'out' | string, 
  workspaceDir: string = '.'
): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }
    
    const config = await loadConfig(workspaceDir);
    const aiService = createAIService(config);
    
    // Determine target zoom level
    let zoomRequest = direction;
    if (direction === 'in' || direction === 'out') {
      const currentLevel = await getCurrentZoomLevel(files);
      if (direction === 'in' && currentLevel > 0) {
        zoomRequest = `level ${currentLevel - 1}`;
      } else if (direction === 'out' && currentLevel < 4) {
        zoomRequest = `level ${currentLevel + 1}`;
      } else {
        console.log(chalk.yellow(`Cannot zoom ${direction} from level ${currentLevel}`));
        return;
      }
    } else if (direction.startsWith('level ')) {
      // Already in correct format
    } else {
      // Try to parse as a number
      const level = parseInt(direction, 10);
      if (isNaN(level) || level < 0 || level > 4) {
        console.log(chalk.red('Invalid zoom level. Use: in, out, or level 0-4'));
        return;
      }
      zoomRequest = `level ${level}`;
    }
    
    console.log(chalk.blue(`Zooming to: ${zoomRequest}`));
    
    // Gather context
    const context = await gatherZoomContext(workspaceDir, files);
    
    try {
      const prompt = ZOOM_PROMPT.replace('{{zoomRequest}}', zoomRequest);
      const response = await aiService.analyze(prompt, context);
      
      // Display zoom analysis
      console.log(chalk.green('\n🔍 Zoom Analysis'));
      console.log(chalk.white('─'.repeat(50)));
      
      // Show current level info
      const targetLevelMatch = zoomRequest.match(/level (\d)/);
      if (targetLevelMatch) {
        const level = parseInt(targetLevelMatch[1], 10) as 0 | 1 | 2 | 3 | 4;
        const zoomLevel = ZOOM_LEVELS[level];
        console.log(chalk.blue(`\n📍 Level ${level}: ${zoomLevel.name}`));
        console.log(chalk.white(`   ${zoomLevel.description} (${zoomLevel.time_horizon})`));
      }
      
      console.log(chalk.blue('\nPerspective:'));
      console.log(chalk.white(response.analysis));
      
      if (response.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Focus Recommendations:'));
        response.suggestions.forEach((suggestion, index) => {
          console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
        });
      }
      
      if (response.reasoning) {
        console.log(chalk.blue('\n🤔 Context:'));
        console.log(chalk.white(response.reasoning));
      }
      
      // Show all levels for reference
      console.log(chalk.gray('\n📚 All Zoom Levels:'));
      Object.values(ZOOM_LEVELS).forEach(level => {
        const marker = targetLevelMatch && parseInt(targetLevelMatch[1]) === level.level ? '→' : ' ';
        console.log(chalk.gray(`  ${marker} Level ${level.level}: ${level.name} (${level.time_horizon})`));
      });
      
    } catch (aiError) {
      console.log(chalk.yellow('⚠️  AI service unavailable, showing basic zoom info...'));
      await showBasicZoom(zoomRequest);
    }
    
  } catch (error) {
    console.error(chalk.red(`Zoom command failed: ${error}`));
    process.exit(1);
  }
};

const getCurrentZoomLevel = async (files: any): Promise<number> => {
  // Simple heuristic: look at the plan file and see what level tasks are most prominent
  if (await fileExists(files.plan)) {
    const content = await readFile(files.plan);
    
    // Count level headers
    const levelCounts = [0, 0, 0, 0, 0];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('Level 0')) levelCounts[0]++;
      else if (line.includes('Level 1')) levelCounts[1]++;
      else if (line.includes('Level 2')) levelCounts[2]++;
      else if (line.includes('Level 3')) levelCounts[3]++;
      else if (line.includes('Level 4')) levelCounts[4]++;
    }
    
    // Return the level with most content, defaulting to 1
    const maxLevel = levelCounts.indexOf(Math.max(...levelCounts));
    return maxLevel > 0 ? maxLevel : 1;
  }
  
  return 1; // Default to daily/weekly level
};

const gatherZoomContext = async (workspaceDir: string, files: any): Promise<string> => {
  const context = ['=== ZOOM CONTEXT ===\n'];
  
  // Read core files
  const coreFiles = [
    { name: 'PLAN', path: files.plan },
    { name: 'README', path: files.readme }
  ];
  
  for (const file of coreFiles) {
    if (await fileExists(file.path)) {
      const content = await readFile(file.path);
      context.push(`=== ${file.name} ===`);
      context.push(content);
      context.push('');
    }
  }
  
  // Include project summaries
  const projectFiles = await getAllMarkdownFiles(files.projects_dir);
  for (const projectFile of projectFiles) {
    const content = await readFile(projectFile);
    // Include first few lines for context
    const lines = content.split('\n').slice(0, 10);
    context.push(`=== PROJECT SUMMARY: ${projectFile} ===`);
    context.push(lines.join('\n'));
    context.push('');
  }
  
  return context.join('\n');
};

const showBasicZoom = async (zoomRequest: string): Promise<void> => {
  console.log(chalk.green('\n🔍 Basic Zoom Info'));
  console.log(chalk.white('─'.repeat(50)));
  
  const levelMatch = zoomRequest.match(/level (\d)/);
  if (levelMatch) {
    const level = parseInt(levelMatch[1], 10) as 0 | 1 | 2 | 3 | 4;
    const zoomLevel = ZOOM_LEVELS[level];
    
    console.log(chalk.blue(`\n📍 Level ${level}: ${zoomLevel.name}`));
    console.log(chalk.white(`   ${zoomLevel.description}`));
    console.log(chalk.white(`   Time horizon: ${zoomLevel.time_horizon}`));
    
    console.log(chalk.blue('\n💡 Focus for this level:'));
    switch (level) {
      case 0:
        console.log(chalk.white('  • Quick, actionable items'));
        console.log(chalk.white('  • 5-15 minute tasks'));
        console.log(chalk.white('  • Clear next steps'));
        break;
      case 1:
        console.log(chalk.white('  • Daily and weekly priorities'));
        console.log(chalk.white('  • 1-3 hour tasks'));
        console.log(chalk.white('  • Regular routines'));
        break;
      case 2:
        console.log(chalk.white('  • Active projects'));
        console.log(chalk.white('  • Multi-day initiatives'));
        console.log(chalk.white('  • Deliverable outcomes'));
        break;
      case 3:
        console.log(chalk.white('  • Quarterly goals'));
        console.log(chalk.white('  • Major milestones'));
        console.log(chalk.white('  • Strategic objectives'));
        break;
      case 4:
        console.log(chalk.white('  • Life vision'));
        console.log(chalk.white('  • Annual themes'));
        console.log(chalk.white('  • Long-term direction'));
        break;
    }
  }
  
  console.log(chalk.gray('\n📚 All Zoom Levels:'));
  Object.values(ZOOM_LEVELS).forEach(level => {
    console.log(chalk.gray(`    Level ${level.level}: ${level.name} (${level.time_horizon})`));
  });
};