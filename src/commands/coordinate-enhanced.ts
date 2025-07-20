import chalk from 'chalk';
import { enhancedCoordinateCommand } from '../ai/relationship-mapper';
import { coordinateCommand } from './coordinate';
import { fileExists, getWorkspaceFiles } from '../files/filesystem';

export const coordinateEnhancedCommand = async (
  workspaceDir: string = '.', 
  useEnhanced: boolean = true
): Promise<void> => {
  try {
    const files = getWorkspaceFiles(workspaceDir);
    
    // Check if workspace is initialized
    if (!await fileExists(files.config)) {
      console.log(chalk.red('Workspace not initialized. Run "prod init <directory>" first.'));
      return;
    }

    if (useEnhanced) {
      console.log(chalk.blue('🧠 Running Enhanced AI Task Relationship Analysis...'));
      console.log(chalk.gray('This provides deeper insights into task coordination and optimization.'));
      console.log('');
      
      try {
        await enhancedCoordinateCommand(workspaceDir);
      } catch (error) {
        console.log(chalk.yellow('⚠️  Enhanced analysis failed, falling back to standard coordination...'));
        console.log('');
        await coordinateCommand(workspaceDir);
      }
    } else {
      console.log(chalk.blue('🔗 Running Standard Task Coordination Analysis...'));
      console.log('');
      await coordinateCommand(workspaceDir);
    }
    
  } catch (error) {
    console.error(chalk.red(`Enhanced coordinate command failed: ${error}`));
    process.exit(1);
  }
};

// CLI-specific help text
export const coordinateEnhancedHelp = `
Enhanced Task Coordination - Intelligent Task Relationship Analysis

USAGE:
  prod coordinate-enhanced [options]

OPTIONS:
  --basic     Use standard coordination analysis instead of enhanced version
  --help      Show this help message

DESCRIPTION:
  The enhanced coordinate command provides advanced AI-powered analysis of task 
  relationships, including:
  
  • Deep task dependency analysis with impact scoring
  • Intelligent sequencing recommendations  
  • Parallel work opportunity identification
  • Energy-level optimization suggestions
  • Resource conflict detection
  • Critical path analysis
  
  This helps you work smarter by understanding how tasks interconnect and finding 
  the most efficient ways to coordinate your work.

EXAMPLES:
  prod coordinate-enhanced           # Run enhanced analysis
  prod coordinate-enhanced --basic   # Use standard analysis
  
The enhanced version requires a configured AI service (Anthropic Claude) and may 
take longer to complete due to more sophisticated analysis.
`;