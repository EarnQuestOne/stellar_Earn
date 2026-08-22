# Script Inventory

This document is the working inventory for repository-maintained scripts. It exists to answer three practical questions quickly:

- what the script is for
- who should maintain it
- where it is in its lifecycle

## How To Use This Inventory

- Treat `Owner` as the team or function that should review changes first. If your repository later adopts named code owners, update this document to match.
- Treat `Lifecycle` as operational guidance, not just historical context.
- Update this file whenever you add, rename, deprecate, or remove a script.

## Lifecycle Definitions

| Lifecycle | Meaning |
|----------|---------|
| Active | Expected to be used in normal development or deployment workflows. |
| Active - Manual | Supported, but intended for operator-triggered or one-off use instead of day-to-day automation. |
| Verification | Used to validate another script or workflow. |
| Transitional | Kept temporarily while the repo is moving from an older workflow to a newer one. Remove or replace when the migration is complete. |
| Deprecated | Retained only for compatibility or short-term rollback. Avoid new usage and plan removal. |

## Inventory

| Script | Purpose | Owner | Lifecycle | Notes |
|-------|---------|-------|-----------|-------|
| `scripts/dev_setup.sh` | Checks for `rustup` installation and ensures a default Rust toolchain is set (sets to stable if missing); prevents cryptic onboarding and build errors for Rust projects. | Platform Engineering / Developer Experience | Active | Run before local building or testing to ensure Rust prerequisites. Announced in developer docs. New as of [SC-062]. |
| `scripts/audit-dependencies.sh` | Runs Rust and Node dependency audits, including `cargo audit`, `cargo deny`, `cargo outdated`, and `npm audit`, then optionally writes a report. | Security / Platform Engineering | Active | Local security-maintenance utility. Keep aligned with `.github/workflows/dependency-audit.yml` and [docs/dependency-audit.md](/Users/macbook/stellar/stellar_Earn/docs/dependency-audit.md:1). |
| `scripts/build-windows.ps1` | Bootstraps a Windows machine for Soroban contract builds by installing build tools, Rust, the WASM target, and running a verification build. | Contract Engineering / Developer Experience | Transitional | The script still points at an older `Contract` path layout. Update it when Windows support is actively maintained, or deprecate it if the repo standardizes on another setup path. |
| `scripts/check-contract-changelog-discipline.js` | Verifies that contract implementation changes update `contracts/earn-quest/CHANGELOG.md`, and that breaking changes include matching metadata plus a structured unreleased changelog entry. | Contract Engineering / Developer Experience | Active | CI policy guard used by `.github/workflows/ci.yml`. Keep aligned with the PR template and `contracts/earn-quest/docs/CHANGELOG_DISCIPLINE.md`. |
| `BackEnd/scripts/benchmark-moderation-config-cache.ts` | Compares repeated moderation threshold source reads with the in-memory moderation config snapshot and reports timing, throughput, and source-read counts. | Backend Engineering | Verification | Run with `cd BackEnd && npm run benchmark:moderation-config`; update `BackEnd/docs/MODERATION_CONFIG_CACHE.md` when recording a new baseline. |
| `scripts/deploy/deploy.sh` | Orchestrates full-stack deployment across contract, backend, frontend, and subgraph services, with optional Docker and health-check flows. | Platform Engineering | Active - Manual | Use for coordinated environment bring-up. Review whenever deployment topology or environment variables change. |
| `scripts/deploy/deploy-backend.sh` | Builds, migrates, and starts the NestJS backend in a deployment-oriented flow. | Backend Engineering / Platform Engineering | Active - Manual | Intended for operator use in controlled environments. Keep in sync with backend build, migration, and health-check commands. |
| `scripts/deploy/deploy-contract.sh` | Builds and optionally deploys or upgrades the Soroban contract, then supports post-deploy initialization. | Contract Engineering / Platform Engineering | Active - Manual | The main operator script for contract deployment. Keep aligned with the contract’s upgrade and initialization APIs. |
| `scripts/deploy/migrate-contract-storage.mjs` | Migrates exported contract state snapshots to the current storage schema, with a safe `--dry-run` preview mode and explicit write mode. | Contract Engineering | Active - Manual | Snapshot-based by design because on-chain storage cannot be enumerated safely for bulk migration. Keep aligned with contract storage schema docs and migration guides. |
| `scripts/deploy/migrate-contract-storage.test.mjs` | Tests the storage migration utility’s planning, dry-run safety, and write behavior. | Contract Engineering | Verification | Run with `node --test scripts/deploy/migrate-contract-storage.test.mjs` when changing the migration utility. |
| `contracts/earn-quest/update-snapshots.sh` | Automates snapshot backup, cleanup, regeneration, restore, and verification for contract tests. | Contract Engineering | Active | Developer workflow utility used by the contract `Makefile`. Keep aligned with snapshot conventions and test feature flags. |
| `contracts/earn-quest/test-snapshot-script.sh` | Smoke-tests the snapshot automation workflow and related documentation wiring. | Contract Engineering | Verification | Useful after editing snapshot automation or onboarding docs. Not part of the main contract runtime or deploy flow. |
| `contracts/earn-quest/examples/indexer-example.ts` | Demonstrates how downstream indexer consumers can interact with contract events or data patterns. | Contract Engineering / Data Engineering | Active - Manual | This is an example script rather than operational automation. Keep it accurate enough to serve as reference code, or clearly mark it deprecated if the integration model changes. |

## Ownership Guidelines

- `Platform Engineering` owns scripts that shape deploy, release, environment bootstrap, or cross-stack operations.
- `Contract Engineering` owns scripts tied to Soroban build, migration, snapshot, or schema workflows.
- `Backend Engineering` owns backend-specific operational scripts, usually alongside platform review when they affect deployment.
- `Security` should review changes to audit and dependency-health scripts.

## Update Checklist

When modifying or adding a script:

1. Update this inventory entry.
2. Confirm the script header or help text matches actual behavior.
3. Update related docs or Makefile targets.
4. Add or update a verification path when the script changes production-facing behavior.

## Gaps To Watch

- `scripts/build-windows.ps1` appears to reference an older contract directory layout and should be reviewed before relying on it.
- Deployment scripts are manual/operator-focused; if they become CI-critical, add automated verification around their expected command paths.
