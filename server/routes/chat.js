import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { readJson } from '../utils/file-reader.js';
import { collectPrompts } from '../collectors/prompt-collector.js';
import { buildChatSystemPrompt } from '../coaching/chat-prompt.js';

const router = Router();
const CHECKPOINTS_DIR = resolve(process.cwd(), 'checkpoints');
const CHAT_HISTORY_PATH = resolve(process.cwd(), 'data', 'chat-history.json');

// 대화 히스토리 (파일에 영속 저장)
let conversationHistory = {};

// 파일에서 대화 기록 로드
function loadHistory() {
  try {
    if (existsSync(CHAT_HISTORY_PATH)) {
      const data = JSON.parse(readFileSync(CHAT_HISTORY_PATH, 'utf-8'));
      conversationHistory = data.sessions || {};
    }
  } catch { conversationHistory = {}; }
}

// 파일에 대화 기록 저장
function saveHistory() {
  try {
    const dir = resolve(process.cwd(), 'data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CHAT_HISTORY_PATH, JSON.stringify({
      sessions: conversationHistory,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    console.error('채팅 기록 저장 실패:', err.message);
  }
}

// 서버 시작 시 기록 로드
loadHistory();

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

function getUserData() {
  const indexPath = resolve(CHECKPOINTS_DIR, 'index.json');
  const index = readJson(indexPath) || { checkpoints: [] };
  const lastCp = index.checkpoints[index.checkpoints.length - 1];

  const recentPrompts = collectPrompts(null).slice(-10);

  return {
    lastCheckpoint: lastCp,
    pendingSessions: 0,
    pendingPrompts: recentPrompts.length,
    recentPrompts,
  };
}

// 세션 목록 및 메시지 조회
router.get('/', (req, res) => {
  const sessionId = req.query.sessionId;

  // 특정 세션의 메시지 조회
  if (sessionId) {
    const messages = conversationHistory[sessionId] || [];
    return res.json({ messages });
  }

  // 전체 세션 목록 조회
  const sessions = Object.entries(conversationHistory).map(([id, messages]) => {
    const firstUser = messages.find(m => m.role === 'user');
    const lastMsg = messages[messages.length - 1];
    return {
      id,
      title: firstUser?.content?.slice(0, 30) || '대화',
      messageCount: messages.length,
      updatedAt: lastMsg?.timestamp || new Date().toISOString(),
    };
  });

  // 최신순 정렬
  sessions.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  res.json({ sessions });
});

// SSE 스트리밍 채팅
router.post('/', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  const apiKey = getApiKey();

  if (!apiKey) {
    return res.status(400).json({ error: 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });
  }

  // SSE 헤더 설정
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const client = new Anthropic({ apiKey });

    // 대화 히스토리 초기화
    if (!conversationHistory[sessionId]) {
      conversationHistory[sessionId] = [];
    }

    const history = conversationHistory[sessionId];
    history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    // 최근 20개 메시지만 유지
    if (history.length > 20) {
      conversationHistory[sessionId] = history.slice(-20);
    }

    const userData = getUserData();
    const systemPrompt = buildChatSystemPrompt(userData);

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: systemPrompt,
      messages: conversationHistory[sessionId],
    });

    let fullResponse = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const text = event.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      }
    }

    // 어시스턴트 응답을 히스토리에 추가
    history.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });

    // 파일에 저장
    saveHistory();

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error('채팅 오류:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// 대화 초기화
router.delete('/:sessionId', (req, res) => {
  delete conversationHistory[req.params.sessionId];
  saveHistory();
  res.json({ ok: true });
});

export default router;
