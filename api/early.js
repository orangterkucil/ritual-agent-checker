// Proxy: Ritual Rites early-access stats (how many got the early pass via the gift graph).
// Source: the ritualmap.net worker API. Counts gifted early-access passes, not total agents.
module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  try {
    const r = await fetch('https://worker-production-1ace.up.railway.app/api/stats', {
      headers: { Accept: 'application/json' },
    });
    const d = await r.json();
    // forward only the non-identifying aggregate fields (drop raw Discord IDs for privacy)
    const out = {
      total_gifted: d.total_gifted,
      total_chains: d.total_chains,
      pending_cooldown: d.pending_cooldown,
      recent: Array.isArray(d.recent_activations)
        ? d.recent_activations.slice(0, 8).map((a) => ({
            chain_depth: a.chain_depth,
            gifted_at: a.gifted_at,
          }))
        : [],
    };
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: 'failed to fetch early-access stats', detail: String(e) });
  }
};
