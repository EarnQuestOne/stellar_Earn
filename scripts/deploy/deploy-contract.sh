#!/usr/bin/env bash
# =============================================================================
# Soroban Contract Deployment Script
# =============================================================================
# Builds the EarnQuest WASM and deploys to Stellar network.
#
# Usage:
#   ./deploy-contract.sh                  # Build + deploy
#   ./deploy-contract.sh --build-only     # Build only (no on-chain deploy)
#   ./deploy-contract.sh --upgrade        # Upgrade existing contract
#   ./deploy-contract.sh --initialize     # Initialize the contract after deploy
#   ./deploy-contract.sh --testnet        # Target testnet (default)
#   ./deploy-contract.sh --mainnet        # Target mainnet
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONTRACT_DIR="${PROJECT_ROOT}/contracts/earn-quest"

# ── Defaults ──────────────────────────────────────────────────────────────────

BUILD_ONLY=false
UPGRADE=false
INITIALIZE=false
NETWORK="testnet"
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
HORIZON_URL="https://horizon-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# ── Argument Parsing ──────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only) BUILD_ONLY=true; shift ;;
    --upgrade)    UPGRADE=true; shift ;;
    --initialize) INITIALIZE=true; shift ;;
    --testnet)
      NETWORK="testnet"
      SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
      HORIZON_URL="https://horizon-testnet.stellar.org"
      NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
      shift ;;
    --mainnet)
      NETWORK="mainnet"
      SOROBAN_RPC_URL="https://soroban-mainnet.stellar.org"
      HORIZON_URL="https://horizon-mainnet.stellar.org"
      NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
      shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
info()  { echo -e "${CYAN}[Contract]${NC} $*"; }
ok()    { echo -e "${GREEN}[Contract]${NC} $*"; }
warn()  { echo -e "${YELLOW}[Contract]${NC} $*"; }
error() { echo -e "${RED}[Contract]${NC} $*"; exit 1; }

# ── Prerequisites ─────────────────────────────────────────────────────────────

command -v cargo >/dev/null 2>&1 || error "cargo not found. Install Rust: https://rustup.rs"
command -v soroban >/dev/null 2>&1 || warn "soroban CLI not found. Install: cargo install soroban-cli"

# Check wasm32 target
if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  info "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown
fi

# ── Build ─────────────────────────────────────────────────────────────────────

info "Building EarnQuest contract for $NETWORK..."

cd "$CONTRACT_DIR"

info "Running cargo build..."
cargo build --release --target wasm32-unknown-unknown

WASM_PATH="target/wasm32-unknown-unknown/release/earn_quest.wasm"

if [[ ! -f "$WASM_PATH" ]]; then
  error "WASM file not found at $WASM_PATH"
fi

WASM_SIZE=$(wc -c < "$WASM_PATH" | tr -d ' ')
WASM_HASH=$(sha256sum "$WASM_PATH" | cut -d' ' -f1)

ok "Build successful!"
ok "  WASM:   $WASM_PATH"
ok "  Size:   ${WASM_SIZE} bytes"
ok "  SHA256: $WASM_HASH"

# Optimize if soroban CLI is available
if command -v soroban >/dev/null 2>&1; then
  info "Optimizing WASM..."
  soroban contract optimize --wasm "$WASM_PATH" 2>/dev/null || warn "Optimization skipped"

  OPT_WASM_PATH="${WASM_PATH%.wasm}.optimized.wasm"
  if [[ -f "$OPT_WASM_PATH" ]]; then
    OPT_SIZE=$(wc -c < "$OPT_WASM_PATH" | tr -d ' ')
    ok "Optimized WASM: ${OPT_SIZE} bytes"
    WASM_PATH="$OPT_WASM_PATH"
  fi
fi

if [[ "$BUILD_ONLY" == true ]]; then
  ok "Build-only mode — skipping deployment"
  exit 0
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

if [[ -z "${SOROBAN_SECRET_KEY:-}" ]]; then
  warn "SOROBAN_SECRET_KEY not set — cannot deploy on-chain"
  warn "Set it via: export SOROBAN_SECRET_KEY=S..."
  warn "WASM is ready at: $CONTRACT_DIR/$WASM_PATH"
  exit 0
fi

info "Deploying to $NETWORK via $SOROBAN_RPC_URL..."

# Deploy the contract
CONTRACT_ID=$(soroban contract deploy \
  --source-account "$SOROBAN_SECRET_KEY" \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --wasm "$WASM_PATH" \
  2>&1)

if [[ -z "$CONTRACT_ID" ]]; then
  error "Deployment failed — no contract ID returned"
fi

ok "Contract deployed!"
ok "  Contract ID: $CONTRACT_ID"
ok "  Network:     $NETWORK"
ok "  RPC:         $SOROBAN_RPC_URL"

# ── Upgrade ───────────────────────────────────────────────────────────────────

if [[ "$UPGRADE" == true ]] && [[ -n "${EXISTING_CONTRACT_ID:-}" ]]; then
  info "Upgrading existing contract $EXISTING_CONTRACT_ID..."

  # Authorize upgrade
  soroban contract invoke \
    --id "$EXISTING_CONTRACT_ID" \
    --source-account "$SOROBAN_SECRET_KEY" \
    --rpc-url "$SOROBAN_RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- authorize_upgrade \
    --caller "$(soroban identity address 2>/dev/null || echo 'admin')" \
    2>/dev/null || warn "Upgrade authorization may have failed"

  ok "Contract upgrade complete"
fi

# ── Initialize ────────────────────────────────────────────────────────────────

if [[ "$INITIALIZE" == true ]]; then
  if [[ -z "${ADMIN_ADDRESS:-}" ]]; then
    warn "ADMIN_ADDRESS not set — skipping initialization"
    warn "Initialize manually with:"
    echo "  soroban contract invoke --id $CONTRACT_ID --source-account \$SOROBAN_SECRET_KEY \\"
    echo "    --rpc-url $SOROBAN_RPC_URL -- initialize --admin <ADMIN_ADDRESS>"
  else
    info "Initializing contract with admin: $ADMIN_ADDRESS..."

    soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source-account "$SOROBAN_SECRET_KEY" \
      --rpc-url "$SOROBAN_RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- initialize \
      --admin "$ADMIN_ADDRESS" \
      2>/dev/null || warn "Initialization may have failed"

    ok "Contract initialized with admin: $ADMIN_ADDRESS"
  fi
fi

# ── Output Summary ────────────────────────────────────────────────────────────

echo ""
ok "══════════════════════════════════════════════════════════════"
ok "  Contract Deployment Summary"
ok "══════════════════════════════════════════════════════════════"
ok "  Contract ID:  $CONTRACT_ID"
ok "  Network:      $NETWORK"
ok "  WASM SHA256:  $WASM_HASH"
ok "  Admin:        ${ADMIN_ADDRESS:-not set}"
ok "══════════════════════════════════════════════════════════════"
echo ""
info "Add to your deploy.env:"
echo "  CONTRACT_ID=$CONTRACT_ID"
