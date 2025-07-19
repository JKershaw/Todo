import * as yaml from 'js-yaml';
import * as path from 'path';
import { Config } from '../types';
import { readFile, fileExists } from '../files/filesystem';

const DEFAULT_CONFIG: Config = {
  ai: {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    api_key_env: 'ANTHROPIC_API_KEY',
    max_tokens: 1000,
    temperature: 0.3
  },
  system: {
    workspace_dir: '.',
    backup_enabled: true,
    auto_save: false
  }
};

export const loadConfig = async (workspaceDir: string): Promise<Config> => {
  const configPath = path.join(workspaceDir, 'config.yml');
  
  if (await fileExists(configPath)) {
    try {
      const configContent = await readFile(configPath);
      const userConfig = yaml.load(configContent) as Partial<Config>;
      
      return {
        ai: { ...DEFAULT_CONFIG.ai, ...userConfig.ai },
        system: { ...DEFAULT_CONFIG.system, ...userConfig.system }
      };
    } catch (error) {
      console.warn(`Warning: Could not parse config.yml, using defaults: ${error}`);
    }
  }
  
  return { ...DEFAULT_CONFIG };
};