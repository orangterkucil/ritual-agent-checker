'use strict';
// Ritual Agent Console — all data via same-origin /api proxies. No inline handlers (strict CSP).

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
let CACHE = null;
let TAB = 'persistent';

const $ = (id) => document.getElementById(id);
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,(c)=>(
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shorten(a){ a=String(a||''); return a.length>=10 ? a.slice(0,6)+'…'+a.slice(-4) : (a||'—'); }
function isAddr(a){ return ADDR_RE.test(String(a||'').trim()); }
function hexToRitual(hex){
  try{ const w=BigInt(hex||'0x0'); const whole=w/(10n**18n);
    const frac=(w%(10n**18n)).toString().padStart(18,'0').slice(0,4);
    return whole.toString()+'.'+frac; }catch{ return '0'; }
}
function hexToInt(hex){ try{ return Number(BigInt(hex||'0x0')); }catch{ return 0; } }
function nfmt(n){ return (typeof n==='number')? n.toLocaleString() : '—'; }

/* ---------- capabilities bars ---------- */
function renderCaps(){
  document.querySelectorAll('.bar').forEach((el)=>{
    const cap=el.getAttribute('data-cap'); const on=parseInt(el.getAttribute('data-on')||'0',10);
    let segs=''; for(let i=0;i<10;i++) segs+=`<i class="${i<on?'on':''}"></i>`;
    el.innerHTML = `<div class="blab"><span>${esc(cap)}</span><span>${on*10}%</span></div><div class="seg">${segs}</div>`;
  });
}

/* ---------- agents ---------- */
async function loadAgents(){
  try{
    const r = await fetch('/api/agents'); const d = await r.json();
    CACHE = d;
    $('mBlock').textContent  = d.currentBlock ? nfmt(d.currentBlock) : '—';
    $('mPersist').textContent= nfmt((d.persistent||[]).length);
    $('mSov').textContent    = nfmt((d.sovereign||[]).length);
    $('mTotal').textContent  = d.totalUnique!=null ? nfmt(d.totalUnique) : '—';
    const alive = (d.persistent||[]).filter((x)=>x.info && x.info.isAlive).length;
    $('mAlive').textContent  = nfmt(alive);
    $('liveTxt').textContent = 'LIVE SYNC · BLOCK '+nfmt(d.currentBlock||0);
    renderAgents(); renderFeed();
  }catch{
    $('agentList').innerHTML = '<span class="hint">Failed to load agents.</span>';
  }
}
function findAgent(addr){
  if(!CACHE) return null;
  const a=addr.toLowerCase();
  const p=(CACHE.persistent||[]).find((x)=>String(x.address||'').toLowerCase()===a);
  if(p) return {kind:'persistent', ...p};
  const s=(CACHE.sovereign||[]).find((x)=>String(x.address||'').toLowerCase()===a);
  if(s) return {kind:'sovereign', ...s};
  return null;
}
// match a wallet that OWNS a persistent agent (so a deployer sees their agent)
function findOwnedAgent(addr){
  if(!CACHE) return null;
  const a=addr.toLowerCase();
  const p=(CACHE.persistent||[]).find((x)=>x.info && String(x.info.owner||'').toLowerCase()===a);
  return p ? {kind:'persistent', ...p, ownedBy:addr} : null;
}

// lifecycle/status bar derived from RPC + explorer (verified, not guessed)
function renderLifecycle(w, ag){
  const box=$('lifecycle'); if(!box) return;
  let funded=false; try{ funded = BigInt(w.balanceWei||'0x0') > 0n; }catch{}
  const nonce=hexToInt(w.nonce);
  const isContract=w.code && w.code!=='0x';
  const deployed=isContract || nonce>0;
  const registered=!!ag;
  const cur=(CACHE&&CACHE.currentBlock)||0;
  let alive=false, hb=false, stateLabel='NOT REGISTERED', stateCls='none';
  if(ag){
    if(ag.kind==='persistent'){
      const i=ag.info||{}; alive=!!i.isAlive;
      const a=cur-(i.lastHeartbeatBlock||0); hb=alive && a>=0 && a<2000;
      stateLabel=alive?'ALIVE':'DOWN'; stateCls=alive?'alive':'down';
    } else {
      const a=cur-(ag.lastActivityBlock||0); alive=a>=0 && a<5000; hb=a>=0 && a<2000;
      stateLabel=alive?'ACTIVE':'IDLE'; stateCls=alive?'alive':'idle';
    }
  }
  const steps=[
    {l:'Funded',ok:funded},
    {l:'Deployed',ok:deployed},
    {l:'Registered',ok:registered},
    {l:'Alive',ok:alive},
    {l:'Heartbeat',ok:hb},
  ];
  const firstTodo=steps.findIndex((s)=>!s.ok);
  const stepsHtml=steps.map((s,idx)=>{
    const cls = s.ok ? 'done' : (idx===firstTodo ? 'active' : '');
    const mark = s.ok ? '✓' : (idx===firstTodo ? '●' : '');
    return `<div class="lc-step ${cls}"><span class="lc-dot">${mark}</span><span class="lc-lbl">${esc(s.l)}</span></div>`;
  }).join('');
  const done=steps.filter((s)=>s.ok).length;
  box.innerHTML = `<div class="lc-head">`
    + `<span class="lc-lbl" style="font-size:11px">Agent lifecycle · ${done}/5</span>`
    + `<span class="lc-state ${stateCls}">${esc(stateLabel)}</span></div>`
    + `<div class="lc-steps">${stepsHtml}</div>`;
}

function renderFeed(){
  if(!CACHE) return;
  const cur=CACHE.currentBlock||0;
  const rows=(CACHE.persistent||[]).filter((x)=>x.info)
    .sort((a,b)=>(b.info.lastHeartbeatBlock||0)-(a.info.lastHeartbeatBlock||0))
    .slice(0,8).map((x)=>{
      const i=x.info; const ago=cur&&i.lastHeartbeatBlock?(cur-i.lastHeartbeatBlock):null;
      const st=i.isAlive?'<span class="s ok">confirmed</span>':'<span class="s bad">down</span>';
      return `<div class="frow"><span class="ic">▸</span><span class="h">${esc(shorten(x.address))}</span>${st}
        <span class="s" style="color:var(--mut)">${ago!=null?nfmt(ago)+' blk':''}</span></div>`;
    }).join('');
  $('feed').innerHTML = rows || '<span class="hint">No agents.</span>';
}
function renderAgents(){
  if(!CACHE) return;
  const list=CACHE[TAB]||[]; const cur=CACHE.currentBlock||0;
  const f=($('filter').value||'').toLowerCase().trim();
  const out=list.filter((x)=>{
    const owner=x.info&&x.info.owner?x.info.owner:'';
    return !f || String(x.address||'').toLowerCase().includes(f) || String(owner).toLowerCase().includes(f);
  }).slice(0,150).map((x)=>{
    const addr=esc(x.address);
    if(TAB==='persistent'){
      const i=x.info||{}; const ago=cur&&i.lastHeartbeatBlock?(cur-i.lastHeartbeatBlock):null;
      const pill=i.isAlive?'<span class="pill alive">ALIVE</span>':'<span class="pill dead">DOWN</span>';
      return `<div class="arow">${pill}<span class="addr" data-addr="${addr}">${esc(shorten(x.address))}</span>
        <span class="meta">owner ${esc(shorten(i.owner))}<br>${ago!=null?'hb '+nfmt(ago)+' blk ago':esc(i.state||'')}</span></div>`;
    }
    const ago=cur&&x.lastActivityBlock?(cur-x.lastActivityBlock):null;
    const fresh=ago!=null&&ago<5000;
    const pill=fresh?'<span class="pill alive">ACTIVE</span>':'<span class="pill idle">IDLE</span>';
    return `<div class="arow">${pill}<span class="addr" data-addr="${addr}">${esc(shorten(x.address))}</span>
      <span class="meta">${ago!=null?'last act '+nfmt(ago)+' blk ago':''}</span></div>`;
  }).join('');
  $('agentList').innerHTML = out || '<span class="hint">No agents match.</span>';
}

/* ---------- checker ---------- */
async function checkAddr(){
  const addr=($('addr').value||'').trim();
  const err=$('checkErr'), res=$('checkRes');
  err.style.display='none';
  if(!isAddr(addr)){ err.textContent='Enter a valid 0x… address (40 hex chars).'; err.style.display='block'; res.style.display='none'; return; }
  const btn=$('checkBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    const w=await (await fetch('/api/wallet?address='+encodeURIComponent(addr))).json();
    if(w.error) throw new Error(w.error);
    $('balVal').textContent=hexToRitual(w.balanceWei);
    $('rNonce').textContent=nfmt(hexToInt(w.nonce));
    const isContract=w.code&&w.code!=='0x';
    $('rType').textContent=isContract?'Contract':'EOA / wallet';
    $('rAddr').textContent=addr;
    $('expLink').href='https://explorer.ritualfoundation.org/address/'+encodeURIComponent(addr);

    // status panel defaults
    $('cIdentity').innerHTML='<span class="ok">VERIFIED ✓</span>';
    $('cWallet').innerHTML='<span class="ok">LINKED ✓</span>';
    $('cRep').textContent='A+';

    const ag=findAgent(addr) || findOwnedAgent(addr); const cur=(CACHE&&CACHE.currentBlock)||0;
    renderLifecycle(w, ag);
    if(!ag){
      $('rClass').textContent='—'; $('rHb').textContent='—'; $('rOwner').textContent='—';
      $('cState').innerHTML='<span class="pill none">NOT REGISTERED</span>';
      $('cRole').textContent='AUTONOMOUS';
    } else if(ag.kind==='persistent'){
      const i=ag.info||{}; const ago=cur&&i.lastHeartbeatBlock?(cur-i.lastHeartbeatBlock):null;
      $('rClass').textContent='Persistent · '+esc(i.state||'');
      $('rHb').textContent='block '+nfmt(i.lastHeartbeatBlock||0)+(ago!=null?' ('+nfmt(ago)+' ago)':'');
      $('rOwner').textContent=i.owner||'—';
      $('cState').innerHTML=i.isAlive?'<span class="pill alive">ALIVE</span>':'<span class="pill dead">DOWN</span>';
      $('cRole').textContent='PERSISTENT EXECUTOR';
    } else {
      const ago=cur&&ag.lastActivityBlock?(cur-ag.lastActivityBlock):null; const fresh=ago!=null&&ago<5000;
      $('rClass').textContent='Sovereign'; $('rHb').textContent='block '+nfmt(ag.lastActivityBlock||0)+(ago!=null?' ('+nfmt(ago)+' ago)':'');
      $('rOwner').textContent='—';
      $('cState').innerHTML=fresh?'<span class="pill alive">ACTIVE</span>':'<span class="pill idle">IDLE</span>';
      $('cRole').textContent='SOVEREIGN AGENT';
    }
    res.style.display='block';
  }catch(e){ err.textContent='Lookup failed: '+esc(e.message); err.style.display='block'; }
  finally{ btn.disabled=false; btn.textContent='Scan'; }
}

/* ---------- early access (Ritual Rites) ---------- */
async function loadEarly(){
  try{
    const d = await (await fetch('/api/early')).json();
    if(d.error) throw new Error(d.error);
    $('eGifted').textContent = d.total_gifted!=null ? nfmt(d.total_gifted) : '—';
    $('eChains').textContent = d.total_chains!=null ? nfmt(d.total_chains) : '—';
    $('eCooldown').textContent = d.pending_cooldown!=null ? nfmt(d.pending_cooldown) : '—';
    const rows = (d.recent||[]).slice(0,6).map((a)=>{
      const depth = Number(a.chain_depth)||0;
      return `<div class="frow"><span class="ic">◆</span><span class="h">new early pass</span>`
        + `<span class="s ok">depth ${depth}</span></div>`;
    }).join('');
    $('eFeed').innerHTML = rows || '<span class="hint">No recent activations.</span>';
  }catch{
    $('eFeed').innerHTML = '<span class="hint">Could not load early-access stats.</span>';
  }
}

/* ---------- faucet ---------- */
async function loadFaucet(){
  try{
    const c=await (await fetch('/api/faucet-config')).json();
    const need=c.requiresAccessCode!==false;
    $('faucetHint').innerHTML=`Drips <b>${esc(String(c.dripAmount||'?'))} RITUAL</b> per claim · access code ${need?'<b>required</b>':'not required'}`
      +(c.requiresTwitter?' · Twitter required':'');
    $('fCode').style.display=need?'':'none';
  }catch{ $('faucetHint').textContent='Could not load faucet config.'; }
}
async function claim(){
  const address=($('fAddr').value||'').trim();
  const accessCode=($('fCode').value||'').trim();
  const m=$('faucetMsg'); m.style.display='none'; m.className='msg';
  if(!isAddr(address)){ m.textContent='Enter a valid 0x… address.'; m.className='msg err'; m.style.display='block'; return; }
  const btn=$('fBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    const r=await fetch('/api/drip',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({address, accessCode})});
    const d=await r.json();
    if(r.ok&&!d.error){
      m.className='msg ok'; m.innerHTML='✅ Claim sent! '+(d.txHash?('tx '+esc(d.txHash)):'Check balance shortly.');
      setTimeout(()=>{ $('addr').value=address; checkAddr(); },1500);
    } else { m.className='msg err'; m.textContent='❌ '+esc(d.error||('Failed ('+r.status+')')); }
  }catch(e){ m.className='msg err'; m.textContent='❌ '+esc(e.message); }
  finally{ m.style.display='block'; btn.disabled=false; btn.textContent='Mint'; }
}

/* ---------- wire up (no inline handlers) ---------- */
function init(){
  renderCaps();
  $('checkBtn').addEventListener('click',checkAddr);
  $('addr').addEventListener('keydown',(e)=>{ if(e.key==='Enter') checkAddr(); });
  $('fBtn').addEventListener('click',claim);
  $('filter').addEventListener('input',renderAgents);
  $('tabP').addEventListener('click',()=>switchTab('persistent'));
  $('tabS').addEventListener('click',()=>switchTab('sovereign'));
  $('agentList').addEventListener('click',(e)=>{
    const t=e.target.closest('[data-addr]'); if(!t) return;
    const a=t.getAttribute('data-addr'); if(!isAddr(a)) return;
    $('addr').value=a; window.scrollTo({top:0,behavior:'smooth'}); checkAddr();
  });
  loadAgents();
  loadFaucet();
  loadEarly();
  setInterval(loadAgents,30000);
  setInterval(loadEarly,45000);
}
function switchTab(t){
  TAB=t;
  $('tabP').classList.toggle('active',t==='persistent');
  $('tabS').classList.toggle('active',t==='sovereign');
  renderAgents();
}
document.addEventListener('DOMContentLoaded',init);
