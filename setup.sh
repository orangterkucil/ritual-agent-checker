#!/usr/bin/env bash
# 🔮 Ritual agent dev setup — installs everything needed to deploy an agent on Ritual Chain.
# Safe: this touches NO wallet, key, or seed phrase. It only installs dev tools + the skills kit.
# Run on Linux/macOS (or WSL on Windows). For Windows users, run it on your Linux VPS.
set -e

echo "🔮 Ritual Agent — dev setup"
echo "------------------------------------"

# 1) Foundry (forge/cast/anvil)
if ! command -v forge >/dev/null 2>&1; then
  echo "→ Installing Foundry..."
  curl -L https://foundry.paradigm.xyz | bash
  export PATH="$HOME/.foundry/bin:$PATH"
  "$HOME/.foundry/bin/foundryup"
else
  echo "→ Foundry already installed."
fi
forge --version || true

# 2) Ritual skills kit (so an AI coder can build/deploy for you)
if [ ! -d ritual-dapp-skills ]; then
  echo "→ Cloning ritual-dapp-skills..."
  git clone --depth 1 https://github.com/ritual-foundation/ritual-dapp-skills.git
else
  echo "→ ritual-dapp-skills already present, pulling latest..."
  git -C ritual-dapp-skills pull --ff-only || true
fi

cat <<'EOF'

✅ Setup complete.

Network:
  Chain ID : 1979
  RPC      : https://rpc.ritualfoundation.org
  Explorer : https://explorer.ritualfoundation.org

Next steps:
  1) Claim testnet RITUAL from the faucet (needs an access code).
  2) Build your agent using ./ritual-dapp-skills (or your AI coding agent).
  3) Deploy:  forge create --rpc-url https://rpc.ritualfoundation.org <YourAgent>
     (export your key in the shell first:  export PRIVATE_KEY=...  — never paste it anywhere online)

You are now ready to deploy on Ritual. 🔮
EOF
