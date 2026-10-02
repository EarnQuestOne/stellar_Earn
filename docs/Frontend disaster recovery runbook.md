# Frontend Disaster Recovery Runbook

**Project:** StellarEarn (`stellar_Earn`)  
**Scope:** `FrontEnd/` / `apps/web/` — Next.js App Router  
**Issue:** FE-079  
**Last Updated:** 2026-05-28

---

## Table of Contents

1. [Overview](#overview)
2. [Severity Levels](#severity-levels)
3. [Pre-Recovery Checklist](#pre-recovery-checklist)
4. [Scenario A — Broken Environment Variables](#scenario-a--broken-environment-variables)
5. [Scenario B — Failed / Broken Build](#scenario-b--failed--broken-build)
6. [Scenario C — Runtime Crash After Deployment](#scenario-c--runtime-crash-after-deployment)
7. [Scenario D — Wallet / Contract Integration Broken](#scenario-d--wallet--contract-integration-broken)
8. [Build Rollback Procedures](#build-rollback-procedures)
9. [Environment Variable Reference](#environment-variable-reference)
10. [Escalation Path](#escalation-path)
11. [Post-Incident Checklist](#post-incident-checklist)

---

## Overview

This runbook documents the steps to diagnose and recover from frontend failures in the StellarEarn platform. It covers broken environment configs, failed builds, and rollback procedures for staging and production deployments.

**Frontend stack:** Next.js (App Router), TypeScript, pnpm  
**Key integrations:** Stellar Soroban RPC, NestJS backend API, Freighter/Passkey wallet  
**Deployment targets:** Vercel (assumed) or self-hosted Node container

---

## Severity Levels

| Level  | Description                                                   | Response Time |
| ------ | ------------------------------------------------------------- | ------------- |
| **P0** | Production completely down — no page loads                    | Immediate     |
| **P1** | Core flows broken (wallet connect, quest submission, payouts) | < 1 hour      |
| **P2** | Feature degraded but workaround exists                        | < 4 hours     |
| **P3** | Non-blocking issue, docs/UI minor                             | Next sprint   |

---

## Pre-Recovery Checklist

Before taking any recovery action, capture the following:

```
[ ] Note the exact time the issue started
[ ] Record the last known-good commit SHA (git log --oneline -10)
[ ] Check deployment logs for the current build
[ ] Screenshot or copy any error messages
[ ] Confirm whether the issue affects staging, production, or both
[ ] Determine if a recent deployment or env change preceded the incident
```

---

## Scenario A — Broken Environment Variables

### Symptoms

- `ReferenceError: NEXT_PUBLIC_* is not defined` in browser console
- Blank/empty API base URL causing all API calls to fail
- Wallet connection silently failing (wrong network or missing contract ID)
- `500` errors on server-rendered pages that rely on server-side env vars

### Diagnosis

**1. Check which variables are missing or malformed:**

```bash
# In apps/web
cat .env.local | grep -v "^#" | grep -v "^$"
```

**2. Verify required variables are all present:**

```bash
# Compare against the example file
diff .env.local ../../.env.example
```

**3. For Vercel deployments — check the dashboard:**

- Go to **Project → Settings → Environment Variables**
- Confirm all required variables are set for the correct environment (Preview vs Production)
- Check for trailing spaces, missing quotes, or accidentally URL-encoded values

**4. Confirm `NEXT_PUBLIC_` prefix on client-exposed vars:**

```bash
# Variables accessed in browser MUST start with NEXT_PUBLIC_
grep -r "process.env\." apps/web/app --include="*.ts" --include="*.tsx" | grep -v "NEXT_PUBLIC_"
# Any hits here are server-only; verify they're only used in server components/route handlers
```

### Recovery Steps

**Step 1 — Local fix:**

```bash
cp ../../.env.example .env.local
# Fill in real values for your target environment:
nano .env.local
```

Required values to set (see [Environment Variable Reference](#environment-variable-reference)):

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://<testnet-rpc-endpoint>
NEXT_PUBLIC_CONTRACT_ID=<deployed-contract-id>
API_BASE_URL=http://localhost:3001
```

**Step 2 — Rebuild after env fix:**

```bash
cd apps/web
pnpm build
# Confirm no "Missing env" warnings in build output
```

**Step 3 — For production (Vercel):**

1. Update environment variables in the Vercel dashboard
2. Trigger a redeploy: `vercel --prod` or click **Redeploy** in the dashboard
3. Do **not** redeploy from cache — force a fresh build to pick up new env vars

**Step 4 — Verify:**

```bash
# After deploy, check the live app console for env errors
# Also verify the network banner in the UI shows the correct network (testnet/mainnet)
```

---

## Scenario B — Failed / Broken Build

### Symptoms

- CI/CD pipeline fails at the `pnpm build` step
- TypeScript compilation errors blocking deployment
- Missing module errors (`Module not found: Can't resolve '...'`)
- `next build` exits with non-zero code

### Diagnosis

**1. Reproduce locally:**

```bash
cd apps/web
pnpm install --frozen-lockfile
pnpm build 2>&1 | tee /tmp/build-output.txt
```

**2. Check for TypeScript errors:**

```bash
pnpm typecheck
```

**3. Check for lint errors:**

```bash
pnpm lint
```

**4. Check for dependency issues:**

```bash
pnpm install --frozen-lockfile
# If lockfile is out of sync:
pnpm install
git diff pnpm-lock.yaml
```

### Common Build Failures & Fixes

#### Missing peer dependencies

```bash
pnpm install --frozen-lockfile
# Or if lockfile is stale:
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### TypeScript errors after a merge

```bash
# Identify the failing file(s)
pnpm typecheck 2>&1 | grep "error TS"

# Common fixes:
# 1. Regenerate Prisma/contract types if schema changed
cd ../api && pnpm prisma generate

# 2. If stellar SDK types changed, update imports
pnpm update @stellar/stellar-sdk
```

#### Next.js cache corruption

```bash
cd apps/web
rm -rf .next
pnpm build
```

#### Build fails only in CI (passes locally)

Check that CI environment variables match local `.env.local`. CI often requires vars explicitly set in the pipeline configuration (GitHub Actions secrets or Vercel env).

```yaml
# In .github/workflows — ensure these are set:
env:
  NEXT_PUBLIC_STELLAR_NETWORK: ${{ secrets.NEXT_PUBLIC_STELLAR_NETWORK }}
  NEXT_PUBLIC_SOROBAN_RPC_URL: ${{ secrets.NEXT_PUBLIC_SOROBAN_RPC_URL }}
  NEXT_PUBLIC_CONTRACT_ID: ${{ secrets.NEXT_PUBLIC_CONTRACT_ID }}
```

---

## Scenario C — Runtime Crash After Deployment

### Symptoms

- `500 Internal Server Error` on page load
- Hydration mismatch errors in the browser console
- App loads but immediately shows an error boundary
- Wallet connect button unresponsive

### Diagnosis

**1. Check Vercel/server function logs for the failing request**

**2. Check browser console for hydration errors:**

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

This typically means a component is using browser-only APIs (e.g. `window`, `localStorage`) without guarding against SSR.

**3. Check if the crash is route-specific or global:**

- If only `/quests` crashes → issue in that page or its data fetching
- If all pages crash → likely a layout component or global provider issue

### Recovery Steps

**For hydration mismatches:**

```tsx
// Wrap browser-only code in useEffect or dynamic import
import dynamic from "next/dynamic";

const WalletConnect = dynamic(() => import("@/components/WalletConnect"), {
  ssr: false,
});
```

**For server-side crashes — roll back immediately** (see [Build Rollback Procedures](#build-rollback-procedures)), then diagnose in staging.

---

## Scenario D — Wallet / Contract Integration Broken

### Symptoms

- Freighter wallet extension not detected
- `Contract ID not found` or `RPC connection failed`
- Transaction submission returns unexpected errors
- Wrong network (mainnet vs testnet mismatch)

### Diagnosis

```bash
# Check which network the frontend is pointing to
grep NEXT_PUBLIC_STELLAR_NETWORK apps/web/.env.local
grep NEXT_PUBLIC_CONTRACT_ID apps/web/.env.local

# Verify the contract is actually deployed on that network
soroban contract fetch --id $CONTRACT_ID --network $STELLAR_NETWORK
```

### Recovery Steps

**1. Network mismatch:**

Update `.env.local` (or Vercel env vars) to point to the correct network and redeploy.

**2. Stale contract ID after redeployment:**

```bash
# After redeploying the contract:
export NEW_CONTRACT_ID=$(soroban contract deploy ... )

# Update env
sed -i "s/NEXT_PUBLIC_CONTRACT_ID=.*/NEXT_PUBLIC_CONTRACT_ID=$NEW_CONTRACT_ID/" apps/web/.env.local

# Rebuild
pnpm build
```

**3. RPC endpoint down:**

Swap to a fallback RPC URL. Refer to [Stellar Developer Docs](https://developers.stellar.org/) for public testnet endpoints.

---

## Build Rollback Procedures

### Option 1 — Vercel Instant Rollback (Recommended for production)

1. Open Vercel dashboard → **Deployments** tab
2. Find the last known-good deployment (look for the green "Ready" badge)
3. Click the three-dot menu → **Promote to Production**
4. Confirm — Vercel instantly switches traffic. No rebuild required.

### Option 2 — Git Revert + Redeploy

```bash
# Find the last good commit
git log --oneline -20

# Option A: revert the bad commit (creates a new commit, safe for shared branches)
git revert <bad-commit-sha>
git push origin main

# Option B: reset (only if you haven't shared the bad commit widely)
git reset --hard <last-good-sha>
git push --force-with-lease origin main
```

### Option 3 — Manual build from a known-good SHA

```bash
# Checkout the known-good state
git checkout <last-good-sha>

cd apps/web
pnpm install --frozen-lockfile
pnpm build

# Deploy the output manually
vercel deploy --prebuilt --prod
```

### Verifying a Rollback

After rolling back, verify:

```
[ ] Home page loads without errors
[ ] Wallet connect button is functional
[ ] Quest list loads from the API
[ ] No errors in browser console
[ ] No errors in server/edge function logs
[ ] STELLAR_NETWORK banner shows the expected network
```

---

## Environment Variable Reference

| Variable                        | Scope       | Required | Description                           |
| ------------------------------- | ----------- | -------- | ------------------------------------- |
| `NEXT_PUBLIC_STELLAR_NETWORK`   | Client      | ✅       | `testnet` or `mainnet`                |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`   | Client      | ✅       | Soroban RPC endpoint URL              |
| `NEXT_PUBLIC_CONTRACT_ID`       | Client      | ✅       | Deployed earn-quest contract address  |
| `API_BASE_URL`                  | Server-side | ✅       | NestJS backend base URL               |
| `NEXT_PUBLIC_ISSUER_PUBLIC_KEY` | Client      | Optional | Reward asset issuer key (for display) |

> **Important:** Variables prefixed `NEXT_PUBLIC_` are embedded in the client bundle at build time. Changing them requires a full rebuild — a runtime update to Vercel env vars alone is not sufficient.

---

## Escalation Path

| Step | Action                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1    | On-call frontend engineer attempts fix using this runbook                                       |
| 2    | If unresolved in 30 min (P0) or 2 hours (P1), escalate to tech lead                             |
| 3    | If related to smart contract state, loop in the Soroban/contracts team                          |
| 4    | If infrastructure issue (RPC down, Vercel outage), check status pages and open a support ticket |

**Relevant status pages:**

- Vercel: https://www.vercel-status.com/
- Stellar/Soroban testnet: https://dashboard.stellar.org/

---

## Post-Incident Checklist

After the incident is resolved:

```
[ ] Document root cause in the incident log or GitHub issue
[ ] Update .env.example if a new variable was added
[ ] Add or update tests to catch the regression
[ ] Add a CI check if the build gap was caught late
[ ] Update this runbook if a new failure pattern was discovered
[ ] Close or comment on the GitHub issue with resolution notes
```

---

_This runbook is a living document. If you encounter a failure pattern not covered here, add a new scenario and open a PR._
