export function compareGrowth(checkpoints) {
  if (checkpoints.length < 2) return null;

  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const dimensionTrends = {};
  const dimensionNames = [
    '문제 정의 능력',
    '전략 수립 능력',
    '도구 활용 능력',
    '디버깅 대처 능력',
    '학습과 성장',
  ];

  for (const name of dimensionNames) {
    dimensionTrends[name] = sorted.map((cp) => {
      const dim = cp.coaching?.dimensions?.find((d) => d.name === name);
      return {
        checkpointId: cp.id,
        date: cp.timestamp,
        score: dim?.score || 0,
      };
    });
  }

  // 최근 2개 비교
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const changes = dimensionNames.map((name) => {
    const latestDim = latest.coaching?.dimensions?.find((d) => d.name === name);
    const prevDim = previous.coaching?.dimensions?.find((d) => d.name === name);
    const latestScore = latestDim?.score || 0;
    const prevScore = prevDim?.score || 0;
    return {
      name,
      current: latestScore,
      previous: prevScore,
      change: +(latestScore - prevScore).toFixed(1),
    };
  });

  return {
    dimensionTrends,
    latestChanges: changes,
    totalCheckpoints: sorted.length,
    overallTrend:
      changes.reduce((sum, c) => sum + c.change, 0) > 0
        ? 'improving'
        : 'needs_attention',
  };
}
