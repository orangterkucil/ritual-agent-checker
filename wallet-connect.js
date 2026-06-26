'use strict';
/* Wallet connect (EIP-1193 / MetaMask) for Ritual Chain 1979 — hardened.

   THREAT MODEL & DEFENSES (defense-in-depth):
   1. Clickjacking / hidden iframe  -> frame-bust guard (blocks connect if embedded),
      on top of X-Frame-Options: DENY + CSP frame-ancestors 'none'.
   2. Insecure context (http/MITM)  -> requires window.isSecureContext (HTTPS).
   3. Wrong-network signing          -> verifies chainId === 1979 before trusting state.
   4. Malicious provider / spoofed addr -> strict 0x-address validation before use.
   5. Blind signing / drainers       -> this script sends NO transaction and requests
      NO token approvals; it only reads. Any future tx must be reviewed in the wallet.
   6. Seed-phrase phishing           -> never requested, ever. */

(function () {
  const CHAIN_HEX = '0x7bb'; // 1979
  const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
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

  // ---- Defense 1: anti-clickjacking (block if loaded inside a frame) ----
  let FRAMED = false;
  try { FRAMED = window.top !== window.self; } catch { FRAMED = true; } // cross-origin frame throws
  if (FRAMED) {
    btn.disabled = true;
    btn.textContent = '⚠ Blocked (framed)';
    info.style.display = 'block';
    info.textContent = 'For your safety, wallet connect is disabled when this app is embedded in another site. Open it directly at the official URL.';
    return;
  }

  // ---- Defense 2: require a secure (HTTPS) context ----
  const SECURE = window.isSecureContext || location.hostname === 'localhost';

  function warn(msg) { info.style.display = 'block'; info.textContent = msg; }
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

  async function refresh(addrRaw) {
    const eth = window.ethereum;
    const addr = String(addrRaw || '');
    // ---- Defense 4: validate the address before using it anywhere ----
    if (!ADDR_RE.test(addr)) { warn('Wallet returned an invalid address. Aborting.'); return; }

    // ---- Defense 3: confirm we are actually on Ritual Chain 1979 ----
    let chain = '';
    try { chain = await eth.request({ method: 'eth_chainId' }); } catch {}
    if (String(chain).toLowerCase() !== CHAIN_HEX) {
      btn.textContent = '🦊 ' + short(addr);
      warn('⚠ Wrong network. Switch your wallet to Ritual Chain (1979) before doing anything — do not sign while on another network.');
      return;
    }

    let bal = '0x0';
    try { bal = await eth.request({ method: 'eth_getBalance', params: [addr, 'latest'] }); } catch {}
    btn.textContent = '🦊 ' + short(addr);
    info.style.display = 'block';
    info.textContent = `Connected · ${fmtRitual(bal)} RITUAL · Ritual Chain ✓`;

    const a = document.getElementById('addr'); const f = document.getElementById('fAddr');
    if (a) a.value = addr;
    if (f) f.value = addr;
    if (typeof window.checkAddr === 'function') window.checkAddr();
  }

  async function connect() {
    if (!SECURE) { warn('Connection blocked: this page is not served over a secure (HTTPS) connection.'); return; }
    const eth = window.ethereum;
    if (!eth) {
      info.style.display = 'block';
      info.innerHTML = 'No wallet found. Install <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> to connect.';
      return;
    }
    btn.disabled = true; const old = btn.textContent; btn.textContent = 'Connecting…';
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) throw new Error('no account');
      await ensureNetwork(eth);
      await refresh(accounts[0]);
      // react to wallet changes (re-validate each time)
      if (eth.on) {
        eth.on('accountsChanged', (acc) => {
          if (acc && acc[0]) refresh(acc[0]);
          else { btn.textContent = '🦊 Connect Wallet'; info.style.display = 'none'; }
        });
        eth.on('chainChanged', () => location.reload());
      }
    } catch (e) {
      warn('Connection cancelled or failed: ' + (e && e.message ? e.message : 'error'));
      btn.textContent = old;
    } finally { btn.disabled = false; }
  }

  btn.addEventListener('click', connect);
})();
