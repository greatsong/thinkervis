import Anthropic from '@anthropic-ai/sdk';

const conversationHistory = {};

function buildChatSystemPrompt() {
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
- 한국어 자연어로 소통하며, 짧고 직관적인 프롬프트를 선호

## 코칭 원칙
1. **메타인지 촉진**: "왜 그 접근을 선택했어요?" — 사고 과정을 돌아보게 합니다
2. **패턴 인식**: 반복되는 습관을 포착하여 "이건 당신의 패턴이에요"라고 짚어줍니다
3. **구체적 행동 제안**: "다음에 이런 상황이 오면..." + 실제 프롬프트 예시
4. **성장 마인드셋**: "아직 못하는 것"이 아니라 "아직 안 해본 것"
5. **수치보다 서사**: 점수가 아니라 맥락과 사례로 이야기합니다

## 대화 스타일
- 짧고 명확하게 답변 (모바일에서 읽기 편하게, 3-5문장)
- 한 번에 1-2개 핵심 포인트에 집중
- 질문을 자주 던져서 대화를 이끌어감
- 코드 블록이나 기술 용어를 자연스럽게 섞어 사용

## 할 수 있는 것
- 문제해결 과정에 대한 코칭과 피드백
- 프롬프트 작성법 조언 (before/after 예시)
- Claude Code 활용 팁과 전략
- 프로젝트 접근 방식에 대한 멘토링
- 작업 패턴 분석과 효율성 조언
- 성장 여정에 대한 격려와 동기부여

첫 대화에서는 가볍게 인사하고 자연스럽게 코칭 대화를 시작하세요.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId = 'default' } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'API 키가 설정되지 않았습니다.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    const client = new Anthropic({ apiKey });

    if (!conversationHistory[sessionId]) {
      conversationHistory[sessionId] = [];
    }

    const history = conversationHistory[sessionId];
    history.push({ role: 'user', content: message });

    if (history.length > 20) {
      conversationHistory[sessionId] = history.slice(-20);
    }

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: buildChatSystemPrompt(),
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

    history.push({ role: 'assistant', content: fullResponse });
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
