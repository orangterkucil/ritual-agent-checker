// Proxy: read on-chain wallet/agent data straight from the Ritual RPC node.
const RPC = 'https://rpc.ritualfoundation.org';

function rpc(method, params) {
  return fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }).then((r) => r.json());
}

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  const address = String((req.query && req.query.address) || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }
  try {
    const [bal, nonce, code, bn] = await Promise.all([
      rpc('eth_getBalance', [address, 'latest']),
      rpc('eth_getTransactionCount', [address, 'latest']),
      rpc('eth_getCode', [address, 'latest']),
      rpc('eth_blockNumber', []),
    ]);
    // Privacy: never cache or persist address-keyed responses.
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      address,
      balanceWei: bal.result || '0x0',
      nonce: nonce.result || '0x0',
      code: code.result || '0x',
      blockNumber: bn.result || '0x0',
    });
  } catch (e) {
    res.status(502).json({ error: 'rpc failed', detail: String(e) });
  }
};
