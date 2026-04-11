import { Router } from 'express';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { collectSessions } from '../collectors/session-collector.js';
import { collectPrompts, analyzePromptQuality } from '../collectors/prompt-collector.js';
import { collectGitData } from '../collectors/git-collector.js';
import { collectToolUsage } from '../collectors/tool-collector.js';
import { runCoaching } from '../coaching/coach.js';
import { generateMarkdownReport } from '../report/markdown-generator.js';
import { readJson } from '../utils/file-reader.js';

const router = Router();
const CHECKPOINTS_DIR = resolve(process.cwd(), 'checkpoints');

function getSyncToken() {
  if (process.env.SYNC_TOKEN) return process.env.SYNC_TOKEN;
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/SYNC_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    // 1. 마지막 점검 시점 확인
    const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
    const index = readJson(indexPath) || { checkpoints: [] };
    const lastCheckpoint = index.checkpoints[index.checkpoints.length - 1];
    const since = lastCheckpoint ? new Date(lastCheckpoint.timestamp) : null;

    // 2. 데이터 수집
    console.log('데이터 수집 중...');
    const sessions = collectSessions(since);
    const prompts = collectPrompts(since);
    const gitData = collectGitData(since);

    // 프롬프트 품질 분석
    const analyzedPrompts = prompts.map((p) => ({
      ...p,
      quality: analyzePromptQuality(p),
    }));

    // 도구 사용 수집 (세션 파일 경로 전달)
    const sessionPaths = sessions
      .filter((s) => s.fullPath)
      .map((s) => s.fullPath);
    const toolUsage = collectToolUsage(sessionPaths);

    const now = new Date();
    const checkpointId = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const period = {
      from: since ? since.toISOString().slice(0, 10) : '2026-02-01',
      to: now.toISOString().slice(0, 10),
    };

    const rawData = {
      sessions,
      prompts: analyzedPrompts,
      gitData,
      toolUsage,
      period,
    };

    const summary = {
      sessionsAnalyzed: sessions.length,
      promptsAnalyzed: prompts.length,
      commitsAnalyzed: gitData.totalCommits,
      projectsActive: new Set(sessions.map((s) => s.projectPath)).size,
    };

    // 3. AI 코칭 실행
    console.log('AI 코칭 분석 중...');
    const previousCoaching = lastCheckpoint
      ? readJson(resolve(CHECKPOINTS_DIR, lastCheckpoint.id, 'coaching.json'))
      : null;

    const coaching = await runCoaching(rawData, previousCoaching);

    // 4. 저장
    const checkpointDir = resolve(CHECKPOINTS_DIR, checkpointId);
    mkdirSync(checkpointDir, { recursive: true });

    writeFileSync(
      resolve(checkpointDir, 'raw-data.json'),
      JSON.stringify(rawData, null, 2)
    );
    writeFileSync(
      resolve(checkpointDir, 'coaching.json'),
      JSON.stringify(coaching, null, 2)
    );

    // 이전 변화 계산
    const previousChanges = previousCoaching?.dimensions?.map((prevDim) => {
      const currDim = coaching.dimensions?.find((d) => d.name === prevDim.name);
      return {
        name: prevDim.name,
        change: currDim ? +(currDim.score - prevDim.score).toFixed(1) : 0,
      };
    }) || null;

    // MD 리포트 생성
    const report = generateMarkdownReport({
      id: checkpointId,
      timestamp: now.toISOString(),
      period,
      summary,
      coaching,
      previousChanges,
    });
    writeFileSync(resolve(checkpointDir, 'report.md'), report);

    // 5. 인덱스 업데이트
    index.checkpoints.push({
      id: checkpointId,
      timestamp: now.toISOString(),
      period,
      summary,
      overallNarrative: coaching.overallNarrative,
      scores: coaching.dimensions?.reduce((acc, d) => {
        acc[d.name] = d.score;
        return acc;
      }, {}),
    });
    writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`점검 완료: ${checkpointId}`);

    // 6. 서버에 자동 업로드 (thinkervis.vercel.app)
    let syncResult = null;
    try {
      const syncToken = getSyncToken();
      if (syncToken) {
        const uploadData = {
          checkpointId,
          timestamp: now.toISOString(),
          period,
          summary,
          coaching,
          recentPrompts: analyzedPrompts.slice(-15).map((p) => ({
            text: p.text?.slice(0, 100),
            timestamp: p.timestamp,
            quality: p.quality,
          })),
        };

        const syncRes = await fetch('https://thinkervis.vercel.app/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-token': syncToken,
          },
          body: JSON.stringify({ type: 'checkpoint', payload: uploadData }),
        });
        const syncData = await syncRes.json();
        syncResult = syncData.ok ? 'uploaded' : 'failed';
        console.log(`서버 동기화: ${syncResult}`);
      } else {
        syncResult = 'no-token';
        console.log('SYNC_TOKEN 없음 — 서버 동기화 건너뜀');
      }
    } catch (syncErr) {
      syncResult = 'error';
      console.log('서버 동기화 실패:', syncErr.message);
    }

    res.json({
      checkpointId,
      period,
      summary,
      coaching,
      previousChanges,
      syncResult,
    });
  } catch (err) {
    console.error('점검 실행 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
