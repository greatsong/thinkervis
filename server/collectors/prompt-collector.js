import { resolve } from 'path';
import { readJsonl, claudeDir } from '../utils/file-reader.js';

export function collectPrompts(since = null) {
  const historyPath = resolve(claudeDir(), 'history.jsonl');
  const allEntries = readJsonl(historyPath);

  const prompts = allEntries
    .filter((entry) => {
      if (!entry.display || !entry.timestamp) return false;
      if (since) {
        const ts = new Date(entry.timestamp);
        if (ts <= since) return false;
      }
      return true;
    })
    .map((entry) => ({
      text: entry.display,
      timestamp: entry.timestamp,
      project: entry.project || '',
      sessionId: entry.sessionId || '',
      hasPastedContent:
        entry.pastedContents && Object.keys(entry.pastedContents).length > 0,
    }));

  prompts.sort((a, b) => a.timestamp - b.timestamp);
  return prompts;
}

export function analyzePromptQuality(prompt) {
  const text = prompt.text || '';
  let score = 0;
  const traits = [];

  // 기본 점수: 내용이 있으면 기본 20점
  if (text.length > 5) {
    score += 20;
  }

  // 길이 (한국어 기준: 15자 이상이면 적절)
  if (text.length > 15) {
    score += 10;
    traits.push('적절한 길이');
  }
  if (text.length > 80) {
    score += 10;
    traits.push('상세한 설명');
  }

  // 구조화 (번호 목록, 불릿)
  if (/\d+[\.\)]\s/.test(text) || /[-*]\s/.test(text)) {
    score += 15;
    traits.push('구조화됨');
  }

  // 코드 참조 (백틱, 파일 확장자)
  if (/`[^`]+`/.test(text) || /\.\w{2,4}\b/.test(text)) {
    score += 10;
    traits.push('코드 참조');
  }

  // 붙여넣기 컨텍스트
  if (prompt.hasPastedContent) {
    score += 15;
    traits.push('컨텍스트 첨부');
  }

  // 파일 경로
  if (/\/[\w\-\.]+\/[\w\-\.]+/.test(text) || /src\/|components\/|server\//.test(text)) {
    score += 10;
    traits.push('파일 경로 명시');
  }

  // 에러 메시지 포함
  if (/error|오류|에러|Error|failed|실패/i.test(text)) {
    score += 10;
    traits.push('에러 정보 포함');
  }

  // 명확한 목표/동사
  if (/해줘|만들어|수정|추가|삭제|변경|구현|고쳐|보여|설명|확인|실행|fix|create|add|update|implement|show|run|check/i.test(text)) {
    score += 10;
    traits.push('명확한 요청');
  }

  // 맥락적 키워드 (기술 용어 사용)
  if (/컴포넌트|페이지|API|서버|데이터|함수|변수|스타일|배포|빌드|테스트|DB|라우트/i.test(text)) {
    score += 10;
    traits.push('기술 용어 사용');
  }

  const classification = classifyPrompt(text, prompt.hasPastedContent);

  return {
    score: Math.min(score, 100),
    traits,
    classification,
  };
}

function classifyPrompt(text, hasPasted) {
  if (text.length < 10 && !hasPasted) return 'vague';
  if (/\d+[\.\)]\s/.test(text) || /[-*]\s/.test(text)) return 'structured';
  if (/`[^`]+`/.test(text) || /\/[\w\-\.]+\//.test(text) || hasPasted) return 'specific';
  if (text.length > 30) return 'freeform';
  return 'concise';
}
