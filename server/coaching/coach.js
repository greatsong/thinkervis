import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { buildCoachingPrompt } from './prompts.js';
import { generateLocalCoaching } from './local-analyzer.js';

function getApiKey() {
  // 1. 환경변수
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // 2. .env 파일
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }

  return null;
}

export async function runCoaching(data, previousCoaching = null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('API 키 없음 — 로컬 분석 모드로 전환');
    return generateLocalCoaching(data, previousCoaching);
  }

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildCoachingPrompt(data, previousCoaching);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('코칭 결과 파싱 실패:', err.message);
      return generateLocalCoaching(data, previousCoaching);
    }
  } catch (err) {
    console.error('Claude API 호출 실패:', err.message);
    console.log('로컬 분석 모드로 전환');
    return generateLocalCoaching(data, previousCoaching);
  }
}
