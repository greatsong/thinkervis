import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { projectsDir } from '../utils/file-reader.js';

export function collectGitData(since = null) {
  const baseDir = projectsDir();
  const repos = [];

  let dirs;
  try {
    dirs = readdirSync(baseDir);
  } catch {
    return { repos: [], totalCommits: 0, totalAiAssisted: 0, commitTimeline: [] };
  }

  for (const dir of dirs) {
    const repoPath = join(baseDir, dir);
    const gitPath = join(repoPath, '.git');
    if (!existsSync(gitPath)) continue;

    try {
      const sinceArg = since ? `--since="${since.toISOString()}"` : '--since="2026-01-01"';
      const logOutput = execSync(
        `git log --all ${sinceArg} --format="%H|%aI|%s" --no-merges 2>/dev/null || true`,
        { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }
      ).trim();

      if (!logOutput) continue;

      const commits = logOutput.split('\n').filter(Boolean).map((line) => {
        const [hash, date, ...msgParts] = line.split('|');
        return { hash, date, message: msgParts.join('|') };
      });

      // AI-assisted 커밋 수 확인
      const aiOutput = execSync(
        `git log --all ${sinceArg} --grep="Co-Authored-By" --format="%H" --no-merges 2>/dev/null || true`,
        { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }
      ).trim();

      const aiCommits = aiOutput ? aiOutput.split('\n').filter(Boolean).length : 0;

      repos.push({
        name: dir,
        totalCommits: commits.length,
        aiAssistedCommits: aiCommits,
        aiRatio: commits.length > 0 ? (aiCommits / commits.length) : 0,
        lastCommit: commits[0]?.date || null,
        commits: commits.slice(0, 50),
      });
    } catch {
      // skip repos with git errors
    }
  }

  const totalCommits = repos.reduce((sum, r) => sum + r.totalCommits, 0);
  const totalAiAssisted = repos.reduce((sum, r) => sum + r.aiAssistedCommits, 0);

  return {
    repos: repos.sort((a, b) => b.totalCommits - a.totalCommits),
    totalCommits,
    totalAiAssisted,
  };
}
