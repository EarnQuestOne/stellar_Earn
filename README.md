# StellarEarn

> A quest-based earning platform that turns work into achievements on the Stellar blockchain

## Overview

StellarEarn is a quest-based earning platform where teams define tasks ("quests"), contributors complete them, and rewards are distributed on-chain via Stellar smart contracts (Soroban). Users level up by completing quests, building an on-chain reputation trail and unlocking higher-value opportunities.

### What It Does

- **Create & manage quests** with criteria, rewards, deadlines, and proof requirements
- **Complete & verify quests** with off-chain signals (API, GitHub webhooks, form attestations) and on-chain validation
- **Distribute rewards** programmatically to contributors via Stellar assets
- **Track reputation and progress** with XP and badges captured through contract state

### Goals

- Provide a trust-minimized, low-fee, and fast-settlement reward system
- Align incentives for open-source projects, DAOs, and distributed teams
- Leverage Stellar's strengths in payments, asset issuance, and on/off-ramps

## Why Stellar?

**Payments-first chain**: Stellar was designed for fast, low-cost asset transfers and global remittances, making it ideal for frequent micro-reward payouts.

**Asset issuance & compliance-friendly design**: Projects can issue reward tokens or use existing assets with built-in trustlines and anchors to access real-world on/off-ramps.

**Soroban smart contracts**: Modern, Rust-based contracts bring programmability to Stellar, enabling verifiable task completion, escrow, and conditional payouts with deterministic execution and safety-focused tooling.

Learn more: [Stellar Developers](https://developers.stellar.org/) | [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)

## Who Is It For?

- **Open-source communities & maintainers** who want to reward contributors transparently
- **DAOs & Web3 communities** running bounty boards or seasonal quests
- **Startups & product teams** incentivizing internal milestones or growth tasks
- **Education & talent platforms** that issue credentials and micro-grants for verifiable learning

## Key Features

- 🧭 **Quest management** — create, assign, and track task progress
- 🧩 **Flexible verification** — off-chain attestations, API checks, or multi-sig approvals
- 💸 **On-chain payouts** — rewards via Stellar assets (stablecoins or project tokens)
- 🛡️ **Escrow & conditions** — release rewards only when criteria are met
- ⭐ **Reputation & levels** — XP, badges, and a provable on-chain record
- 🌐 **Multi-network support** — local sandbox, testnet, or mainnet-ready configs

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  FrontEnd/my-app │      │   BackEnd        │      │  contracts/      │
│  Next.js         │◄────►│   NestJS         │◄────►│  earn-quest      │
│  (App Router)    │      │  (REST + TypeORM)│      │  Soroban (Rust)  │
│ • Dashboard      │      │ • Auth & RBAC    │      │ • Quest registry │
│ • Quest browser  │      │ • Quest/Payout   │      │ • Escrow/Payout  │
│ • Submissions    │      │ • Webhooks/Jobs  │      │ • Reputation     │
│ • Wallet connect │      │ • Postgres+Redis │      │ • Dispute/Oracle │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

- **FrontEnd/my-app** — Next.js (App Router) web client; wallet connect, quest browsing, submissions, dashboards. Tested with Vitest + Playwright (a11y).
- **BackEnd** — NestJS API using **TypeORM** (PostgreSQL) and **Redis/BullMQ** for background jobs; auth, quests, submissions, payouts, webhooks, notifications, moderation, analytics, etc. Tested with Jest.
- **contracts/earn-quest** — the Soroban (Rust) smart contract: quest registry, escrow, payout, reputation, disputes, oracle. Tested with `cargo test`.

### High-Level Flow

1. An admin creates a quest (the API persists off-chain metadata; the contract registers the reward logic and escrow).
2. A contributor submits proof; the API verifies it (webhooks / API checks) and invokes the contract.
3. The contract validates, transitions state, and releases the payout in Stellar assets.
4. The UI reflects on-chain state + off-chain metadata; the contributor's reputation/XP updates.

## Repository Structure

```
stellar_Earn/
├── BackEnd/                     # NestJS API (TypeORM + PostgreSQL + Redis/BullMQ)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/             # logger, tracing, guards, interceptors, filters
│   │   ├── database/
│   │   │   ├── data-source.ts  # TypeORM DataSource (migrations CLI target)
│   │   │   └── migrations/     # TypeORM migrations
│   │   └── modules/            # auth, quests, submissions, payouts, stellar,
│   │                           # webhooks, notifications, moderation, jobs, ...
│   ├── test/                   # e2e / integration Jest configs
│   ├── docker-compose.yml      # local Postgres 15 + Redis 7
│   └── .env.example
├── FrontEnd/my-app/            # Next.js (App Router) web client
│   ├── app/                    # routes (locale-aware)
│   ├── components/             # quest, submission, rewards, admin, wallet, ...
│   ├── context/  lib/  store/  # wallet context, API client, hooks, state
│   └── .env.example
├── contracts/earn-quest/       # Soroban / Rust smart contract
│   ├── src/                    # lib.rs, escrow.rs, payout.rs, dispute.rs, ...
│   ├── tests/                  # integration tests
│   ├── Makefile / Justfile     # build / test / deploy helpers
│   └── Cargo.toml
├── docs/                       # architecture, security, testing, API notes
├── scripts/                    # repo-level scripts
├── subgraph/                   # indexer
└── .github/                    # CI workflows, issue/PR templates, CODEOWNERS
```

## Getting Started

### Prerequisites

- **Node.js ≥ 20** (CI uses Node 20)
- **Bun ≥ 1.1** — the backend's TypeORM/migration scripts invoke `bun run …`
- **Rust (stable)** + the `wasm32-unknown-unknown` target, and the **Stellar CLI** (`stellar`) for the contract
- **Docker** (for local PostgreSQL + Redis) and **Git**

> Package-manager note: the BackEnd currently contains multiple lockfiles (`bun.lock`, `package-lock.json`, `pnpm-lock.yaml`); its scripts standardize on **Bun**. The FrontEnd uses npm/pnpm. Consolidating to a single package manager per app is a tracked cleanup task.

### Quickstart

```bash
# 1. Clone
git clone https://github.com/EarnQuestOne/stellar_Earn.git
cd stellar_Earn

# 2. Start local infrastructure (PostgreSQL :5432, Redis :6379)
docker compose -f BackEnd/docker-compose.yml up -d

# 3. Backend  →  http://localhost:3001
cd BackEnd
cp .env.example .env             # set DATABASE_URL to the compose Postgres
bun install                      # (npm ci also works for install)
bun run migration:run            # apply TypeORM migrations
bun run start:dev

# 4. Frontend  →  http://localhost:3000   (in a new terminal)
cd FrontEnd/my-app
cp .env.example .env.local       # set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
npm install
npm run dev

# 5. Contract (in a new terminal)
cd contracts/earn-quest
cargo test                       # run the contract test suite
stellar contract build           # build the wasm  (or: just build / make build)
```

> These commands are derived from the projects' own `package.json` scripts, `docker-compose.yml`, and contract `Makefile`/`Justfile`. If a command drifts, those files are the source of truth — please open a PR to fix this section.

### Environment Variables

Each app ships an `.env.example` that is the authoritative list — copy it and fill in values.

**Backend (`BackEnd/.env` from `BackEnd/.env.example`)** — key variables:

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/stellar_earn   # matches BackEnd/docker-compose.yml
# plus optional: LOG_*, TRACING_* (OpenTelemetry), DB_POOL_*, FF_* feature flags
```

**Frontend (`FrontEnd/my-app/.env.local` from `FrontEnd/my-app/.env.example`)** — key variables:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# optional: NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_ANALYTICS_ID
```

## Smart Contract

The Soroban contract lives in `contracts/earn-quest/`. Its authoritative public interface is `contracts/earn-quest/src/lib.rs` (quest registration, submission, approval, claim/payout, reputation, disputes, oracle) — see `contracts/earn-quest/docs/` for details.

```bash
cd contracts/earn-quest
cargo test                                   # tests
cargo fmt --all -- --check                   # format check (CI-enforced)
cargo clippy --all-targets --all-features -- -D warnings   # lints (CI-enforced)
stellar contract build                       # build release wasm

# Deploy to testnet (requires funded key + RPC configured)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --source <account> --network testnet
```

`Makefile` / `Justfile` provide `build`, `test`, and `deploy` shortcuts.

## API

The backend exposes a REST API documented via OpenAPI/Swagger (generated in CI by the *OpenAPI Generation Check* workflow). Run the backend and browse the Swagger UI, or consult the generated OpenAPI spec, for the authoritative, always-current endpoint list — routes are intentionally not hardcoded here to avoid drift.

## Testing

```bash
# Backend (Jest)
cd BackEnd && bun run test           # unit
bun run test:integration             # integration (needs Postgres/Redis)
bun run test:e2e                     # e2e

# Frontend (Vitest + Playwright)
cd FrontEnd/my-app && npm run test   # unit/integration
npm run typecheck                    # tsc --noEmit
npm run test:a11y                    # accessibility (Playwright + axe)

# Contract (Rust)
cd contracts/earn-quest && cargo test
```

## Continuous Integration

GitHub Actions gate every PR (see `.github/workflows/`):

- **backend-ci / backend-lint / backend-integration** — build, lint, and integration tests for `BackEnd`
- **backend-changelog** — enforces per-module `CHANGELOG.md` updates
- **frontend-ci / frontend-vitest-cache / accessibility** — build, unit, and a11y tests for `FrontEnd/my-app`
- **contract-ci** — `cargo build/test`, `fmt --check`, `clippy -D warnings`, and wasm build on Ubuntu + Windows
- **secret-scan** — scans for committed secrets
- **testnet-canary-deployment** — contract canary deploy to testnet

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and use the issue and pull-request templates:

- Issue templates: [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE) (architecture review, contract bug report, gas optimization)
- PR template: [`.github/pull_request_template.md`](.github/pull_request_template.md)
- Code ownership: [`.github/CODEOWNERS`](.github/CODEOWNERS)

Guidelines:

1. Fork and create a feature branch: `git checkout -b feat/<short-name>`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
3. Add/keep tests passing and update the relevant module `CHANGELOG.md`
4. Lint, typecheck, and run the affected app's test suite before opening a PR

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not open public issues for security problems and never commit secrets or key material.

## Resources

- [Stellar Developers](https://developers.stellar.org/) · [Soroban Docs](https://developers.stellar.org/docs/smart-contracts)
- [Next.js](https://nextjs.org/docs) · [NestJS](https://docs.nestjs.com/) · [TypeORM](https://typeorm.io/) · [Rust](https://www.rust-lang.org/)

## License

Released under the [MIT License](LICENSE).
