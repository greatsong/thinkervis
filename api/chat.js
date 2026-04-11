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
    const data = JSON.parse(content);
    return data.coaching;
  } catch {
    return null;
  }
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

    // 같은 세션이면 덮어쓰기, 아니면 추가
    const idx = data.chatHistory.findIndex((c) => c.sessionId === sessionId);
    const chatEntry = { sessionId, messages, savedAt: new Date().toISOString() };
    if (idx >= 0) data.chatHistory[idx] = chatEntry;
    else data.chatHistory.push(chatEntry);

    if (data.chatHistory.length > 10) data.chatHistory = data.chatHistory.slice(-10);

    await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${process.env.GH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: { 'tinkervis-data.json': { content: JSON.stringify(data, null, 2) } },
      }),
    });
  } catch {}
}

function buildSystemPrompt(coaching) {
  const ctx = coaching
    ? `
## 최근 점검 결과 (${coaching.period?.from} ~ ${coaching.period?.to})
- 세션 ${coaching.summary?.sessionsAnalyzed || 0}개, 프롬프트 ${coaching.summary?.promptsAnalyzed || 0}개 분석
- 점수: ${coaching.coaching?.dimensions?.map((d) => `${d.name} ${d.score}/10`).join(', ') || '없음'}
- 강점: ${coaching.coaching?.topStrengths?.join(', ') || '없음'}
- 개선 영역: ${coaching.coaching?.focusAreas?.join(', ') || '없음'}
- 목표: ${coaching.coaching?.nextGoals?.join(', ') || '없음'}
- 핵심 메시지: ${coaching.coaching?.overallNarrative || '없음'}

이 데이터를 바탕으로 구체적이고 사례 중심으로 코칭하세요. 이전 점검의 개선점이 나아졌는지 물어보세요.
`
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
- 질문으로 대화를 이끌어감`;
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const sid = req.query?.sessionId || 'default';
    if (conversationHistory[sid]?.length > 0) {
      await saveChatToGist(sid, conversationHistory[sid]);
    }
    delete conversationHistory[sid];
    return res.json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, sessionId = 'default' } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'API 키 미설정' });

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
        system: buildSystemPrompt(coaching),
        messages: conversationHistory[sessionId],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      return res.status(500).json({ error: `API ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const text = data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
    history.push({ role: 'assistant', content: text });

    // 5턴마다 자동 저장
    if (history.length % 10 === 0) await saveChatToGist(sessionId, history);

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
