export const config = { maxDuration: 30 };

async function readGist() {
  const res = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
    headers: { Authorization: `token ${process.env.GH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Gist read failed: ${res.status}`);
  const gist = await res.json();
  const content = gist.files['tinkervis-data.json']?.content;
  return content ? JSON.parse(content) : { coaching: null, chatHistory: [] };
}

async function writeGist(data) {
  const res = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${process.env.GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        'tinkervis-data.json': {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gist write failed: ${res.status}`);
  return true;
}

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (token !== process.env.SYNC_TOKEN) {
    return res.status(401).json({ error: '인증 실패' });
  }

  try {
    if (req.method === 'GET') {
      const data = await readGist();
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { type, payload } = req.body;
      const data = await readGist();

      if (type === 'checkpoint') {
        data.coaching = payload;
        data.lastSync = new Date().toISOString();
      } else if (type === 'chat') {
        if (!data.chatHistory) data.chatHistory = [];
        data.chatHistory.push({
          ...payload,
          savedAt: new Date().toISOString(),
        });
        // 최근 20개만 유지
        if (data.chatHistory.length > 20) {
          data.chatHistory = data.chatHistory.slice(-20);
        }
      }

      await writeGist(data);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export { readGist, writeGist };
