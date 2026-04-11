export function generateLocalCoaching(data, previousCoaching = null) {
  const { sessions, prompts, gitData, toolUsage, period } = data;

  // 프롬프트 품질 분석
  const qualityScores = prompts.map((p) => p.quality?.score || 0);
  const avgQuality = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 0;

  const classifications = {};
  for (const p of prompts) {
    const cls = p.quality?.classification || 'unknown';
    classifications[cls] = (classifications[cls] || 0) + 1;
  }

  // 세션 분석
  const sessionLengths = sessions.map((s) => s.messageCount || 0);
  const avgMessages = sessionLengths.length > 0
    ? Math.round(sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length)
    : 0;

  const longSessions = sessions.filter((s) => s.messageCount > 50);
  const shortSessions = sessions.filter((s) => s.messageCount <= 15);

  // 프롬프트 유형 비율
  const specificPct = ((classifications.specific || 0) + (classifications.structured || 0))
    / Math.max(prompts.length, 1) * 100;
  const vaguePct = (classifications.vague || 0) / Math.max(prompts.length, 1) * 100;

  // 도구 다양성
  const toolDiversity = toolUsage?.topTools?.length || 0;

  // 점수 계산
  const problemDefScore = Math.min(10, Math.round(
    (avgQuality / 10) * 0.5 + (specificPct / 10) * 0.3 + (longSessions.length < 3 ? 2 : 0)
  ));

  const strategyScore = Math.min(10, Math.round(
    (shortSessions.length / Math.max(sessions.length, 1)) * 10 * 0.4 +
    (specificPct / 10) * 0.3 +
    3
  ));

  const toolScore = Math.min(10, Math.round(
    Math.min(toolDiversity, 10) * 0.5 +
    (gitData?.totalCommits > 50 ? 3 : gitData?.totalCommits > 20 ? 2 : 1) +
    2
  ));

  const debugScore = Math.min(10, Math.round(
    (longSessions.length === 0 ? 3 : longSessions.length < 3 ? 2 : 1) +
    (avgMessages < 30 ? 3 : avgMessages < 50 ? 2 : 1) +
    3
  ));

  const growthScore = Math.min(10, Math.round(
    (sessions.length > 3 ? 3 : sessions.length > 1 ? 2 : 1) +
    (gitData?.repos?.length > 3 ? 3 : 2) +
    (toolDiversity > 5 ? 2 : 1) +
    1
  ));

  // 사례 추출
  const bestPrompts = prompts
    .filter((p) => p.quality?.score >= 70)
    .slice(0, 3)
    .map((p) => ({
      sessionRef: new Date(p.timestamp).toISOString().slice(0, 10),
      what: p.text.slice(0, 100),
      good: `품질 점수 ${p.quality.score}/100, 특징: ${p.quality.traits?.join(', ') || '없음'}`,
      better: null,
    }));

  const weakPrompts = prompts
    .filter((p) => p.quality?.score <= 30)
    .slice(0, 3)
    .map((p) => ({
      sessionRef: new Date(p.timestamp).toISOString().slice(0, 10),
      what: p.text.slice(0, 100),
      good: null,
      better: `이 프롬프트는 ${p.quality.traits?.length === 0 ? '구체적 맥락이 없어서' : '정보가 부족해서'} AI가 의도를 파악하기 어려웠을 수 있습니다.`,
    }));

  const stuckCases = longSessions.slice(0, 2).map((s) => ({
    sessionRef: s.created?.slice(0, 10) || '?',
    what: `${s.messageCount}개 메시지의 긴 세션: "${(s.firstPrompt || '').slice(0, 80)}"`,
    good: null,
    better: '문제가 복잡할 때는 Plan 모드를 사용하거나, 문제를 작은 단위로 나누어 접근하면 더 효율적입니다.',
  }));

  // 이전 비교
  let growthFromLast = null;
  if (previousCoaching?.dimensions) {
    const prevAvg = previousCoaching.dimensions.reduce((s, d) => s + (d.score || 0), 0) / previousCoaching.dimensions.length;
    const currAvg = (problemDefScore + strategyScore + toolScore + debugScore + growthScore) / 5;
    if (currAvg > prevAvg) {
      growthFromLast = `이전 점검 평균 ${prevAvg.toFixed(1)}점에서 현재 ${currAvg.toFixed(1)}점으로 향상되었습니다. 꾸준한 사용이 실력 향상으로 이어지고 있습니다.`;
    } else {
      growthFromLast = `이전 점검과 비슷한 수준입니다. 새로운 도전이나 접근 방식을 시도해보면 성장에 도움이 됩니다.`;
    }
  }

  // 프롬프트 예시
  const worstPrompt = prompts.find((p) => p.quality?.score <= 20);
  const promptExamples = worstPrompt ? {
    before: worstPrompt.text.slice(0, 150),
    after: `다음과 같이 개선해보세요:\n1. 현재 상황 설명 (어떤 파일에서 무슨 작업 중인지)\n2. 기대하는 결과\n3. 관련 에러나 코드 붙여넣기\n\n예: "${worstPrompt.text.slice(0, 30)}... → [파일 경로]에서 [구체적 문제]. 에러 메시지: [에러]. [원하는 결과]로 수정해주세요."`,
    explanation: '구체적 맥락(파일, 에러, 기대 결과)을 포함하면 AI가 정확한 답을 1회에 줄 수 있어, 시행착오를 크게 줄일 수 있습니다.',
  } : null;

  return {
    overallNarrative: `이번 분석 기간 동안 ${sessions.length}개 세션에서 ${prompts.length}개의 프롬프트를 사용했습니다. 전체 프롬프트의 평균 품질 점수는 ${avgQuality}/100이며, 구체적/구조화된 프롬프트 비율은 ${Math.round(specificPct)}%입니다. ${gitData?.totalCommits > 0 ? `${gitData.repos?.length || 0}개 프로젝트에서 ${gitData.totalCommits}개의 커밋을 생성했으며, AI 협업 비율은 ${gitData.totalAiAssisted > 0 ? Math.round(gitData.totalAiAssisted / gitData.totalCommits * 100) : 0}%입니다.` : ''} ${avgMessages < 20 ? '세션당 메시지 수가 적어 효율적으로 문제를 해결하고 있습니다.' : '일부 세션에서 메시지가 많았습니다. 초기 프롬프트의 정확성을 높이면 효율이 올라갑니다.'}`,
    dimensions: [
      {
        name: '문제 정의 능력',
        score: problemDefScore,
        narrative: `프롬프트 평균 품질 ${avgQuality}/100. 구체적 프롬프트 ${Math.round(specificPct)}%, 모호한 프롬프트 ${Math.round(vaguePct)}%. ${vaguePct > 30 ? '모호한 프롬프트 비율이 높습니다. 문제를 명확히 정의하는 습관을 기르면 효율이 크게 향상됩니다.' : '대체로 문제를 명확히 정의하고 있습니다.'}`,
        cases: [...bestPrompts.slice(0, 1), ...weakPrompts.slice(0, 1)],
        actionItems: [
          '프롬프트 작성 시 "무엇을, 어디서, 왜" 3가지를 포함하세요',
          '에러가 있다면 에러 메시지를 반드시 붙여넣으세요',
          vaguePct > 20 ? '한 줄짜리 프롬프트보다는 2-3줄로 맥락을 설명하세요' : '현재 수준을 유지하면서, 더 복잡한 문제에도 적용해보세요',
        ],
      },
      {
        name: '전략 수립 능력',
        score: strategyScore,
        narrative: `${sessions.length}개 세션 중 ${shortSessions.length}개가 15메시지 이내로 해결되었습니다 (${Math.round(shortSessions.length / Math.max(sessions.length, 1) * 100)}%). ${longSessions.length > 0 ? `${longSessions.length}개 세션은 50메시지 이상으로, 전략적 접근이 필요했을 수 있습니다.` : '모든 세션이 효율적으로 진행되었습니다.'}`,
        cases: stuckCases.length > 0 ? stuckCases : bestPrompts.slice(0, 1),
        actionItems: [
          '큰 작업은 시작 전 Plan 모드로 단계를 나누세요',
          '3번 이상 같은 방향으로 시도해도 안 되면, 문제를 재정의하세요',
          '복잡한 기능은 MVP → 확장 순서로 접근하세요',
        ],
      },
      {
        name: '도구 활용 능력',
        score: toolScore,
        narrative: `${toolDiversity}종의 도구를 활용 중입니다. ${toolUsage?.topTools?.slice(0, 3).map((t) => t.name).join(', ') || '도구 데이터 없음'}이 가장 많이 사용되었습니다. ${toolDiversity >= 8 ? '다양한 도구를 적극 활용하고 있어 좋습니다.' : '더 다양한 도구(Agent, TodoWrite, EnterPlanMode 등)를 시도해보면 효율이 올라갑니다.'}`,
        cases: [],
        actionItems: [
          toolDiversity < 5 ? 'Agent 도구로 병렬 탐색을 활용해보세요' : 'Agent 활용을 계속 확장해보세요',
          '파일 경로를 직접 지정하면 탐색 시간이 줄어듭니다',
          'TodoWrite로 복잡한 작업을 체크리스트로 관리해보세요',
        ],
      },
      {
        name: '디버깅 대처 능력',
        score: debugScore,
        narrative: `평균 세션 길이 ${avgMessages}메시지. ${longSessions.length > 0 ? `${longSessions.length}개 세션이 길어졌는데, 이는 디버깅 과정에서 방향 전환이 필요했을 수 있습니다.` : '대부분 효율적으로 문제를 해결하고 있습니다.'}`,
        cases: stuckCases,
        actionItems: [
          '에러 발생 시 에러 메시지 전체를 붙여넣으세요',
          '같은 접근이 2번 실패하면 다른 방법을 시도하세요',
          '브라우저 콘솔/네트워크 탭 정보도 함께 공유하면 디버깅이 빨라집니다',
        ],
      },
      {
        name: '학습과 성장',
        score: growthScore,
        narrative: `${gitData?.repos?.length || 0}개 프로젝트에서 활발히 작업 중입니다. ${gitData?.totalCommits > 100 ? '상당한 양의 코드를 생산하고 있으며, ' : ''}${toolDiversity > 5 ? '다양한 도구를 시도하는 점이 성장의 증거입니다.' : '새로운 도구와 기법을 더 시도해보면 좋겠습니다.'}`,
        cases: [],
        actionItems: [
          '새로운 프로젝트마다 이전 프로젝트에서 배운 점을 적용하세요',
          '더 복잡한 프로젝트에 도전해보세요 (DB, 인증, 실시간 기능 등)',
          '코드 리뷰나 리팩토링 세션을 주기적으로 가져보세요',
        ],
      },
    ],
    growthFromLast,
    topStrengths: [
      specificPct > 50 ? '구체적 프롬프트 작성 능력' : '다양한 프로젝트 경험',
      avgMessages < 25 ? '효율적 문제 해결' : '끈기 있는 디버깅',
      gitData?.totalCommits > 50 ? '높은 생산성' : '꾸준한 개발 활동',
    ],
    focusAreas: [
      vaguePct > 20 ? '모호한 프롬프트 줄이기' : '더 복잡한 문제 도전하기',
      longSessions.length > 2 ? '전략적 문제 분해 연습' : '새로운 도구/기법 시도',
    ],
    nextGoals: [
      '프롬프트에 항상 파일 경로와 에러 메시지 포함하기',
      '큰 작업 전 Plan 모드 사용 습관 들이기',
      '새로운 Claude Code 기능 1가지 이상 시도하기',
    ],
    promptExamples,
    _mode: 'local-analysis',
  };
}
