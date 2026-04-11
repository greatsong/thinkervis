export const config = { maxDuration: 60 };

// === Gist 헬퍼 ===
async function readGist() {
  const res = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
    headers: { Authorization: `token ${process.env.GH_TOKEN}` },
  });
  if (!res.ok) return { coaching: null, sessions: [], journals: [] };
  const gist = await res.json();
  const content = gist.files['tinkervis-data.json']?.content;
  return content ? JSON.parse(content) : { coaching: null, sessions: [], journals: [] };
}

async function writeGist(data) {
  await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${process.env.GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { 'tinkervis-data.json': { content: JSON.stringify(data, null, 2) } } }),
  });
}

// === 시스템 프롬프트 ===
function buildSystemPrompt(coaching, journals) {
  const coachingCtx = coaching
    ? `\n## 최근 점검 결과 (${coaching.period?.from} ~ ${coaching.period?.to})
- 세션 ${coaching.summary?.sessionsAnalyzed || 0}개, 프롬프트 ${coaching.summary?.promptsAnalyzed || 0}개, 커밋 ${coaching.summary?.commitsAnalyzed || 0}개
- 점수: ${coaching.coaching?.dimensions?.map((d) => `${d.name} ${d.score}/10`).join(', ') || '없음'}
- 강점: ${coaching.coaching?.topStrengths?.join(', ') || '없음'}
- 개선 영역: ${coaching.coaching?.focusAreas?.join(', ') || '없음'}
- 목표: ${coaching.coaching?.nextGoals?.join(', ') || '없음'}\n`
    : '';

  const journalCtx = journals?.length > 0
    ? `\n## 이전 코칭 일지\n${journals.slice(-3).map((j) =>
        `[${j.date}] ${j.summary}`
      ).join('\n')}\n\n이전 코칭에서 다뤘던 내용을 참고하되, 자연스럽게 이어가세요. 같은 말을 반복하지 마세요.\n`
    : '';

  return `당신은 "팅커비스" — 석리송의 문제해결 코치입니다.

## 정체성
- 팅커벨의 활기 + 자비스의 분석력, 실리콘밸리 탑티어 코치
- 친근하고 활기찬 톤, 핵심을 찌를 땐 단호하게
- 한국어로 대화
${coachingCtx}${journalCtx}
## 원칙
1. 메타인지 촉진 — "왜 그 접근을?"
2. 패턴 인식 — 반복 습관 짚기
3. 구체적 행동 제안 — 예시와 함께
4. 성장 마인드셋

## 스타일
- 3-5문장, 1-2개 포인트에 집중
- 질문으로 대화를 이끌어감
- 마크다운 문법(**, ##, - 등)을 사용하지 마세요. 일반 텍스트로만 작성하세요.
- 줄바꿈으로 가독성을 확보하세요.`;
}

// === 코칭 일지 생성 ===
async function generateJournal(messages, apiKey) {
  try {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '석리송' : '팅커비스'}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `아래 코칭 대화를 1-2문장으로 요약해주세요. 핵심 주제, 다뤄진 조언, 석리송의 반응을 포함하세요. 마크다운 없이 일반 텍스트로만.\n\n${conversation}`,
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch { return null; }
}

// === 핸들러 ===
export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // GET: 세션 목록 조회
  if (req.method === 'GET') {
    const data = await readGist();
    const sessions = (data.sessions || []).map((s) => ({
      id: s.id,
      title: s.title || '대화',
      lastMessage: s.messages?.[s.messages.length - 1]?.content?.slice(0, 50) || '',
      messageCount: s.messages?.length || 0,
      updatedAt: s.updatedAt,
    }));
    return res.json({
      sessions: sessions.reverse(),
      hasCoaching: !!data.coaching,
      coachingInfo: data.coaching ? {
        period: data.coaching.period,
        summary: data.coaching.summary,
        uploadedAt: data.coaching.timestamp,
      } : null,
      journalCount: data.journals?.length || 0,
    });
  }

  // DELETE: 세션 종료 → 코칭 일지 작성
  if (req.method === 'DELETE') {
    const sid = req.query?.sessionId;
    if (!sid) return res.json({ ok: true });

    const data = await readGist();
    const session = data.sessions?.find((s) => s.id === sid);

    if (session && session.messages?.length >= 2 && apiKey) {
      // 코칭 일지 생성
      const summary = await generateJournal(session.messages, apiKey);
      if (summary) {
        if (!data.journals) data.journals = [];
        data.journals.push({
          date: new Date().toISOString().slice(0, 10),
          sessionId: sid,
          summary,
        });
        if (data.journals.length > 20) data.journals = data.journals.slice(-20);
      }
      session.closed = true;
      session.closedAt = new Date().toISOString();
      await writeGist(data);
    }

    return res.json({ ok: true });
  }

  // POST: 채팅
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiKey) return res.status(400).json({ error: 'API 키 미설정' });

  const { message, sessionId } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: 'sessionId, message 필요' });

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const data = await readGist();
    if (!data.sessions) data.sessions = [];

    // 세션 찾기 또는 생성
    let session = data.sessions.find((s) => s.id === sessionId);
    if (!session) {
      session = { id: sessionId, title: message.slice(0, 30), messages: [], createdAt: new Date().toISOString() };
      data.sessions.push(session);
      if (data.sessions.length > 20) data.sessions = data.sessions.slice(-20);
    }

    session.messages.push({ role: 'user', content: message });
    if (session.messages.length > 30) session.messages = session.messages.slice(-30);
    session.updatedAt = new Date().toISOString();

    const systemPrompt = buildSystemPrompt(data.coaching, data.journals);

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        stream: true,
        system: systemPrompt,
        messages: session.messages,
      }),
    });

    if (!apiRes.ok) {
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
        const d = line.slice(6).trim();
        if (d === '[DONE]') continue;
        try {
          const parsed = JSON.parse(d);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullResponse += parsed.delta.text;
            res.write(`data: ${JSON.stringify({ type: 'text', content: parsed.delta.text })}\n\n`);
          }
        } catch {}
      }
    }

    session.messages.push({ role: 'assistant', content: fullResponse });
    session.updatedAt = new Date().toISOString();

    // 매 턴마다 Gist에 저장 (세션 영속성)
    await writeGist(data);

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
