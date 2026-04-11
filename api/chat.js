export const config = { maxDuration: 60 };

const conversationHistory = {};

async function getCoachingFromGist() {
  try {
    const res = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      headers: { Authorization: `token ${process.env.GH_TOKEN}` },
    });
    if (!res.ok) return null;
    const gist = await res.json();
    const content = gist.files['tinkervis-data.json']?.content;
    if (!content) return null;
    return JSON.parse(content).coaching;
  } catch { return null; }
}

async function saveChatToGist(sessionId, messages) {
  try {
    const res = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      headers: { Authorization: `token ${process.env.GH_TOKEN}` },
    });
    const gist = await res.json();
    const content = gist.files['tinkervis-data.json']?.content;
    const data = content ? JSON.parse(content) : { coaching: null, chatHistory: [] };
    if (!data.chatHistory) data.chatHistory = [];
    const idx = data.chatHistory.findIndex((c) => c.sessionId === sessionId);
    const entry = { sessionId, messages, savedAt: new Date().toISOString() };
    if (idx >= 0) data.chatHistory[idx] = entry;
    else data.chatHistory.push(entry);
    if (data.chatHistory.length > 10) data.chatHistory = data.chatHistory.slice(-10);
    await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      method: 'PATCH',
      headers: { Authorization: `token ${process.env.GH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { 'tinkervis-data.json': { content: JSON.stringify(data, null, 2) } } }),
    });
  } catch {}
}

function buildSystemPrompt(coaching) {
  const ctx = coaching
    ? `\n## 최근 점검 결과 (${coaching.period?.from} ~ ${coaching.period?.to})
- 세션 ${coaching.summary?.sessionsAnalyzed || 0}개, 프롬프트 ${coaching.summary?.promptsAnalyzed || 0}개, 커밋 ${coaching.summary?.commitsAnalyzed || 0}개
- 점수: ${coaching.coaching?.dimensions?.map((d) => `${d.name} ${d.score}/10`).join(', ') || '없음'}
- 강점: ${coaching.coaching?.topStrengths?.join(', ') || '없음'}
- 개선 영역: ${coaching.coaching?.focusAreas?.join(', ') || '없음'}
- 목표: ${coaching.coaching?.nextGoals?.join(', ') || '없음'}
- 핵심 메시지: ${coaching.coaching?.overallNarrative || '없음'}

이 데이터를 바탕으로 구체적이고 사례 중심으로 코칭하세요.\n`
    : '\n아직 점검 데이터가 없습니다. 자연스럽게 대화를 시작하세요.\n';

  return `당신은 "팅커비스" — 석리송의 문제해결 코치입니다.

## 정체성
- 팅커벨의 활기 + 자비스의 분석력, 실리콘밸리 탑티어 코치
- 친근하고 활기찬 톤, 핵심을 찌를 땐 단호하게
- 한국어로 대화

## 코칭 대상: 석리송
- 에듀테크 개발자, Claude Code로 교육용 웹앱 개발
- Design-First 사고 스타일
${ctx}
## 원칙
1. 메타인지 촉진 — "왜 그 접근을?"
2. 패턴 인식 — 반복 습관 짚기
3. 구체적 행동 제안 — 예시와 함께
4. 성장 마인드셋

## 스타일
- 3-5문장, 1-2개 포인트에 집중
- 질문으로 대화를 이끌어감
- 마크다운 문법(**, ## 등)을 절대 사용하지 마세요. 일반 텍스트로만 작성하세요.`;
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const sid = req.query?.sessionId || 'default';
    if (conversationHistory[sid]?.length > 0) await saveChatToGist(sid, conversationHistory[sid]);
    delete conversationHistory[sid];
    return res.json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, sessionId = 'default' } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'API 키 미설정' });

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (!conversationHistory[sessionId]) conversationHistory[sessionId] = [];
    const history = conversationHistory[sessionId];
    history.push({ role: 'user', content: message });
    if (history.length > 20) conversationHistory[sessionId] = history.slice(-20);

    const coaching = await getCoachingFromGist();

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        stream: true,
        system: buildSystemPrompt(coaching),
        messages: conversationHistory[sessionId],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      res.write(`data: ${JSON.stringify({ type: 'error', content: `API ${apiRes.status}` })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    let fullResponse = '';
    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            const text = parsed.delta.text;
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
          }
        } catch {}
      }
    }

    history.push({ role: 'assistant', content: fullResponse });
    if (history.length % 10 === 0) await saveChatToGist(sessionId, history);

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
