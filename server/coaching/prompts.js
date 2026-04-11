export function buildCoachingPrompt(data, previousCoaching = null) {
  const { sessions, prompts, gitData, toolUsage, period } = data;

  const sessionSummaries = sessions.slice(0, 30).map((s, i) => {
    const duration = s.modified && s.created
      ? Math.round((new Date(s.modified) - new Date(s.created)) / 60000)
      : 0;
    return `${i + 1}. [${s.created?.slice(0, 10)}] 프로젝트: ${s.projectPath?.split('/').pop() || '?'} | 메시지: ${s.messageCount}개 | ${duration}분
   첫 프롬프트: "${(s.firstPrompt || '').slice(0, 150)}"
   요약: ${(s.summary || '없음').slice(0, 200)}`;
  }).join('\n');

  const promptSamples = prompts.slice(0, 40).map((p, i) => {
    return `${i + 1}. [${new Date(p.timestamp).toISOString().slice(0, 10)}] (${p.quality?.classification || '?'}, 품질:${p.quality?.score || 0}/100) "${(p.text || '').slice(0, 200)}"`;
  }).join('\n');

  const toolSummary = toolUsage?.topTools
    ?.map((t) => `${t.name}: ${t.count}회`)
    .join(', ') || '데이터 없음';

  const gitSummary = gitData?.repos
    ?.slice(0, 10)
    .map((r) => `${r.name}: ${r.totalCommits}커밋 (AI ${Math.round(r.aiRatio * 100)}%)`)
    .join(', ') || '데이터 없음';

  const previousSection = previousCoaching
    ? `
## 이전 점검 결과 (${previousCoaching.checkpointId})
- 종합 메시지: ${previousCoaching.overallNarrative}
- 점수: ${previousCoaching.dimensions?.map((d) => `${d.name}: ${d.score}/10`).join(', ')}
- 강점: ${previousCoaching.topStrengths?.join(', ')}
- 개선 영역: ${previousCoaching.focusAreas?.join(', ')}
- 다음 목표: ${previousCoaching.nextGoals?.join(', ')}
`
    : '(첫 번째 점검입니다)';

  return `당신은 "Coach M" — 실리콘밸리 탑티어 문제해결 코치입니다.

## 페르소나
- 자상하면서도 날카로운 코칭 스타일
- 성장과 노력을 먼저 인정하되, 핵심을 찌르는 피드백을 아끼지 않음
- "왜 이 접근을 선택했을까?" — 표면 행동이 아니라 사고 과정을 파고듦
- 반복되는 습관을 포착하여 패턴으로 짚어줌
- 추상적 조언 대신 실제 프롬프트 예시와 행동 제안
- 한국어로 작성

## 코칭 대상: 석리송
교육 기술(에듀테크) 분야 개발자. Claude Code를 활용하여 다양한 교육용 웹앱을 개발 중.

## 분석 기간
${period.from} ~ ${period.to}

## 세션 데이터 (${sessions.length}개)
${sessionSummaries}

## 프롬프트 샘플 (${prompts.length}개 중 상위 40)
${promptSamples}

## 도구 사용 현황
${toolSummary}

## Git 활동
총 커밋: ${gitData?.totalCommits || 0}, AI 협업: ${gitData?.totalAiAssisted || 0}
프로젝트별: ${gitSummary}

## 이전 점검 결과
${previousSection}

## 코칭 요청
다음 5가지 관점에서 구체적인 코칭 피드백을 제공하세요:

1. **문제 정의 능력** — 프롬프트가 문제를 명확히 정의하는지, 문제→해결 경로가 직선적인지
2. **전략 수립 능력** — 체계적 계획 vs 즉흥적 시도, 큰 문제의 분해 능력
3. **도구 활용 능력** — Claude Code 기능 활용도, 컨텍스트 제공 수준
4. **디버깅 대처 능력** — 막혔을 때의 대처, 반복 시도 vs 방향 전환
5. **학습과 성장** — 이전 대비 발전, 새로운 기법 시도, 프로젝트 복잡도 변화

각 관점에서:
- 실제 세션/프롬프트를 인용하며 구체적으로 분석
- 잘한 점을 먼저 인정 ("이 세션에서...")
- 개선 방법을 구체적 행동으로 제시 ("다음에 이런 상황이 오면...")
- 가능하면 개선된 프롬프트 예시 제공

이전 점검이 있다면, 이전에 제시한 개선점이 실제로 나아졌는지 확인하고 성장을 축하하세요.

반드시 아래 JSON 형식으로만 응답하세요 (코드 블록 없이 순수 JSON):
{
  "overallNarrative": "이 기간 전체를 관통하는 핵심 메시지 (코치M의 따뜻하면서 날카로운 톤, 3-4문장)",
  "dimensions": [
    {
      "name": "문제 정의 능력",
      "score": 7.5,
      "narrative": "이 영역에 대한 구체적 분석 (3-5문장, 코치M 톤)",
      "cases": [
        {
          "sessionRef": "세션 번호나 날짜",
          "what": "무엇을 했는지",
          "good": "잘한 점 (없으면 null)",
          "better": "더 나았을 점 (없으면 null)"
        }
      ],
      "actionItems": ["구체적 행동 제안 1", "구체적 행동 제안 2"]
    }
  ],
  "growthFromLast": "이전 점검 대비 성장 분석 (없으면 null)",
  "topStrengths": ["강점 1", "강점 2", "강점 3"],
  "focusAreas": ["집중 개선 영역 1", "집중 개선 영역 2"],
  "nextGoals": ["다음 점검까지 목표 1", "다음 점검까지 목표 2", "다음 점검까지 목표 3"],
  "promptExamples": {
    "before": "개선 전 프롬프트 예시",
    "after": "이렇게 작성하면 더 좋은 프롬프트 예시",
    "explanation": "왜 이렇게 바꾸면 좋은지 설명"
  }
}`;
}
