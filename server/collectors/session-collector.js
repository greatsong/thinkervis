import { readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { globSync } from 'glob';
import { readJson, readJsonl, claudeDir } from '../utils/file-reader.js';

export function collectSessions(since = null) {
  const projectsPath = resolve(claudeDir(), 'projects');
  const indexFiles = globSync('*/sessions-index.json', { cwd: projectsPath });

  const allSessions = [];

  for (const indexFile of indexFiles) {
    const fullPath = resolve(projectsPath, indexFile);
    const data = readJson(fullPath);
    if (!data?.entries) continue;

    const projectDir = indexFile.replace('/sessions-index.json', '');

    for (const entry of data.entries) {
      const created = new Date(entry.created || entry.modified);
      if (since && created <= since) continue;

      allSessions.push({
        sessionId: entry.sessionId,
        firstPrompt: entry.firstPrompt || '',
        summary: entry.summary || '',
        messageCount: entry.messageCount || 0,
        created: entry.created,
        modified: entry.modified,
        projectPath: entry.projectPath || '',
        projectDir,
        gitBranch: entry.gitBranch || '',
        fullPath: entry.fullPath,
        isSidechain: entry.isSidechain || false,
      });
    }
  }

  allSessions.sort((a, b) => new Date(a.created) - new Date(b.created));
  return allSessions;
}

export function collectSessionDetail(sessionFilePath) {
  if (!sessionFilePath) return null;
  const lines = readJsonl(sessionFilePath);

  const messages = [];
  const toolCalls = {};
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const line of lines) {
    if (line.type === 'user' && line.message) {
      const content =
        typeof line.message.content === 'string'
          ? line.message.content
          : Array.isArray(line.message.content)
            ? line.message.content
                .filter((b) => b.type === 'text')
                .map((b) => b.text)
                .join('\n')
            : '';
      messages.push({
        role: 'user',
        content,
        timestamp: line.timestamp,
      });
    }

    if (line.type === 'assistant' && line.message) {
      const msg = line.message;
      if (msg.usage) {
        totalInputTokens += msg.usage.input_tokens || 0;
        totalOutputTokens += msg.usage.output_tokens || 0;
      }
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'tool_use') {
            const name = block.name || 'unknown';
            toolCalls[name] = (toolCalls[name] || 0) + 1;
          }
        }
      }
      const text = Array.isArray(msg.content)
        ? msg.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
        : '';
      messages.push({
        role: 'assistant',
        content: text.slice(0, 500),
        timestamp: line.timestamp,
      });
    }
  }

  return {
    messages,
    toolCalls,
    totalInputTokens,
    totalOutputTokens,
    userMessageCount: messages.filter((m) => m.role === 'user').length,
    assistantMessageCount: messages.filter((m) => m.role === 'assistant').length,
  };
}
