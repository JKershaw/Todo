import { AITaskAnalysis, TaskRelationship, PriorityAdjustment } from '../types';
import { createAIService } from './service';
import { loadConfig } from '../core/config';
import { getAllMarkdownFiles, readFile, getWorkspaceFiles } from '../files/filesystem';

interface EnhancedTaskRelationship extends TaskRelationship {
  impact_score: number;
  urgency_factor: number;
  resource_overlap: string[];
  completion_time_estimate: string;
  energy_level_required: 'low' | 'medium' | 'high';
}

interface TaskContext {
  task: string;
  project: string;
  level: number;
  completed: boolean;
  dependencies: string[];
  blocks: string[];
  estimated_time: string;
  context_tags: string[];
}

interface IntelligentCoordination {
  optimal_sequences: {
    sequence_name: string;
    tasks: string[];
    rationale: string;
    estimated_completion: string;
    energy_profile: string;
  }[];
  parallel_opportunities: {
    group_name: string;
    tasks: string[];
    rationale: string;
    resource_requirements: string[];
  }[];
  critical_path: {
    tasks: string[];
    bottlenecks: string[];
    acceleration_opportunities: string[];
  };
  energy_optimization: {
    high_energy_tasks: string[];
    low_energy_tasks: string[];
    context_switching_cost: string[];
  };
}

export class EnhancedTaskRelationshipMapper {
  private aiService: any;
  private workspaceDir: string;

  constructor(workspaceDir: string = '.') {
    this.workspaceDir = workspaceDir;
  }

  async initialize(): Promise<void> {
    const config = await loadConfig(this.workspaceDir);
    this.aiService = createAIService(config);
  }

  async analyzeTaskEcosystem(): Promise<{
    task_contexts: TaskContext[];
    enhanced_relationships: EnhancedTaskRelationship[];
    intelligent_coordination: IntelligentCoordination;
    system_insights: string[];
  }> {
    await this.initialize();
    
    const workspaceContext = await this.gatherEnhancedContext();
    const taskContexts = await this.extractTaskContexts();
    
    const enhancedPrompt = `ADVANCED TASK RELATIONSHIP ANALYSIS

You are an expert productivity system analyst. Analyze the complete task ecosystem to provide sophisticated coordination insights.

TASK CONTEXTS:
${JSON.stringify(taskContexts, null, 2)}

WORKSPACE CONTEXT:
${workspaceContext}

ANALYSIS REQUIREMENTS:

1. ENHANCED TASK RELATIONSHIPS:
For each significant relationship, provide:
- Basic relationship data (from_task, to_task, relationship_type, strength, description)
- impact_score (1-10): How much completing from_task affects to_task
- urgency_factor (1-10): Time sensitivity of this relationship
- resource_overlap: What resources/skills/contexts are shared
- completion_time_estimate: Realistic time estimate
- energy_level_required: Mental/physical energy needed

2. INTELLIGENT COORDINATION:
- optimal_sequences: Best order to complete related tasks
- parallel_opportunities: Tasks that can be done simultaneously
- critical_path: Tasks that most affect overall progress
- energy_optimization: Match tasks to energy levels/contexts

3. SYSTEM-LEVEL INSIGHTS:
- Patterns in task structure
- Workflow bottlenecks
- Automation opportunities
- Strategic recommendations

Respond with ONLY valid JSON matching this structure:
{
  "enhanced_relationships": [/* EnhancedTaskRelationship objects */],
  "intelligent_coordination": {
    "optimal_sequences": [/*...*/],
    "parallel_opportunities": [/*...*/],
    "critical_path": {/*...*/},
    "energy_optimization": {/*...*/}
  },
  "system_insights": [/* strategic observations */]
}`;

    try {
      const analysis = await this.aiService.analyze(enhancedPrompt, '');
      
      return {
        task_contexts: taskContexts,
        enhanced_relationships: analysis.enhanced_relationships || [],
        intelligent_coordination: analysis.intelligent_coordination || this.getDefaultCoordination(),
        system_insights: analysis.system_insights || []
      };
    } catch (error) {
      console.warn('Enhanced relationship mapping failed, using basic analysis:', error);
      return await this.fallbackToBasicAnalysis(taskContexts);
    }
  }

  private async extractTaskContexts(): Promise<TaskContext[]> {
    const files = getWorkspaceFiles(this.workspaceDir);
    const projectFiles = await getAllMarkdownFiles(files.projects_dir);
    const contexts: TaskContext[] = [];

    for (const projectFile of projectFiles) {
      const content = await readFile(projectFile);
      const lines = content.split('\n');
      
      const projectName = this.extractProjectName(content);
      let currentLevel: number | null = null;
      
      for (const line of lines) {
        // Detect level sections
        if (line.includes('Level 4')) currentLevel = 4;
        else if (line.includes('Level 3')) currentLevel = 3;
        else if (line.includes('Level 2')) currentLevel = 2;
        else if (line.includes('Level 1')) currentLevel = 1;
        else if (line.includes('Level 0')) currentLevel = 0;
        else if (line.startsWith('##') && !line.includes('Level')) currentLevel = null;
        
        // Extract tasks
        if (currentLevel !== null && (line.includes('- [ ]') || line.includes('- [x]'))) {
          const task = line.trim().replace(/- \[[ x]\]\s*/, '');
          const completed = line.includes('- [x]');
          
          if (task) {
            contexts.push({
              task,
              project: projectName,
              level: currentLevel,
              completed,
              dependencies: this.extractDependencies(task),
              blocks: this.extractBlockers(task),
              estimated_time: this.estimateTime(task, currentLevel),
              context_tags: this.extractContextTags(task)
            });
          }
        }
      }
    }
    
    return contexts;
  }

  private async gatherEnhancedContext(): Promise<string> {
    const files = getWorkspaceFiles(this.workspaceDir);
    const context: string[] = [];
    
    // Add recent progress and patterns
    context.push('=== SYSTEM STATE ANALYSIS ===');
    
    try {
      const readme = await readFile(files.readme);
      context.push('=== CURRENT FOCUS ===');
      context.push(readme);
    } catch (e) {
      // README not found
    }
    
    try {
      const plan = await readFile(files.plan);
      context.push('=== PLANNING CONTEXT ===');
      context.push(plan);
    } catch (e) {
      // Plan not found
    }
    
    return context.join('\n\n');
  }

  private extractProjectName(content: string): string {
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('# Project:')) {
      return firstLine.replace('# Project:', '').trim();
    }
    return 'Unknown Project';
  }

  private extractDependencies(task: string): string[] {
    // Simple pattern matching for dependencies
    const dependencyPatterns = [
      /after\s+(.+?)(?:\s|$)/i,
      /depends\s+on\s+(.+?)(?:\s|$)/i,
      /requires\s+(.+?)(?:\s|$)/i,
      /needs\s+(.+?)(?:\s|$)/i
    ];
    
    const dependencies: string[] = [];
    for (const pattern of dependencyPatterns) {
      const match = task.match(pattern);
      if (match) {
        dependencies.push(match[1].trim());
      }
    }
    
    return dependencies;
  }

  private extractBlockers(task: string): string[] {
    const blockerPatterns = [
      /blocks?\s+(.+?)(?:\s|$)/i,
      /prevents?\s+(.+?)(?:\s|$)/i,
      /stops?\s+(.+?)(?:\s|$)/i
    ];
    
    const blockers: string[] = [];
    for (const pattern of blockerPatterns) {
      const match = task.match(pattern);
      if (match) {
        blockers.push(match[1].trim());
      }
    }
    
    return blockers;
  }

  private estimateTime(task: string, level: number): string {
    const timePatterns = [
      /(\d+)\s*(?:min|minute)/i,
      /(\d+)\s*(?:hr|hour)/i,
      /(\d+)\s*(?:day|days)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = task.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    // Default estimates based on level
    const defaultEstimates = {
      0: '15 minutes',
      1: '2 hours',
      2: '1 day',
      3: '1 week',
      4: '1 month'
    };
    
    return defaultEstimates[level as keyof typeof defaultEstimates] || '30 minutes';
  }

  private extractContextTags(task: string): string[] {
    const tags: string[] = [];
    
    // Common productivity contexts
    const contextPatterns = {
      'coding': /code|develop|implement|program|debug/i,
      'writing': /write|document|blog|article|content/i,
      'meeting': /meet|call|discuss|review|sync/i,
      'research': /research|study|learn|investigate/i,
      'admin': /admin|email|organize|file|clean/i,
      'creative': /design|create|brainstorm|ideate/i,
      'analysis': /analyze|plan|strategy|think/i
    };
    
    for (const [tag, pattern] of Object.entries(contextPatterns)) {
      if (pattern.test(task)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  private getDefaultCoordination(): IntelligentCoordination {
    return {
      optimal_sequences: [],
      parallel_opportunities: [],
      critical_path: {
        tasks: [],
        bottlenecks: [],
        acceleration_opportunities: []
      },
      energy_optimization: {
        high_energy_tasks: [],
        low_energy_tasks: [],
        context_switching_cost: []
      }
    };
  }

  private async fallbackToBasicAnalysis(taskContexts: TaskContext[]): Promise<any> {
    // Fallback to basic relationship analysis
    return {
      task_contexts: taskContexts,
      enhanced_relationships: [],
      intelligent_coordination: this.getDefaultCoordination(),
      system_insights: [
        'Enhanced analysis unavailable - using basic task context extraction',
        'Consider checking AI service configuration for advanced features'
      ]
    };
  }
}

// Enhanced coordinate command that uses the new mapper
export const enhancedCoordinateCommand = async (workspaceDir: string = '.'): Promise<void> => {
  const mapper = new EnhancedTaskRelationshipMapper(workspaceDir);
  
  try {
    console.log('\n🧠 Enhanced Task Relationship Analysis');
    console.log('═'.repeat(50));
    
    const analysis = await mapper.analyzeTaskEcosystem();
    
    // Display enhanced relationships
    if (analysis.enhanced_relationships.length > 0) {
      console.log('\n🔗 Enhanced Task Relationships');
      console.log('─'.repeat(30));
      
      analysis.enhanced_relationships.forEach((rel, index) => {
        const strengthEmoji = rel.strength === 'strong' ? '🔴' : rel.strength === 'medium' ? '🟡' : '⚪';
        const typeEmoji = rel.relationship_type === 'dependency' ? '🔸' :
                          rel.relationship_type === 'enables' ? '🚀' :
                          rel.relationship_type === 'blocks' ? '⚠️' : '🤝';
        
        console.log(`\n${index + 1}. ${typeEmoji} ${rel.from_task}`);
        console.log(`   ${rel.relationship_type} → ${rel.to_task}`);
        console.log(`   ${strengthEmoji} Impact: ${rel.impact_score}/10 | Energy: ${rel.energy_level_required}`);
        console.log(`   Time: ${rel.completion_time_estimate}`);
        if (rel.resource_overlap.length > 0) {
          console.log(`   Resources: ${rel.resource_overlap.join(', ')}`);
        }
        console.log(`   ${rel.description}`);
      });
    }
    
    // Display intelligent coordination
    const coord = analysis.intelligent_coordination;
    
    if (coord.optimal_sequences.length > 0) {
      console.log('\n📋 Optimal Task Sequences');
      console.log('─'.repeat(30));
      coord.optimal_sequences.forEach((seq, index) => {
        console.log(`\n${index + 1}. ${seq.sequence_name}`);
        console.log(`   Tasks: ${seq.tasks.join(' → ')}`);
        console.log(`   Time: ${seq.estimated_completion}`);
        console.log(`   ${seq.rationale}`);
      });
    }
    
    if (coord.parallel_opportunities.length > 0) {
      console.log('\n⚡ Parallel Work Opportunities');
      console.log('─'.repeat(30));
      coord.parallel_opportunities.forEach((group, index) => {
        console.log(`\n${index + 1}. ${group.group_name}`);
        console.log(`   Tasks: ${group.tasks.join(' | ')}`);
        console.log(`   ${group.rationale}`);
      });
    }
    
    // Display system insights
    if (analysis.system_insights.length > 0) {
      console.log('\n💡 System-Level Insights');
      console.log('─'.repeat(30));
      analysis.system_insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight}`);
      });
    }
    
    console.log('\n✨ Enhanced coordination analysis complete!');
    
  } catch (error) {
    console.error('Enhanced coordination analysis failed:', error);
    console.log('Falling back to standard coordinate command...');
    
    // Import and run standard coordinate as fallback
    const { coordinateCommand } = await import('../commands/coordinate');
    await coordinateCommand(workspaceDir);
  }
};