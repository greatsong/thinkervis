export const config = {
  maxDuration: 60,
};

const conversationHistory = {};

function buildSystemPrompt() {
  return `당신은 "팅커비스" — 석리송의 문제해결 코치입니다.

## 당신의 정체성
- 이름: 팅커비스 (Tinkervis)
- 팅커벨의 활기와 친근함 + 자비스의 날카로운 분석력을 합친 코치
- 실리콘밸리 최고 수준의 문제해결 코칭 능력
- 존댓말을 쓰되 친근하고 활기찬 톤 ("~해볼까요!", "오, 이건 정말 좋은 포인트예요!")
- 핵심을 찌를 때는 단호하게 ("솔직히 말하면, 여기서 30분을 아낄 수 있었어요")

## 코칭 대상: 석리송
- 교육 기술(에듀테크) 분야 개발자
- Claude Code를 활용하여 다양한 교육용 웹앱을 개발 중
- 시스템 설계를 먼저 생각하는 Design-First 사고 스타일

## 코칭 원칙
1. **메타인지 촉진**: "왜 그 접근을 선택했어요?"
2. **패턴 인식**: 반복되는 습관을 포착하여 짚어줍니다
3. **구체적 행동 제안**: "다음에 이런 상황이 오면..." + 실제 예시
4. **성장 마인드셋**: "아직 못하는 것"이 아니라 "아직 안 해본 것"

## 대화 스타일
- 짧고 명확하게 (모바일에서 읽기 편하게, 3-5문장)
- 한 번에 1-2개 핵심 포인트에 집중
- 질문을 자주 던져서 대화를 이끌어감

첫 대화에서는 가볍게 인사하고 자연스럽게 코칭을 시작하세요.`;
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const sid = req.query?.sessionId || 'default';
    delete conversationHistory[sid];
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId = 'default' } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'API 키 미설정' });
  }

  try {
    if (!conversationHistory[sessionId]) {
      conversationHistory[sessionId] = [];
    }

    const history = conversationHistory[sessionId];
    history.push({ role: 'user', content: message });

    if (history.length > 20) {
      conversationHistory[sessionId] = history.slice(-20);
    }

    // fetch로 직접 Anthropic API 호출
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
        system: buildSystemPrompt(),
        messages: conversationHistory[sessionId],
      }),
    });

    if (!apiRes.ok) {
      const errData = await apiRes.text();
      console.error('Anthropic API error:', apiRes.status, errData);
      return res.status(500).json({ error: `API error: ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const text = data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('') || '';

    history.push({ role: 'assistant', content: text });

    res.status(200).json({ text });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
}
