'use strict';
/* Wallet connect (EIP-1193 / MetaMask) for Ritual Chain 1979.
   SECURITY: only requests accounts, switches/adds the network, and reads balance.
   It NEVER asks for a private key or seed phrase, and sends NO transaction on its own —
   any future deploy tx must be explicitly reviewed and approved by the user in their wallet. */

(function () {
  const CHAIN_HEX = '0x7bb'; // 1979
  const NET = {
    chainId: CHAIN_HEX,
    chainName: 'Ritual Testnet',
    nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
    rpcUrls: ['https://rpc.ritualfoundation.org'],
    blockExplorerUrls: ['https://explorer.ritualfoundation.org'],
  };

  const btn = document.getElementById('connectBtn');
  const info = document.getElementById('walletInfo');
  if (!btn) return;

  function short(a) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : ''; }
  function fmtRitual(weiHex) {
    try {
      const w = BigInt(weiHex || '0x0');
      return (w / 10n ** 18n) + '.' + (w % 10n ** 18n).toString().padStart(18, '0').slice(0, 4);
    } catch { return '0'; }
  }

  async function ensureNetwork(eth) {
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] });
    } catch (e) {
      if (e && e.code === 4902) {
        await eth.request({ method: 'wallet_addEthereumChain', params: [NET] });
      } else { throw e; }
    }
  }

  async function refresh(addr) {
    const eth = window.ethereum;
    let bal = '0x0';
    try { bal = await eth.request({ method: 'eth_getBalance', params: [addr, 'latest'] }); } catch {}
    btn.textContent = '🦊 ' + short(addr);
    info.style.display = 'block';
    info.textContent = `Connected · ${fmtRitual(bal)} RITUAL · Ritual Chain`;
    // feed the connected address into the checker + faucet (no hardcoded address)
    const a = document.getElementById('addr'); const f = document.getElementById('fAddr');
    if (a) a.value = addr;
    if (f) f.value = addr;
    if (typeof window.checkAddr === 'function') window.checkAddr();
  }

  async function connect() {
    const eth = window.ethereum;
    if (!eth) {
      info.style.display = 'block';
      info.innerHTML = 'No wallet found. Install <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> to connect.';
      return;
    }
    btn.disabled = true; const old = btn.textContent; btn.textContent = 'Connecting…';
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      await ensureNetwork(eth);
      await refresh(accounts[0]);
      eth.on && eth.on('accountsChanged', (acc) => {
        if (acc && acc[0]) refresh(acc[0]);
        else { btn.textContent = '🦊 Connect Wallet'; info.style.display = 'none'; }
      });
      eth.on && eth.on('chainChanged', () => location.reload());
    } catch (e) {
      info.style.display = 'block';
      info.textContent = 'Connection cancelled or failed: ' + (e && e.message ? e.message : 'error');
      btn.textContent = old;
    } finally { btn.disabled = false; }
  }

  btn.addEventListener('click', connect);
})();
