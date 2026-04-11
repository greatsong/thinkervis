export default function handler(req, res) {
  res.json({
    lastCheckpoint: null,
    pending: { sessions: 0, prompts: 0 },
    totalCheckpoints: 0,
    growthData: null,
  });
}
