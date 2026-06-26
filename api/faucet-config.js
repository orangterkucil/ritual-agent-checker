// Proxy: live faucet gate config (drip amount, whether an access code is required).
module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  try {
    const r = await fetch('https://faucet.ritualfoundation.org/api/config', {
      headers: { Accept: 'application/json' },
    });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'failed to fetch faucet config', detail: String(e) });
  }
};
