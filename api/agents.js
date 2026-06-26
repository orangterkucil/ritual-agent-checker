// Proxy: live agent registry (persistent + sovereign) from the Ritual explorer.
module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  try {
    const r = await fetch('https://explorer.ritualfoundation.org/api/agents/cache', {
      headers: { Accept: 'application/json' },
    });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'failed to fetch agents', detail: String(e) });
  }
};
