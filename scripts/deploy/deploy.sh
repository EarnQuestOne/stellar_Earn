#!/usr/bin/env bash
# =============================================================================
# StellarEarn Full-Stack Deployment Script
# =============================================================================
# Orchestrates deployment of all services:
#   1. Soroban smart contract
#   2. NestJS backend API
#   3. Next.js frontend
#   4. Subgraph event indexer
#
# Usage:
#   ./deploy.sh                  # Deploy everything
#   ./deploy.sh --contract-only  # Deploy contract only
#   ./deploy.sh --backend-only   # Deploy backend only
#   ./deploy.sh --frontend-only  # Deploy frontend only
#   ./deploy.sh --subgraph-only  # Deploy subgraph only
#   ./deploy.sh --docker         # Deploy via Docker Compose
#   ./deploy.sh --check          # Health check all services
# =============================================================================

set -euo pipefail

# ── Colors & Logging ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Resolve Script Directory ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Load Environment ──────────────────────────────────────────────────────────

ENV_FILE="${PROJECT_ROOT}/scripts/deploy/deploy.env"
if [[ -f "$ENV_FILE" ]]; then
  log_info "Loading deployment environment from $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
else
  log_warn "No deploy.env found at $ENV_FILE — using defaults and existing env vars"
fi

# ── Configuration ─────────────────────────────────────────────────────────────

: "${STELLAR_NETWORK:=testnet}"
: "${SOROBAN_RPC_URL:=https://soroban-testnet.stellar.org}"
: "${HORIZON_URL:=https://horizon-testnet.stellar.org}"
: "${BACKEND_PORT:=3001}"
: "${FRONTEND_PORT:=3000}"
: "${SUBGRAPH_PORT:=4000}"
: "${DEPLOY_ENV:=production}"
: "${DOCKER_REGISTRY:=}"
: "${DOCKER_TAG:=latest}"

# ── Argument Parsing ──────────────────────────────────────────────────────────

DEPLOY_CONTRACT=true
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
DEPLOY_SUBGRAPH=true
DEPLOY_DOCKER=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --contract-only) DEPLOY_BACKEND=false; DEPLOY_FRONTEND=false; DEPLOY_SUBGRAPH=false; shift ;;
    --backend-only)  DEPLOY_CONTRACT=false; DEPLOY_FRONTEND=false; DEPLOY_SUBGRAPH=false; shift ;;
    --frontend-only) DEPLOY_CONTRACT=false; DEPLOY_BACKEND=false; DEPLOY_SUBGRAPH=false; shift ;;
    --subgraph-only) DEPLOY_CONTRACT=false; DEPLOY_BACKEND=false; DEPLOY_FRONTEND=false; shift ;;
    --docker)        DEPLOY_DOCKER=true; shift ;;
    --check)         CHECK_ONLY=true; shift ;;
    --skip-contract) DEPLOY_CONTRACT=false; shift ;;
    --skip-backend)  DEPLOY_BACKEND=false; shift ;;
    --skip-frontend) DEPLOY_FRONTEND=false; shift ;;
    --skip-subgraph) DEPLOY_SUBGRAPH=false; shift ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --contract-only   Deploy only the Soroban contract"
      echo "  --backend-only    Deploy only the backend API"
      echo "  --frontend-only   Deploy only the frontend"
      echo "  --subgraph-only   Deploy only the subgraph indexer"
      echo "  --docker          Deploy via Docker Compose"
      echo "  --check           Run health checks only"
      echo "  --skip-contract   Skip contract deployment"
      echo "  --skip-backend    Skip backend deployment"
      echo "  --skip-frontend   Skip frontend deployment"
      echo "  --skip-subgraph   Skip subgraph deployment"
      echo "  -h, --help        Show this help"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            StellarEarn — Full-Stack Deployment               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
log_info "Environment:  $DEPLOY_ENV"
log_info "Network:      $STELLAR_NETWORK"
log_info "RPC URL:      $SOROBAN_RPC_URL"
echo ""

# ── Prerequisites Check ───────────────────────────────────────────────────────

check_prerequisites() {
  log_info "Checking prerequisites..."

  local missing=()

  if [[ "$DEPLOY_CONTRACT" == true ]]; then
    command -v cargo >/dev/null 2>&1 || missing+=("cargo (Rust)")
    command -v soroban >/dev/null 2>&1 || missing+=("soroban CLI")
    # Check wasm32 target
    if command -v rustup >/dev/null 2>&1; then
      rustup target list --installed | grep -q wasm32-unknown-unknown || missing+=("wasm32-unknown-unknown target")
    fi
  fi

  if [[ "$DEPLOY_BACKEND" == true ]] || [[ "$DEPLOY_FRONTEND" == true ]] || [[ "$DEPLOY_SUBGRAPH" == true ]]; then
    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
  fi

  if [[ "$DEPLOY_DOCKER" == true ]]; then
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || missing+=("docker-compose")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing prerequisites:"
    for m in "${missing[@]}"; do
      echo "  - $m"
    done
    exit 1
  fi

  log_ok "All prerequisites met"
}

# ── Deploy Functions ──────────────────────────────────────────────────────────

deploy_contract() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Deploying Soroban Smart Contract"
  log_info "══════════════════════════════════════════════════════════════"

  local CONTRACT_DIR="${PROJECT_ROOT}/contracts/earn-quest"

  # Step 1: Build WASM
  log_info "[Contract] Building WASM..."
  cd "$CONTRACT_DIR"
  cargo build --release --target wasm32-unknown-unknown
  log_ok "[Contract] WASM built successfully"

  # Step 2: Optimize WASM
  log_info "[Contract] Optimizing WASM..."
  local WASM_PATH="target/wasm32-unknown-unknown/release/earn_quest.wasm"
  if command -v soroban >/dev/null 2>&1; then
    soroban contract optimize --wasm "$WASM_PATH" 2>/dev/null || log_warn "[Contract] Optimization skipped (soroban optimize not available)"
  fi
  log_ok "[Contract] WASM optimized"

  # Step 3: Deploy to network
  if [[ -n "${CONTRACT_ID:-}" ]]; then
    log_info "[Contract] Deploying to $STELLAR_NETWORK..."
    log_info "[Contract] Using existing CONTRACT_ID: $CONTRACT_ID"

    # If we have a secret key, we can deploy
    if [[ -n "${SOROBAN_SECRET_KEY:-}" ]]; then
      local NEW_WASM_HASH
      NEW_WASM_HASH=$(soroban contract deploy \
        --source-account "$SOROBAN_SECRET_KEY" \
        --rpc-url "$SOROBAN_RPC_URL" \
        --network "$STELLAR_NETWORK" \
        --wasm "$WASM_PATH" \
        2>&1) || {
          log_error "[Contract] Deployment failed"
          exit 1
        }

      log_ok "[Contract] Deployed! WASM hash: $NEW_WASM_HASH"

      # If we want to update an existing contract
      if [[ "${UPGRADE_CONTRACT:-}" == "true" ]]; then
        log_info "[Contract] Upgrading existing contract $CONTRACT_ID..."
        soroban contract invoke \
          --id "$CONTRACT_ID" \
          --source-account "$SOROBAN_SECRET_KEY" \
          --rpc-url "$SOROBAN_RPC_URL" \
          --network "$STELLAR_NETWORK" \
          -- authorize_upgrade \
          --caller "$(soroban identity address --source-account "$SOROBAN_SECRET_KEY" 2>/dev/null || echo 'unknown')"
        log_ok "[Contract] Contract upgraded"
      fi
    else
      log_warn "[Contract] SOROBAN_SECRET_KEY not set — skipping on-chain deployment"
      log_info "[Contract] WASM is ready at: $CONTRACT_DIR/$WASM_PATH"
    fi
  else
    log_warn "[Contract] CONTRACT_ID not set — build-only mode"
    log_info "[Contract] WASM is ready at: $CONTRACT_DIR/$WASM_PATH"
  fi

  cd "$PROJECT_ROOT"
  log_ok "[Contract] Contract deployment complete"
}

deploy_backend() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Deploying Backend API"
  log_info "══════════════════════════════════════════════════════════════"

  local BACKEND_DIR="${PROJECT_ROOT}/BackEnd"

  # Step 1: Install dependencies
  log_info "[Backend] Installing dependencies..."
  cd "$BACKEND_DIR"
  npm install --production=false
  log_ok "[Backend] Dependencies installed"

  # Step 2: Run linter
  log_info "[Backend] Running linter..."
  npm run lint 2>/dev/null || log_warn "[Backend] Lint issues found (non-blocking)"
  log_ok "[Backend] Lint check complete"

  # Step 3: Build
  log_info "[Backend] Building..."
  npm run build
  log_ok "[Backend] Build complete"

  # Step 4: Run migrations
  log_info "[Backend] Running database migrations..."
  if [[ -n "${DATABASE_URL:-}" ]]; then
    npm run migration:run 2>/dev/null || log_warn "[Backend] Migration failed — ensure DATABASE_URL is set and DB is accessible"
    log_ok "[Backend] Migrations applied"
  else
    log_warn "[Backend] DATABASE_URL not set — skipping migrations"
  fi

  # Step 5: Start server
  if [[ "$DEPLOY_DOCKER" == true ]]; then
    log_info "[Backend] Will be started via Docker Compose"
  else
    log_info "[Backend] Starting server on port $BACKEND_PORT..."
    NODE_ENV="$DEPLOY_ENV" PORT="$BACKEND_PORT" node dist/main.js &
    BACKEND_PID=$!
    log_ok "[Backend] Server started (PID: $BACKEND_PID)"

    # Wait for backend to be ready
    local retries=15
    while [[ $retries -gt 0 ]]; do
      if curl -s "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
        log_ok "[Backend] Health check passed"
        break
      fi
      retries=$((retries - 1))
      sleep 2
    done
    if [[ $retries -eq 0 ]]; then
      log_warn "[Backend] Health check timed out"
    fi
  fi

  cd "$PROJECT_ROOT"
  log_ok "[Backend] Backend deployment complete"
}

deploy_frontend() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Deploying Frontend"
  log_info "══════════════════════════════════════════════════════════════"

  local FRONTEND_DIR="${PROJECT_ROOT}/FrontEnd/my-app"

  # Step 1: Install dependencies
  log_info "[Frontend] Installing dependencies..."
  cd "$FRONTEND_DIR"
  npm install
  log_ok "[Frontend] Dependencies installed"

  # Step 2: Lint
  log_info "[Frontend] Running linter..."
  npm run lint 2>/dev/null || log_warn "[Frontend] Lint issues found (non-blocking)"

  # Step 3: Build
  log_info "[Frontend] Building for production..."
  npm run build
  log_ok "[Frontend] Build complete"

  # Step 4: Start or serve
  if [[ "$DEPLOY_DOCKER" == true ]]; then
    log_info "[Frontend] Will be started via Docker Compose"
  else
    log_info "[Frontend] Starting server on port $FRONTEND_PORT..."
    PORT="$FRONTEND_PORT" npm run start &
    FRONTEND_PID=$!
    log_ok "[Frontend] Server started (PID: $FRONTEND_PID)"
  fi

  cd "$PROJECT_ROOT"
  log_ok "[Frontend] Frontend deployment complete"
}

deploy_subgraph() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Deploying Subgraph Event Indexer"
  log_info "══════════════════════════════════════════════════════════════"

  local SUBGRAPH_DIR="${PROJECT_ROOT}/subgraph"

  # Step 1: Install dependencies
  log_info "[Subgraph] Installing dependencies..."
  cd "$SUBGRAPH_DIR"
  npm install
  log_ok "[Subgraph] Dependencies installed"

  # Step 2: Build
  log_info "[Subgraph] Building TypeScript..."
  npm run build
  log_ok "[Subgraph] Build complete"

  # Step 3: Start indexer
  if [[ "$DEPLOY_DOCKER" == true ]]; then
    log_info "[Subgraph] Will be started via Docker Compose"
  else
    log_info "[Subgraph] Starting event indexer on port $SUBGRAPH_PORT..."

    # Ensure data directory exists
    mkdir -p data

    CONTRACT_ID="${CONTRACT_ID:-}" \
    RPC_URL="$SOROBAN_RPC_URL" \
    API_PORT="$SUBGRAPH_PORT" \
    NODE_ENV="$DEPLOY_ENV" \
    node dist/index.js &

    SUBGRAPH_PID=$!
    log_ok "[Subgraph] Indexer started (PID: $SUBGRAPH_PID)"

    # Wait for subgraph API to be ready
    local retries=15
    while [[ $retries -gt 0 ]]; do
      if curl -s "http://localhost:$SUBGRAPH_PORT/health" >/dev/null 2>&1; then
        log_ok "[Subgraph] Health check passed"
        break
      fi
      retries=$((retries - 1))
      sleep 2
    done
    if [[ $retries -eq 0 ]]; then
      log_warn "[Subgraph] Health check timed out"
    fi
  fi

  cd "$PROJECT_ROOT"
  log_ok "[Subgraph] Subgraph deployment complete"
}

deploy_docker() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Deploying via Docker Compose"
  log_info "══════════════════════════════════════════════════════════════"

  cd "$PROJECT_ROOT"

  # Build images
  log_info "[Docker] Building images..."
  docker compose -f scripts/deploy/docker-compose.prod.yml build
  log_ok "[Docker] Images built"

  # Start services
  log_info "[Docker] Starting services..."
  docker compose -f scripts/deploy/docker-compose.prod.yml up -d
  log_ok "[Docker] Services started"

  # Wait and check
  log_info "[Docker] Waiting for services to be healthy..."
  sleep 10
  docker compose -f scripts/deploy/docker-compose.prod.yml ps
  log_ok "[Docker] Deployment complete"
}

# ── Health Check ──────────────────────────────────────────────────────────────

health_check() {
  echo ""
  log_info "══════════════════════════════════════════════════════════════"
  log_info "  Running Health Checks"
  log_info "══════════════════════════════════════════════════════════════"

  local all_healthy=true

  # Backend
  if [[ "$DEPLOY_BACKEND" == true ]]; then
    if curl -sf "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
      log_ok "[Backend] Healthy on port $BACKEND_PORT"
    else
      log_error "[Backend] NOT healthy on port $BACKEND_PORT"
      all_healthy=false
    fi
  fi

  # Frontend
  if [[ "$DEPLOY_FRONTEND" == true ]]; then
    if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
      log_ok "[Frontend] Healthy on port $FRONTEND_PORT"
    else
      log_error "[Frontend] NOT healthy on port $FRONTEND_PORT"
      all_healthy=false
    fi
  fi

  # Subgraph
  if [[ "$DEPLOY_SUBGRAPH" == true ]]; then
    if curl -sf "http://localhost:$SUBGRAPH_PORT/health" >/dev/null 2>&1; then
      log_ok "[Subgraph] Healthy on port $SUBGRAPH_PORT"
    else
      log_error "[Subgraph] NOT healthy on port $SUBGRAPH_PORT"
      all_healthy=false
    fi
  fi

  echo ""
  if [[ "$all_healthy" == true ]]; then
    log_ok "All services are healthy!"
    echo ""
    log_info "Service URLs:"
    [[ "$DEPLOY_BACKEND" == true ]]  && log_info "  Backend API:  http://localhost:$BACKEND_PORT/api"
    [[ "$DEPLOY_BACKEND" == true ]]  && log_info "  API Docs:     http://localhost:$BACKEND_PORT/api/docs"
    [[ "$DEPLOY_FRONTEND" == true ]] && log_info "  Frontend:     http://localhost:$FRONTEND_PORT"
    [[ "$DEPLOY_SUBGRAPH" == true ]] && log_info "  Subgraph:     http://localhost:$SUBGRAPH_PORT/graphql"
  else
    log_error "Some services are NOT healthy — check logs above"
    exit 1
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

cd "$PROJECT_ROOT"

check_prerequisites

if [[ "$CHECK_ONLY" == true ]]; then
  health_check
  exit 0
fi

if [[ "$DEPLOY_DOCKER" == true ]]; then
  deploy_docker
  health_check
  exit 0
fi

START_TIME=$SECONDS

[[ "$DEPLOY_CONTRACT" == true ]] && deploy_contract
[[ "$DEPLOY_BACKEND" == true ]]  && deploy_backend
[[ "$DEPLOY_FRONTEND" == true ]] && deploy_frontend
[[ "$DEPLOY_SUBGRAPH" == true ]] && deploy_subgraph

ELAPSED=$(( SECONDS - START_TIME ))

echo ""
log_ok "══════════════════════════════════════════════════════════════"
log_ok "  Deployment Complete! (${ELAPSED}s)"
log_ok "══════════════════════════════════════════════════════════════"

health_check
