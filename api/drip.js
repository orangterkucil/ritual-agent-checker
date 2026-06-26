// Proxy: forward a faucet claim to the official Ritual faucet.
// The faucet validates the access code server-side; this only relays the request.
module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  const address = String(body.address || '').trim();
  const code = String(body.accessCode || body.referralCode || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }
  try {
    const payload = { address };
    if (code) payload.referralCode = code;
    const r = await fetch('https://faucet.ritualfoundation.org/api/drip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({ error: 'non-JSON faucet response' }));
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'faucet request failed', detail: String(e) });
  }
};
