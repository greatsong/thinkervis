export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  try {
    const gistRes = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
      headers: { Authorization: `token ${process.env.GH_TOKEN}` },
    });
    if (!gistRes.ok) throw new Error(`Gist read failed: ${gistRes.status}`);
    const gist = await gistRes.json();
    const content = gist.files['tinkervis-data.json']?.content;
    const data = content ? JSON.parse(content) : {};

    const checkpoints = (data.checkpointHistory || []).slice().reverse();
    res.json({ checkpoints, total: checkpoints.length });
  } catch (err) {
    console.error('Checkpoints API error:', err.message);
    res.json({ checkpoints: [], total: 0 });
  }
}
