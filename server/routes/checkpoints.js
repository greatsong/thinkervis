import { Router } from 'express';
import { resolve } from 'path';
import { readJson } from '../utils/file-reader.js';

const router = Router();
const CHECKPOINTS_DIR = resolve(process.cwd(), 'checkpoints');

// 점검 이력 조회
router.get('/', (req, res) => {
  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  const index = readJson(indexPath) || { checkpoints: [] };

  res.json({
    checkpoints: index.checkpoints.reverse(),
    total: index.checkpoints.length,
  });
});

// 개별 점검 상세 조회
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const checkpointDir = resolve(CHECKPOINTS_DIR, id);

  const coaching = readJson(resolve(checkpointDir, 'coaching.json'));
  const rawData = readJson(resolve(checkpointDir, 'raw-data.json'));

  if (!coaching) {
    return res.status(404).json({ error: '점검 결과를 찾을 수 없습니다.' });
  }

  // 인덱스에서 메타 정보 가져오기
  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  const index = readJson(indexPath) || { checkpoints: [] };
  const meta = index.checkpoints.find((c) => c.id === id);

  // 이전 점검 찾기
  const sortedCheckpoints = [...(index.checkpoints || [])].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const currentIdx = sortedCheckpoints.findIndex((c) => c.id === id);
  const previousCheckpoint = currentIdx > 0 ? sortedCheckpoints[currentIdx - 1] : null;

  let previousChanges = null;
  if (previousCheckpoint) {
    const prevCoaching = readJson(
      resolve(CHECKPOINTS_DIR, previousCheckpoint.id, 'coaching.json')
    );
    if (prevCoaching?.dimensions) {
      previousChanges = prevCoaching.dimensions.map((prevDim) => {
        const currDim = coaching.dimensions?.find((d) => d.name === prevDim.name);
        return {
          name: prevDim.name,
          previous: prevDim.score,
          current: currDim?.score || 0,
          change: currDim ? +(currDim.score - prevDim.score).toFixed(1) : 0,
        };
      });
    }
  }

  res.json({
    id,
    timestamp: meta?.timestamp,
    period: meta?.period || rawData?.period,
    summary: meta?.summary || {
      sessionsAnalyzed: rawData?.sessions?.length || 0,
      promptsAnalyzed: rawData?.prompts?.length || 0,
      commitsAnalyzed: rawData?.gitData?.totalCommits || 0,
    },
    coaching,
    previousChanges,
  });
});

export default router;
