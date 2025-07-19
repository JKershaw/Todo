import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkspaceFiles } from '../types';

export const ensureDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const readFile = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
};

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
};

export const createBackup = async (filePath: string): Promise<void> => {
  if (await fileExists(filePath)) {
    const backupPath = `${filePath}.bak`;
    const content = await readFile(filePath);
    await writeFile(backupPath, content);
  }
};

export const getWorkspaceFiles = (workspaceDir: string): WorkspaceFiles => {
  return {
    readme: path.join(workspaceDir, 'README.md'),
    plan: path.join(workspaceDir, 'plan.md'),
    reflect: path.join(workspaceDir, 'reflect.md'),
    config: path.join(workspaceDir, 'config.yml'),
    projects_dir: path.join(workspaceDir, 'projects'),
    areas_dir: path.join(workspaceDir, 'areas'),
    system_dir: path.join(workspaceDir, 'system')
  };
};

export const getAllMarkdownFiles = async (dirPath: string): Promise<string[]> => {
  const files: string[] = [];
  
  const scan = async (currentPath: string): Promise<void> => {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories we can't read
    }
  };
  
  await scan(dirPath);
  return files;
};