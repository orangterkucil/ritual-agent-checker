'use strict';
/* Ritual Assistant — client-side knowledge-base helper for common Ritual questions.
   No external calls, no keys. User text is rendered via textContent (XSS-safe).
   Upgrade path: replace answer() with a fetch('/api/agent-chat') backed by a real
   Ritual agent once a funded agent + access code are available. */

(function () {
  const $ = (id) => document.getElementById(id);
  const fab = $('chatFab'), panel = $('chatPanel'), body = $('chatBody'),
        input = $('chatInput'), send = $('chatSend'), close = $('chatClose'), chips = $('chatChips');
  if (!fab) return;

  // ---- knowledge base: keyword sets -> answer (HTML built by us only) ----
  const KB = [
    { k: ['what is ritual','apa itu ritual','about ritual','ritual network'],
      a: 'Ritual is the first L1 blockchain built for <b>autonomous on-chain AI agents</b>. Agents hold their own keys, self-schedule, and run with native AI/LLM precompiles — so a smart contract can think, act and persist with no off-chain operator.' },
    { k: ['access code','faucet code','kode faucet','where code','how to get code','dapet code','referral code'],
      a: 'The faucet <b>access code</b> is a single-use, server-validated code. There is <b>no public code</b> and it cannot be guessed. Get one via:<br>• the official <a href="https://discord.gg/mVRQXpteb" target="_blank" rel="noopener">Ritual Discord</a><br>• a referral from an existing tester<br>• emailing <code>hello@ritualfoundation.org</code>' },
    { k: ['faucet','mint','get ritual','testnet token','claim'],
      a: 'The faucet drips <b>5 RITUAL</b> per claim but needs an access code. Paste a valid code + your address in the Faucet panel and hit Mint. No code yet? Ask me "how to get access code".' },
    { k: ['deploy','how to deploy','buat agent','create agent','build agent'],
      a: 'To deploy an agent: 1) set up Foundry/Hardhat on <b>Chain ID 1979</b>, 2) clone <code>ritual-dapp-skills</code>, 3) fund the RitualWallet, 4) pick <b>Sovereign</b> or <b>Persistent</b>, 5) <code>forge create</code> + register with the Scheduler. Full steps are in the "Deploy Your Own Agent" section below.' },
    { k: ['network','rpc','chain id','config','connect wallet','add network'],
      a: 'Network config — <b>Chain ID:</b> 1979 · <b>RPC:</b> https://rpc.ritualfoundation.org · <b>Explorer:</b> https://explorer.ritualfoundation.org · <b>Currency:</b> RITUAL (18 decimals).' },
    { k: ['sovereign','persistent','agent type','difference','beda agent'],
      a: '<b>Sovereign</b> (precompile 0x080C) — CLI-style, runs on Scheduler wakeups.<br><b>Persistent</b> (0x0820) — container-based with memory across sessions, kept alive by heartbeats (needs ~0.1 RITUAL).' },
    { k: ['balance','zero','0 ritual','no funds','kosong','saldo'],
      a: 'A 0 balance just means the wallet hasn\'t been funded. Claim from the faucet (needs an access code) — once funded, hit Scan again to refresh.' },
    { k: ['alive','down','status','heartbeat','running','jalan'],
      a: 'Paste an agent address and Scan. <b>ALIVE/ACTIVE</b> = recently seen on-chain; <b>DOWN/IDLE</b> = no recent heartbeat. Persistent agents must stay funded or they go DOWN. Last-heartbeat block + "blocks ago" are shown.' },
    { k: ['genesis','1000','genesis 1000','genesis_claim'],
      a: 'Genesis 1000 = a role for early testers who deploy an agent. After deploying and getting the role, run <code>/genesis_claim</code> in the Ritual Discord.' },
    { k: ['airdrop','token','reward','tge','price'],
      a: 'The $RITUAL token / airdrop is <b>TBA</b> — no date or value confirmed yet. Current activity is testnet contribution: deploy agents, hold a testnet role, stay active. Not financial advice.' },
    { k: ['discord','help','support','contact','community'],
      a: 'Join the <a href="https://discord.gg/mVRQXpteb" target="_blank" rel="noopener">Ritual Discord</a> for roles, faucet codes and support, or email <code>hello@ritualfoundation.org</code>.' },
    { k: ['skills','skills kit','ritual-dapp-skills','repo'],
      a: 'Clone the skills kit so an AI coder can build for you:<br><code>git clone https://github.com/ritual-foundation/ritual-dapp-skills.git</code>' },
    { k: ['who made','creator','built this','siapa bikin','author'],
      a: 'This console was built by <a href="https://x.com/geografinist" target="_blank" rel="noopener">@geografinist</a> — open-source at <a href="https://github.com/orangterkucil/ritual-agent-checker" target="_blank" rel="noopener">GitHub</a>.' },
  ];

  const GREET = ['hi','hello','hey','halo','hai','help','start','gm'];
  const CHIPS = ['How to get access code?', 'How to deploy an agent?', 'Network config', 'Sovereign vs Persistent'];

  function answer(q) {
    const t = q.toLowerCase();
    if (GREET.some((g) => t === g || t.startsWith(g + ' '))) {
      return 'gm 🔮 I\'m the Ritual Assistant. Ask me about the <b>faucet / access code</b>, <b>deploying an agent</b>, <b>network config</b>, or <b>agent status</b>. Tap a suggestion below to start.';
    }
    const words = t.split(/[^a-z0-9]+/).filter(Boolean);
    let best = null, bestScore = 0;
    for (const e of KB) {
      let s = 0;
      for (const phrase of e.k) {
        if (t.includes(phrase)) s += phrase.split(' ').length * 3; // phrase hit
        for (const w of phrase.split(' ')) if (w.length > 2 && words.includes(w)) s += 1;
      }
      if (s > bestScore) { bestScore = s; best = e; }
    }
    if (best && bestScore >= 2) return best.a;
    return 'I\'m the <b>Ritual Assistant</b> — I can only help with <b>Ritual Network</b>: agents, faucet / access code, deploy, network config and wallet/agent status. Ask me anything about Ritual. 🔮<br>Need a human? Join the <a href="https://discord.gg/mVRQXpteb" target="_blank" rel="noopener">Ritual Discord</a>.';
  }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,(c)=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  // Safe render for model output: escape everything, then linkify bare URLs only.
  function linkify(text){
    return esc(text).replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<]+)/g,
      (u)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  }
  function addBot(html) {
    const d = document.createElement('div');
    d.className = 'cmsg bot';
    d.innerHTML = html; // KB content is author-controlled; model output goes through linkify()
    body.appendChild(d); body.scrollTop = body.scrollHeight;
    return d;
  }
  function addMe(text) {
    const d = document.createElement('div');
    d.className = 'cmsg me';
    d.textContent = text; // user text -> textContent (XSS-safe)
    body.appendChild(d); body.scrollTop = body.scrollHeight;
  }

  async function submit() {
    const q = (input.value || '').trim();
    if (!q) return;
    addMe(q); input.value = '';
    const bubble = addBot('<span style="opacity:.6">…</span>');
    try {
      const r = await fetch('/api/agent-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const d = await r.json();
      if (d && d.reply) bubble.innerHTML = linkify(d.reply);  // LLM answer (safe-rendered)
      else bubble.innerHTML = answer(q);                       // fallback: local knowledge base
    } catch {
      bubble.innerHTML = answer(q);                            // network error -> local KB
    }
    body.scrollTop = body.scrollHeight;
  }
  function renderChips() {
    chips.innerHTML = '';
    CHIPS.forEach((c) => {
      const el = document.createElement('span');
      el.className = 'chip'; el.textContent = c;
      el.addEventListener('click', () => { input.value = c; submit(); });
      chips.appendChild(el);
    });
  }
  function openPanel() {
    panel.hidden = false;
    if (!body.dataset.init) {
      addBot('gm 🔮 I\'m the <b>Ritual Assistant</b> — here to help with faucet, deploy and agent questions on Ritual. What do you need?');
      renderChips();
      body.dataset.init = '1';
    }
    input.focus();
  }
  function closePanel() { panel.hidden = true; }

  fab.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  fab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); } });
  close.addEventListener('click', closePanel);
  send.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
})();
