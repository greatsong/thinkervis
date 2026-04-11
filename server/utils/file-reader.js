import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export function getHomedir() {
  return process.env.HOME || process.env.USERPROFILE;
}

export function claudeDir() {
  return resolve(getHomedir(), '.claude');
}

export function projectsDir() {
  return resolve(getHomedir(), 'greatsong-project');
}
