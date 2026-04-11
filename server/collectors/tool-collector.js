import { resolve } from 'path';
import { globSync } from 'glob';
import { readJsonl, claudeDir } from '../utils/file-reader.js';

export function collectToolUsage(sessionPaths) {
  const toolCounts = {};
  const toolTimeline = [];

  for (const sessionPath of sessionPaths.slice(0, 100)) {
    if (!sessionPath) continue;
    const lines = readJsonl(sessionPath);

    const sessionTools = {};
    let sessionDate = null;

    for (const line of lines) {
      if (line.type === 'assistant' && line.message?.content) {
        if (!sessionDate && line.timestamp) {
          sessionDate = new Date(line.timestamp).toISOString().slice(0, 10);
        }
        if (Array.isArray(line.message.content)) {
          for (const block of line.message.content) {
            if (block.type === 'tool_use') {
              const name = block.name || 'unknown';
              toolCounts[name] = (toolCounts[name] || 0) + 1;
              sessionTools[name] = (sessionTools[name] || 0) + 1;
            }
          }
        }
      }
    }

    if (sessionDate && Object.keys(sessionTools).length > 0) {
      toolTimeline.push({
        date: sessionDate,
        tools: sessionTools,
        diversity: Object.keys(sessionTools).length,
      });
    }
  }

  return {
    toolCounts,
    toolTimeline,
    topTools: Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count })),
  };
}
