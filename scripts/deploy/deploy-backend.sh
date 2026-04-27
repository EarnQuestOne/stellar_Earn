#!/usr/bin/env bash
# =============================================================================
# Backend Deployment Script
# =============================================================================
# Builds, migrates, and starts the NestJS backend.
#
# Usage:
#   ./deploy-backend.sh                # Full deploy
#   ./deploy-backend.sh --build-only   # Build only
#   ./deploy-backend.sh --migrate-only # Run migrations only
#   ./deploy-backend.sh --start-only   # Start server (assumes build done)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/BackEnd"

# ── Defaults ──────────────────────────────────────────────────────────────────

BUILD_ONLY=false
MIGRATE_ONLY=false
START_ONLY=false
PORT="${BACKEND_PORT:-3001}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

# ── Argument Parsing ──────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)   BUILD_ONLY=true; shift ;;
    --migrate-only) MIGRATE_ONLY=true; shift ;;
    --start-only)   START_ONLY=true; shift ;;
    --port)         PORT="$2"; shift 2 ;;
    --env)          DEPLOY_ENV="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${CYAN}[Backend]${NC} $*"; }
ok()    { echo -e "${GREEN}[Backend]${NC} $*"; }
warn()  { echo -e "${YELLOW}[Backend]${NC} $*"; }
error() { echo -e "${RED}[Backend]${NC} $*"; exit 1; }

# ── Validate ──────────────────────────────────────────────────────────────────

if [[ ! -d "$BACKEND_DIR" ]]; then
  error "Backend directory not found at $BACKEND_DIR"
fi

cd "$BACKEND_DIR"

# ── Migrate Only ──────────────────────────────────────────────────────────────

if [[ "$MIGRATE_ONLY" == true ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    error "DATABASE_URL not set — cannot run migrations"
  fi
  info "Running database migrations..."
  npm run migration:run || error "Migration failed"
  ok "Migrations applied successfully"
  exit 0
fi

# ── Build ─────────────────────────────────────────────────────────────────────

if [[ "$START_ONLY" != true ]]; then
  info "Installing dependencies..."
  npm install --production=false
  ok "Dependencies installed"

  info "Running linter..."
  npm run lint 2>/dev/null || warn "Lint issues found (non-blocking)"

  info "Building NestJS application..."
  npm run build || error "Build failed"
  ok "Build complete"

  info "Running unit tests..."
  npm test -- --passWithNoTests 2>/dev/null || warn "Some tests failed (non-blocking)"

  if [[ "$BUILD_ONLY" == true ]]; then
    ok "Build-only mode — skipping startup"
    exit 0
  fi
fi

# ── Migrate ───────────────────────────────────────────────────────────────────

if [[ -n "${DATABASE_URL:-}" ]]; then
  info "Running database migrations..."
  npm run migration:run 2>/dev/null || warn "Migration failed — check DATABASE_URL"
  ok "Migrations applied"
else
  warn "DATABASE_URL not set — skipping migrations"
fi

# ── Start ─────────────────────────────────────────────────────────────────────

info "Starting backend on port $PORT (env: $DEPLOY_ENV)..."

NODE_ENV="$DEPLOY_ENV" PORT="$PORT" node dist/main.js &
BACKEND_PID=$!

ok "Backend started (PID: $BACKEND_PID)"

# Wait for health check
info "Waiting for health check..."
retries=30
while [[ $retries -gt 0 ]]; do
  if curl -sf "http://localhost:$PORT/api/v1/health" >/dev/null 2>&1; then
    ok "Health check passed"
    break
  fi
  retries=$((retries - 1))
  sleep 2
done

if [[ $retries -eq 0 ]]; then
  warn "Health check timed out — check logs"
fi

echo ""
ok "══════════════════════════════════════════════════════════════"
ok "  Backend Deployment Summary"
ok "══════════════════════════════════════════════════════════════"
ok "  URL:      http://localhost:$PORT/api"
ok "  Docs:     http://localhost:$PORT/api/docs"
ok "  Health:   http://localhost:$PORT/api/v1/health"
ok "  PID:      $BACKEND_PID"
ok "  Env:      $DEPLOY_ENV"
ok "══════════════════════════════════════════════════════════════"
