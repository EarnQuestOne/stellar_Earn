# StellarEarn Frontend

> Next.js web application for the StellarEarn quest-based earning platform

## Overview

The StellarEarn frontend is a modern web application built with Next.js (App Router) that provides an intuitive interface for users to browse quests, submit proof of completion, track their reputation, and manage their Stellar wallet connections.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (recommended)
- **Wallet Integration**: Freighter, Albedo, or other Stellar wallets
- **State Management**: React Context / Zustand (as needed)
- **HTTP Client**: Fetch API / Axios
- **Stellar SDK**: @stellar/stellar-sdk

## Features

- 🔐 **Wallet Connection** - Connect and manage Stellar wallets (Freighter, Albedo)
- 🎯 **Quest Browser** - Browse available quests with filters and search
- 📊 **User Dashboard** - View personal stats, XP, badges, and earnings
- 📝 **Quest Submissions** - Submit proof and track submission status
- 🏆 **Reputation Display** - On-chain reputation visualization
- 💰 **Reward Claims** - Claim earned rewards directly to wallet
- 🌓 **Dark Mode** - Theme switching support

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Protected routes
│   ├── (dashboard)/       # Dashboard pages
│   ├── quests/            # Quest-related pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   ├── quest/             # Quest-specific components
│   ├── wallet/            # Wallet connection components
│   └── layout/            # Layout components
├── lib/
│   ├── api/               # API client functions
│   ├── stellar/           # Stellar/Soroban utilities
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Helper functions
├── public/
│   ├── images/
│   └── icons/
├── tests/
│   ├── unit/
│   └── integration/
├── .env.local             # Local environment variables
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind configuration
└── tsconfig.json          # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js ≥ 18.x
- npm, yarn, or pnpm
- A Stellar wallet (Freighter recommended)

### Installation

```bash
# Navigate to frontend directory
cd apps/web

# Install dependencies
pnpm install
# or
npm install
```

### Environment Variables

Create a `.env.local` file in the `apps/web` directory:

```bash
# Stellar Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=<your-contract-id>

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Optional: Analytics, monitoring
NEXT_PUBLIC_ANALYTICS_ID=
```
FIGMA[link](https://www.figma.com/design/wKinSiQpRv6TDfD3u5lCL7/OneQuestEarn-stellar_Earn?node-id=0-1&p=f&t=7ralfeRlDUA6Mrtz-0)
### Development

```bash
# Start development server
pnpm dev

# Access at http://localhost:3000
```

### Build for Production

```bash
# Create optimized production build
pnpm build

# Start production server
pnpm start
```

## Key Components

### Wallet Integration

```typescript
// lib/stellar/wallet.ts
import { FreighterModule } from '@stellar/freighter-api';

export async function connectWallet() {
  const { isConnected, getPublicKey } = FreighterModule;
  
  if (await isConnected()) {
    const publicKey = await getPublicKey();
    return publicKey;
  }
  throw new Error('Wallet not available');
}
```

### API Client

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchQuests(filters?: QuestFilters) {
  const response = await fetch(`${API_BASE_URL}/quests`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

export async function submitQuestProof(questId: string, proof: ProofData) {
  const response = await fetch(`${API_BASE_URL}/quests/${questId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proof),
  });
  return response.json();
}
```

### Contract Interaction

```typescript
// lib/stellar/contract.ts
import { Contract, SorobanRpc } from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_SOROBAN_RPC_URL);
const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;

export async function getUserStats(address: string) {
  const contract = new Contract(contractId);
  const result = await server.getContractData(contract, address);
  return result;
}
```

## Pages & Routes

- `/` - Homepage with featured quests
- `/quests` - Browse all available quests
- `/quests/[id]` - Quest detail page
- `/dashboard` - User dashboard with stats
- `/profile` - User profile and settings
- `/submissions` - Track quest submissions

## Component Guidelines

### Component Structure

```typescript
// components/quest/QuestCard.tsx
interface QuestCardProps {
  quest: Quest;
  onSelect?: (questId: string) => void;
}

export function QuestCard({ quest, onSelect }: QuestCardProps) {
  return (
    <div className="quest-card">
      <h3>{quest.title}</h3>
      <p>{quest.description}</p>
      <div className="quest-reward">
        {quest.rewardAmount} {quest.rewardAsset}
      </div>
    </div>
  );
}
```

### Custom Hooks

```typescript
// lib/hooks/useWallet.ts
export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    const pubKey = await connectWallet();
    setAddress(pubKey);
    setConnected(true);
  };

  const disconnect = () => {
    setAddress(null);
    setConnected(false);
  };

  return { connected, address, connect, disconnect };
}
```

## Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Check test coverage
pnpm test:coverage
```

Coverage reports are written to `coverage/` with four outputs enabled by default:
- terminal summary during the run
- `coverage/index.html` for a browsable report
- `coverage/lcov.info` for editor or CI tooling
- `coverage/coverage-summary.json` for machine-readable summaries

Unit tests are matched with the `*.test.ts` and `*.test.tsx` naming convention. Playwright end-to-end specs stay under `tests/e2e` so coverage runs do not accidentally execute browser tests.

The current minimum coverage gate is intentionally modest while the suite grows:
- statements: 20%
- functions: 20%
- lines: 20%
- branches: 15%

## Linting & Type Checking

```bash
# Run ESLint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
pnpm build

# The output will be in .next/
# Serve with a Node.js server or static hosting
```

## Best Practices

- **Wallet Security**: Never store private keys; use wallet extensions
- **Error Handling**: Implement proper error boundaries and user feedback
- **Loading States**: Show loading indicators for async operations
- **Responsive Design**: Ensure mobile-friendly layouts
- **Accessibility**: Use semantic HTML and ARIA labels
- **Performance**: Optimize images and lazy load components

## Troubleshooting

### Wallet Connection Issues

- Ensure Freighter or compatible wallet is installed
- Check that you're on the correct network (testnet/mainnet)
- Verify RPC URL is accessible

### API Connection Errors

- Confirm backend server is running
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Verify CORS settings on backend

### Contract Interaction Failures

- Verify `NEXT_PUBLIC_CONTRACT_ID` is correct
- Ensure contract is deployed to the specified network
- Check Soroban RPC URL connectivity
FIGMA[link](https://www.figma.com/design/wKinSiQpRv6TDfD3u5lCL7/OneQuestEarn-stellar_Earn?node-id=0-1&p=f&t=7ralfeRlDUA6Mrtz-0)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Freighter Wallet](https://www.freighter.app/)
- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)

## Contributing

Please see the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](../../LICENSE) for details