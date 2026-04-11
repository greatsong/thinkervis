import { buildCoachingPrompt } from './prompts.js';
import { generateLocalCoaching } from './local-analyzer.js';

export async function runCoaching(data, previousCoaching = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('API 키 없음 — 로컬 분석 모드');
    return generateLocalCoaching(data, previousCoaching);
  }

  try {
    const prompt = buildCoachingPrompt(data, previousCoaching);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('Claude API 에러:', res.status);
      return generateLocalCoaching(data, previousCoaching);
    }

    const result = await res.json();
    const text = result.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('') || '';

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      console.error('코칭 결과 파싱 실패');
      return generateLocalCoaching(data, previousCoaching);
    }
  } catch (err) {
    console.error('코칭 API 실패:', err.message);
    return generateLocalCoaching(data, previousCoaching);
  }
}
