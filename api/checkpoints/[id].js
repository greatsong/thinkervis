export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const gistRes = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      headers: { Authorization: `token ${process.env.GH_TOKEN}` },
    });
    if (!gistRes.ok) throw new Error(`Gist read failed: ${gistRes.status}`);
    const gist = await gistRes.json();
    const content = gist.files['tinkervis-data.json']?.content;
    const data = content ? JSON.parse(content) : {};

    // coaching 데이터에서 해당 checkpoint 찾기
    const coaching = data.coaching;
    if (!coaching || coaching.checkpointId !== id) {
      // checkpointHistory에서 메타 정보로 응답
      const history = data.checkpointHistory || [];
      const meta = history.find((c) => c.id === id);
      if (!meta) {
        return res.status(404).json({ error: '점검 결과를 찾을 수 없습니다.' });
      }

      // 메타 정보만으로 구성 (상세 coaching 데이터 없음)
      const dimensions = Object.entries(meta.scores || {}).map(([name, score]) => ({
        name,
        score,
        analysis: '',
        tips: [],
      }));

      return res.json({
        id,
        timestamp: meta.timestamp,
        period: meta.period,
        summary: meta.summary,
        coaching: {
          overallNarrative: meta.overallNarrative,
          dimensions,
        },
      });
    }

    // 최신 coaching 데이터가 일치하는 경우 상세 정보 반환
    res.json({
      id,
      timestamp: coaching.timestamp,
      period: coaching.period,
      summary: coaching.summary,
      coaching: coaching.coaching,
    });
  } catch (err) {
    console.error('Checkpoint detail API error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
