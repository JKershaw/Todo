import { format } from 'date-fns';

export const getCurrentDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getCurrentDateTime = (): string => {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
};

export const getTargetDate = (daysFromNow: number = 30): string => {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  return format(target, 'yyyy-MM-dd');
};

export const calculateDaysSince = (date: string): number => {
  const then = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - then.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const sanitizeFilename = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const parseMarkdownCheckbox = (line: string): { checked: boolean; content: string } => {
  const match = line.match(/^\s*-\s*\[([x\s])\]\s*(.+)$/);
  if (!match) return { checked: false, content: line };
  
  return {
    checked: match[1].toLowerCase() === 'x',
    content: match[2].trim()
  };
};

export const createMarkdownCheckbox = (content: string, checked: boolean = false): string => {
  const checkbox = checked ? '[x]' : '[ ]';
  return `- ${checkbox} ${content}`;
};