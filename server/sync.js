// 로컬 ↔ 서버 동기화 스크립트
// npm run sync         (업로드 + 다운로드)
// npm run sync:upload  (점검 결과 업로드)
// npm run sync:download (채팅 기록 다운로드)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CHECKPOINTS_DIR = resolve(process.cwd(), 'checkpoints');
const CHAT_DIR = resolve(CHECKPOINTS_DIR, 'chat-history');
const SERVER_URL = 'https://thinkervis.vercel.app';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`${key}=(.+)`));
    if (match) return match[1].trim();
  }
  return null;
}

async function uploadCheckpoint() {
  const token = getEnv('SYNC_TOKEN');
  if (!token) { console.error('❌ SYNC_TOKEN이 .env에 없습니다.'); return; }

  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  if (!existsSync(indexPath)) {
    console.log('점검 기록이 없습니다. 먼저 로컬에서 점검을 실행하세요.');
    return;
  }

  const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  const lastCp = index.checkpoints[index.checkpoints.length - 1];
  if (!lastCp) { console.log('점검 기록이 없습니다.'); return; }

  const coachingPath = resolve(CHECKPOINTS_DIR, lastCp.id, 'coaching.json');
  if (!existsSync(coachingPath)) { console.log('코칭 결과 파일이 없습니다.'); return; }

  const coaching = JSON.parse(readFileSync(coachingPath, 'utf-8'));
  const rawDataPath = resolve(CHECKPOINTS_DIR, lastCp.id, 'raw-data.json');
  const rawData = existsSync(rawDataPath) ? JSON.parse(readFileSync(rawDataPath, 'utf-8')) : {};

  const payload = {
    checkpointId: lastCp.id,
    timestamp: lastCp.timestamp,
    period: lastCp.period,
    summary: lastCp.summary,
    coaching,
    recentPrompts: rawData.prompts?.slice(-15)?.map((p) => ({
      text: p.text?.slice(0, 100),
      timestamp: p.timestamp,
      quality: p.quality,
    })),
  };

  console.log(`📤 업로드 중: 점검 ${lastCp.id}`);

  const res = await fetch(`${SERVER_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sync-token': token },
    body: JSON.stringify({ type: 'checkpoint', payload }),
  });

  const result = await res.json();
  if (result.ok) {
    console.log(`✦ 업로드 완료!`);
    console.log(`  기간: ${lastCp.period?.from} ~ ${lastCp.period?.to}`);
    console.log(`  세션 ${lastCp.summary?.sessionsAnalyzed}개 | 프롬프트 ${lastCp.summary?.promptsAnalyzed}개`);
  } else {
    console.error('❌ 업로드 실패:', result.error);
  }
}

async function downloadChatHistory() {
  const token = getEnv('SYNC_TOKEN');
  if (!token) { console.error('❌ SYNC_TOKEN이 .env에 없습니다.'); return; }

  mkdirSync(CHAT_DIR, { recursive: true });
  console.log('📥 채팅 기록 다운로드 중...');

  const res = await fetch(`${SERVER_URL}/api/sync`, {
    headers: { 'x-sync-token': token },
  });

  const data = await res.json();
  if (!data.chatHistory || data.chatHistory.length === 0) {
    console.log('아직 모바일 채팅 기록이 없습니다.');
    return;
  }

  console.log(`${data.chatHistory.length}개 채팅 세션 발견`);

  for (const chat of data.chatHistory) {
    const filename = `${chat.sessionId || 'unknown'}.json`;
    const localPath = resolve(CHAT_DIR, filename);
    writeFileSync(localPath, JSON.stringify(chat, null, 2));
    console.log(`  ✦ ${filename} (${chat.messages?.length || 0}개 메시지, ${chat.savedAt?.slice(0, 10)})`);
  }

  // 코칭 데이터도 저장
  if (data.coaching) {
    const coachPath = resolve(CHAT_DIR, 'latest-coaching-from-server.json');
    writeFileSync(coachPath, JSON.stringify(data.coaching, null, 2));
    console.log(`  ✦ 서버 코칭 데이터 저장`);
  }

  console.log(`✦ 저장 완료: ${CHAT_DIR}`);
}

// 실행
const action = process.argv[2] || 'both';

(async () => {
  console.log('━━━ 팅커비스 동기화 ━━━\n');

  if (action === 'upload' || action === 'both') {
    await uploadCheckpoint();
    console.log();
  }

  if (action === 'download' || action === 'both') {
    await downloadChatHistory();
    console.log();
  }

  console.log('━━━ 완료 ━━━');
})();
