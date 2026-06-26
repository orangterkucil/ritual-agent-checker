# 🔮 Ritual Agent Checker

A live web app to **check running Ritual agents, wallet balances, and claim from the faucet** —
all data pulled straight from the official Ritual explorer and RPC. Includes a built-in
"how to deploy your own agent" guide.

## Features

- **Network stats** — live count of persistent / sovereign agents + current block.
- **Wallet & agent checker** — enter any `0x…` address → balance (RITUAL), tx count,
  EOA-vs-contract, and its live agent status (ALIVE / DOWN / ACTIVE / IDLE, owner, last
  heartbeat, manifest CID).
- **Faucet panel** — reads live faucet config and relays a claim (address + access code).
- **Live agents list** — browse the persistent & sovereign registries; click any address
  to load it into the checker.
- **Deploy guide** — step-by-step, with the real system-contract addresses.

## Data sources

| Source | Used for |
|---|---|
| `explorer.ritualfoundation.org/api/agents/cache` | live agent registry (status, heartbeats) |
| `rpc.ritualfoundation.org` | balance, nonce, contract code |
| `faucet.ritualfoundation.org/api/config` + `/api/drip` | faucet config & claims |

These are proxied through Vercel serverless functions (`/api/*`) to avoid CORS.

## Project structure

```
ritual-agent-checker/
├── index.html            # the whole frontend (no build step)
├── api/
│   ├── agents.js         # proxy: agent registry
│   ├── wallet.js         # proxy: RPC balance / nonce / code
│   ├── faucet-config.js  # proxy: faucet config
│   └── drip.js           # proxy: faucet claim
├── vercel.json
└── package.json
```

## Deploy to Vercel

### Option A — Vercel CLI (fastest)
```bash
npm i -g vercel        # if you don't have it
cd ritual-agent-checker
vercel                 # preview deploy, follow the prompts
vercel --prod          # production deploy
```

### Option B — GitHub + Vercel dashboard
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → **Add New → Project** → import the repo.
3. Framework preset: **Other** (no build command needed). Click **Deploy**.

### Option C — drag & drop
Zip the folder and drop it on vercel.com/new (CLI/GitHub recommended so the
`/api` functions are detected).

> No environment variables required. Node 18+ runtime (Vercel default) provides
> global `fetch`, which the API functions rely on.

## Local preview

The static `index.html` calls `/api/*`, so run it through Vercel's dev server
(plain file-open won't have the API):
```bash
vercel dev
```

---

Unofficial community tool. Testnet is experimental — not financial advice. DYOR. 🔮
