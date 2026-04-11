import { Router } from 'express';
import { resolve } from 'path';
import { readJson } from '../utils/file-reader.js';
import { collectSessions } from '../collectors/session-collector.js';
import { collectPrompts } from '../collectors/prompt-collector.js';
import { compareGrowth } from '../coaching/growth-comparator.js';

const router = Router();
const CHECKPOINTS_DIR = resolve(process.cwd(), 'checkpoints');

// 현재 상태 요약
router.get('/', (req, res) => {
  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  const index = readJson(indexPath) || { checkpoints: [] };

  const lastCheckpoint = index.checkpoints[index.checkpoints.length - 1];
  const since = lastCheckpoint ? new Date(lastCheckpoint.timestamp) : null;

  // 미분석 데이터 카운트
  const pendingSessions = collectSessions(since);
  const pendingPrompts = collectPrompts(since);

  // 성장 추이
  let growthData = null;
  if (index.checkpoints.length >= 2) {
    const checkpointsWithCoaching = index.checkpoints.map((cp) => ({
      ...cp,
      coaching: readJson(resolve(CHECKPOINTS_DIR, cp.id, 'coaching.json')),
    }));
    growthData = compareGrowth(checkpointsWithCoaching);
  }

  res.json({
    lastCheckpoint: lastCheckpoint
      ? {
          id: lastCheckpoint.id,
          timestamp: lastCheckpoint.timestamp,
          daysSince: Math.floor(
            (Date.now() - new Date(lastCheckpoint.timestamp)) / 86400000
          ),
          overallNarrative: lastCheckpoint.overallNarrative,
          scores: lastCheckpoint.scores,
        }
      : null,
    pending: {
      sessions: pendingSessions.length,
      prompts: pendingPrompts.length,
    },
    totalCheckpoints: index.checkpoints.length,
    growthData,
  });
});

// 성장 여정 데이터
router.get('/growth', (req, res) => {
  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  const index = readJson(indexPath) || { checkpoints: [] };

  const checkpointsWithCoaching = index.checkpoints.map((cp) => ({
    ...cp,
    coaching: readJson(resolve(CHECKPOINTS_DIR, cp.id, 'coaching.json')),
  }));

  const growthData = compareGrowth(checkpointsWithCoaching);

  res.json({
    checkpoints: checkpointsWithCoaching.map((cp) => ({
      id: cp.id,
      timestamp: cp.timestamp,
      period: cp.period,
      summary: cp.summary,
      overallNarrative: cp.coaching?.overallNarrative,
      scores: cp.coaching?.dimensions?.reduce((acc, d) => {
        acc[d.name] = d.score;
        return acc;
      }, {}),
      strengths: cp.coaching?.topStrengths,
      focusAreas: cp.coaching?.focusAreas,
    })),
    growthData,
  });
});

export default router;
