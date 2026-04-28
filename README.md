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

- 🧭 **Quest management** - Create, assign, and track task progress
- 🧩 **Flexible verification** - Off-chain attestations, API checks, or multi-sig approvals
- 💸 **On-chain payouts** - Automatic rewards via Stellar assets (stablecoins or project tokens)
- 🛡️ **Escrow & conditions** - Release rewards only when criteria are met
- ⭐ **Reputation & levels** - XP, badges, and a provable on-chain record
- 🌐 **Multi-network support** - Local sandbox, testnet, or mainnet-ready configs

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Frontend       │      │   Backend        │      │  Stellar/       │
│  Next.js        │◄────►│   NestJS         │◄────►│  Soroban        │
│                 │      │                  │      │                 │
│ • User Dashboard│      │ • REST/GraphQL   │      │ • Quest Contract│
│ • Quest Browser │      │ • Auth & RBAC    │      │ • Reputation    │
│ • Submissions   │      │ • Quest Service  │      │ • Asset/Reward  │
│ • Wallet Connect│      │ • Payout Logic   │      │                 │
└─────────────────┘      │ • Webhooks       │      └─────────────────┘
                         │ • DB (Postgres)  │
                         └──────────────────┘
```

### High-Level Flow

1. Admin creates a quest (API persists off-chain metadata; contract registers reward logic)
2. Contributor submits proof; API verifies (webhooks/API checks) and calls the contract
3. Contract releases/stores state; payouts executed in Stellar assets
4. UI reflects on-chain state + off-chain metadata; users level up

## Repository Structure

```
EarnQuestOnestellar_Earn/
├── apps/
│   ├── web/                    # Next.js frontend (App Router)
│   │   ├── app/                # routes
│   │   ├── components/
│   │   ├── lib/                # wallet utils, API client
│   │   ├── public/
│   │   └── tests/
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── modules/
│       │       ├── quests/
│       │       ├── users/
│       │       ├── payouts/
│       │       └── webhooks/
│       ├── prisma/
│       └── test/
├── contracts/
│   └── earn-quest/             # Soroban/Rust contract
│       ├── src/
│       │   └── lib.rs
│       ├── Cargo.toml
│       └── tests/
├── infra/
│   ├── docker-compose.yml
│   └── migrations/
├── scripts/
├── .env.example
├── package.json
├── README.md
└── LICENSE
```

## Getting Started

### Prerequisites

- Node.js ≥ 18.x and npm or pnpm
- Rust & Cargo (stable)
- Soroban CLI (for building/deploying contracts)
- Docker (optional; for Postgres and local services)
- Git

**Install Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Soroban CLI & Stellar tooling:** See [official docs](https://developers.stellar.org/docs/smart-contracts)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/EarnQuestOnestellar_Earn.git
cd EarnQuestOnestellar_Earn

# Install dependencies
cd apps/web && pnpm install
cd ../api && pnpm install
cd ../../

# Build contract
cd contracts/earn-quest && cargo build
cd ../../
```

### Environment Variables

Create `.env` files based on `.env.example`:

**Root `.env`:**
```bash
# Network
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://<testnet-rpc>
CONTRACT_ID=<set-after-deployment>

# Wallet/Signing
SOROBAN_SECRET_KEY=<server-key>
ISSUER_PUBLIC_KEY=<reward-asset-issuer>

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/earnquest
```

**Frontend (`apps/web/.env.local`):**
```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=
NEXT_PUBLIC_CONTRACT_ID=
API_BASE_URL=http://localhost:3001
```

**Backend (`apps/api/.env`):**
```bash
PORT=3001
DATABASE_URL=postgres://user:pass@localhost:5432/earnquest
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=
CONTRACT_ID=
SOROBAN_SECRET_KEY=
JWT_SECRET=your_jwt_secret
```

### Running Locally

**1. Start Postgres:**
```bash
docker compose -f infra/docker-compose.yml up -d
```

**2. Run database migrations:**
```bash
cd apps/api
pnpm prisma migrate dev
```

**3. Start backend:**
```bash
cd apps/api
pnpm start:dev
```

**4. Start frontend:**
```bash
cd apps/web
pnpm dev
# Access at http://localhost:3000
```

## Smart Contract Development

### Contract Structure

The Soroban smart contract includes these conceptual modules:

- **QuestRegistry** - Create/update quests (reward asset, amount, verifier)
- **Submission** - Submit proof; store status; emit event
- **Verifier** - Check conditions (role-based, multi-sig, or data-driven)
- **Payout** - Transfer asset to recipient upon approval
- **Reputation** - Track XP/badges per address

### Key Contract Functions

```rust
register_task(id, reward_asset, amount, verifier)
submit_proof(id, proof_ref)
approve(id, address, amount)
claim_reward(id, amount)
get_user_stats(address)
get_task(id)
```

### Build & Test

```bash
cd contracts/earn-quest

# Build
cargo build --release

# Run tests
cargo test
```

### Deploy to Testnet

```bash
export STELLAR_NETWORK=testnet
export SOROBAN_RPC_URL=<your-testnet-rpc>

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --network $STELLAR_NETWORK \
  --secret-key $SOROBAN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL

# Save the CONTRACT_ID output to your .env files
```

### Invoke Contract

```bash
# Register a quest
soroban contract invoke \
  --id $CONTRACT_ID \
  --fn register_task \
  --arg id=Q-001 --arg reward_asset=... --arg amount=100

# Get user stats
soroban contract invoke \
  --id $CONTRACT_ID \
  --fn get_user_stats \
  --arg address=<stellar-address>
```

## Testing

**Frontend:**
```bash
cd apps/web
pnpm test
pnpm test:watch
pnpm lint
pnpm typecheck
```

**Backend:**
```bash
cd apps/api
pnpm test
pnpm test:e2e
pnpm lint
```

**Contracts:**
```bash
cd contracts/earn-quest
cargo test
```

## Networks & Configuration

- **Local** - Fastest iteration; use sandbox RPC and fake keys
- **Testnet** - Public test environment; faucet for test funds
- **Mainnet** - Real assets and fees; ensure audits and monitoring

### Switching Networks

Update `STELLAR_NETWORK` and `SOROBAN_RPC_URL` in:
- Contract deployment scripts
- Backend `.env`
- Frontend `.env.local`

**Important:** Ensure reward assets exist and users have trustlines set before payouts.

## API Endpoints

### Quests
- `POST /quests` - Create quest
- `GET /quests` - List quests
- `POST /quests/:id/submit` - Submit proof
- `POST /quests/:id/approve` - Approve submission

### Payouts
- `POST /payouts/claim` - Claim rewards

### Users
- `GET /users/:address/stats` - Get reputation & earnings

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Set up your environment using the installation steps
4. Write tests and ensure they pass
5. Lint and typecheck your code
6. Open a pull request with a clear description

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test updates

### Security

- Do not include secrets in pull requests
- Report vulnerabilities privately (contact TBD)

FIGMA[link](https://www.figma.com/design/wKinSiQpRv6TDfD3u5lCL7/OneQuestEarn-stellar_Earn?node-id=0-1&p=f&t=7ralfeRlDUA6Mrtz-0)
## Resources

- [Stellar Developers](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/smart-contracts)
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Rust & Cargo](https://www.rust-lang.org/)

## License

[MIT](LICENSE) (or specify your chosen license)

---

**Questions or feedback?** Open an issue or reach out to the maintainers.
