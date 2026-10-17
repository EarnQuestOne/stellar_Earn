#!/usr/bin/env bash
# Confirm .env files are gitignored/untracked and scan the tree with gitleaks.
#
# Usage (from repo root):
#   bash scripts/secret-scan.sh              # env guard + gitleaks --no-git
#   bash scripts/secret-scan.sh --env-guard  # env guard only
#   bash scripts/secret-scan.sh --git-log <rev-range>
#       # env guard + current-tree scan + gitleaks git history for <rev-range>
#
# Requires: git. Gitleaks is required unless --env-guard is used.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_GUARD_ONLY=0
GIT_LOG_RANGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-guard)
      ENV_GUARD_ONLY=1
      shift
      ;;
    --git-log)
      GIT_LOG_RANGE="${2:-}"
      if [[ -z "$GIT_LOG_RANGE" ]]; then
        echo "error: --git-log requires a rev range (e.g. origin/main..HEAD)" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

fail() {
  echo "error: $*" >&2
  exit 1
}

echo "==> Confirming .env paths are gitignored"
for env_path in .env BackEnd/.env FrontEnd/my-app/.env subgraph/.env; do
  if ! git check-ignore -q "$env_path"; then
    fail "$env_path is not matched by .gitignore"
  fi
  echo "    ignored: $env_path"
done

echo "==> Confirming no dotenv files are tracked (except .env.example)"
leaked=0
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  base="$(basename "$file")"
  if [[ "$base" == ".env" || ( "$base" == .env.* && "$base" != ".env.example" ) ]]; then
    echo "    tracked: $file"
    leaked=1
  fi
done < <(git ls-files)

if [[ "$leaked" -ne 0 ]]; then
  fail "tracked dotenv files are not allowed; remove them from git and rotate any values they contained"
fi
echo "    none tracked"

if [[ "$ENV_GUARD_ONLY" -eq 1 ]]; then
  echo "env guard passed"
  exit 0
fi

if ! command -v gitleaks >/dev/null 2>&1; then
  fail "gitleaks is not installed (https://github.com/gitleaks/gitleaks/releases)"
fi

CONFIG="$ROOT/.gitleaks.toml"
[[ -f "$CONFIG" ]] || fail "missing $CONFIG"

echo "==> gitleaks detect --no-git (current tree)"
gitleaks detect \
  --source "$ROOT" \
  --config "$CONFIG" \
  --no-git \
  --redact \
  --verbose \
  --no-banner \
  --exit-code 1

if [[ -n "$GIT_LOG_RANGE" ]]; then
  echo "==> gitleaks detect --log-opts=$GIT_LOG_RANGE"
  gitleaks detect \
    --source "$ROOT" \
    --config "$CONFIG" \
    --log-opts="$GIT_LOG_RANGE" \
    --redact \
    --verbose \
    --no-banner \
    --exit-code 1
fi

echo "secret scan passed"
