# StellarEarn Backend

> NestJS API server for the StellarEarn quest-based earning platform

## Overview

The StellarEarn backend is a robust API service built with NestJS that handles quest management, user authentication, submission verification, and coordinates on-chain payouts through Stellar smart contracts. It serves as the central orchestration layer between the frontend application and the Soroban blockchain.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Stellar signature verification
- **Blockchain**: Stellar SDK, Soroban integration
- **Validation**: class-validator, class-transformer
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with Stellar wallet signatures
- 🎯 **Quest Management** - CRUD operations for quests with metadata storage
- ✅ **Submission Verification** - Off-chain proof validation (webhooks, API checks, attestations)
- 💸 **Payout Orchestration** - Trigger on-chain reward distribution
- 📊 **User Management** - Track user profiles, stats, and reputation
- 🔔 **Webhook Integration** - GitHub, API endpoints for automated verification
- 🗄️ **Database Layer** - Persistent storage for quest metadata and user data
- 📝 **API Documentation** - Auto-generated Swagger docs

## Project Structure

```
apps/api/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── config/                    # Configuration files
│   │   ├── stellar.config.ts
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── auth/                  # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   └── guards/
│   │   ├── quests/                # Quest management
│   │   │   ├── quests.controller.ts
│   │   │   ├── quests.service.ts
│   │   │   ├── quests.module.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── users/                 # User management
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── payouts/               # Payout handling
│   │   │   ├── payouts.controller.ts
│   │   │   ├── payouts.service.ts
│   │   │   └── payouts.module.ts
│   │   ├── webhooks/              # Webhook handlers
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts
│   │   │   └── webhooks.module.ts
│   │   └── stellar/               # Stellar/Soroban integration
│   │       ├── stellar.service.ts
│   │       └── stellar.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   └── database/
│       ├── migrations/
│       └── seeds/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env                           # Environment variables
├── .env.example                   # Example environment file
├── nest-cli.json                  # NestJS CLI configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js ≥ 18.x
- npm, yarn, or pnpm
- PostgreSQL ≥ 14.x
- Docker (optional, for local PostgreSQL)

### Installation

```bash
# Navigate to backend directory
cd apps/api

# Install dependencies
pnpm install
# or
npm install
```

### Environment Variables

Create a `.env` file in the `apps/api` directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/earnquest

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRATION=7d

# Stellar Network Configuration
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org

# Contract & Wallet
CONTRACT_ID=<your-deployed-contract-id>
SOROBAN_SECRET_KEY=<server-signing-key>
ISSUER_PUBLIC_KEY=<reward-asset-issuer>

# Webhook Secrets
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker compose -f ../../infra/docker-compose.yml up -d

# Run migrations
pnpm typeorm:run-migrations

# Seed database (optional)
ts-node seed.ts
```

### Development

```bash
# Start in development mode with hot reload
pnpm start:dev

# Access API at http://localhost:3001
# Swagger docs at http://localhost:3001/api/docs
```

### Build for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

## API Endpoints

### Authentication

```
POST   /auth/login              - Login with Stellar wallet signature
POST   /auth/refresh            - Refresh JWT token
GET    /auth/profile            - Get current user profile
```

### Quests

```
GET    /quests                  - List all quests (with filters)
GET    /quests/:id              - Get quest details
POST   /quests                  - Create new quest (admin only)
PATCH  /quests/:id              - Update quest (admin only)
DELETE /quests/:id              - Delete quest (admin only)
POST   /quests/:id/submit       - Submit proof for a quest
GET    /quests/:id/submissions  - Get quest submissions
```

### Submissions

```
POST   /quests/:id/approve      - Approve submission (admin only)
POST   /quests/:id/reject       - Reject submission (admin only)
GET    /submissions             - Get user's submissions
```

### Payouts

```
POST   /payouts/claim           - Claim approved rewards
GET    /payouts                 - Get payout history
GET    /payouts/:id             - Get payout details
```

### Users

```
GET    /users/:address/stats    - Get user reputation and stats
GET    /users/:address/quests   - Get user's completed quests
PATCH  /users/profile           - Update user profile
```

### Webhooks

```
POST   /webhooks/github         - GitHub webhook handler
POST   /webhooks/api-verify     - Custom API verification
```

## Core Services

### Quest Service

```typescript
// src/modules/quests/quests.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from '../entities/quest.entity';
import { Submission } from '../entities/submission.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    private stellar: StellarService,
  ) {}

  async createQuest(createQuestDto: CreateQuestDto) {
    // 1. Save metadata to database
    const quest = this.questRepository.create(createQuestDto);
    await this.questRepository.save(quest);

    // 2. Register quest on-chain
    await this.stellar.registerTask(
      quest.id,
      quest.rewardAsset,
      quest.rewardAmount,
      quest.verifierAddress,
    );

    return quest;
  }

  async submitProof(questId: string, userId: string, proof: ProofDto) {
    // 1. Validate proof
    const isValid = await this.verifyProof(questId, proof);
    
    if (!isValid) {
      throw new BadRequestException('Invalid proof');
    }

    // 2. Create submission
    const submission = this.submissionRepository.create({
      questId,
      userId,
      proof,
      status: 'PENDING',
    });
    await this.submissionRepository.save(submission);

    return submission;
  }

  private async verifyProof(questId: string, proof: ProofDto): Promise<boolean> {
    // Implement verification logic (webhooks, API calls, etc.)
    return true;
  }
}
```

### Stellar Service

```typescript
// src/modules/stellar/stellar.service.ts
import { Injectable } from '@nestjs/common';
import {
  Keypair,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
} from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private server: SorobanRpc.Server;
  private contract: Contract;
  private keypair: Keypair;

  constructor() {
    this.server = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
    this.contract = new Contract(process.env.CONTRACT_ID);
    this.keypair = Keypair.fromSecret(process.env.SOROBAN_SECRET_KEY);
  }

  async registerTask(
    taskId: string,
    rewardAsset: string,
    amount: number,
    verifier: string,
  ) {
    // Build and submit transaction to register task
    const transaction = new TransactionBuilder(/* ... */)
      .addOperation(
        this.contract.call('register_task', taskId, rewardAsset, amount, verifier)
      )
      .build();

    const result = await this.server.sendTransaction(transaction);
    return result;
  }

  async approveSubmission(taskId: string, userAddress: string, amount: number) {
    // Call contract to approve and trigger payout
    const transaction = new TransactionBuilder(/* ... */)
      .addOperation(
        this.contract.call('approve', taskId, userAddress, amount)
      )
      .build();

    const result = await this.server.sendTransaction(transaction);
    return result;
  }

  async getUserStats(address: string) {
    const result = await this.contract.call('get_user_stats', address);
    return result;
  }
}
```

### Payout Service

```typescript
// src/modules/payouts/payouts.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PayoutsService {
  async claimReward(userId: string, submissionId: string) {
    // 1. Verify submission is approved
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (submission.status !== 'APPROVED') {
      throw new BadRequestException('Submission not approved');
    }

    // 2. Trigger on-chain payout
    await this.stellar.approveSubmission(
      submission.questId,
      submission.user.stellarAddress,
      submission.quest.rewardAmount,
    );

    // 3. Update submission status
    await this.submissionRepository.update({
      where: { id: submissionId },
      data: { status: 'PAID' },
    });

    return { success: true };
  }
}
```

## Database Schema

The database schema is defined using TypeORM entities in the codebase.

Key entities include:

- User: Stores user information and Stellar addresses
- Quest: Defines quests with rewards and requirements
- Submission: Tracks user submissions for quests
- Notification: Handles user notifications
- Payout: Manages reward distributions

## Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run end-to-end tests
pnpm test:e2e

# Generate test coverage
pnpm test:cov
```

## Authentication Flow

1. User signs a challenge message with their Stellar wallet
2. Backend verifies signature against the user's public key
3. Backend issues a JWT token for subsequent requests
4. Protected routes validate JWT and extract user identity

## Deployment

### Docker

```bash
# Build Docker image
docker build -t stellarearn-api .

# Run container
docker run -p 3001:3001 --env-file .env stellarearn-api
```

### Manual Deployment

```bash
# Install production dependencies
npm ci --only=production

# Run migrations
pnpm typeorm:run-migrations

# Start server
npm run start:prod
```

## Best Practices

- **Environment Variables**: Never commit secrets; use `.env` files
- **Error Handling**: Use NestJS exception filters for consistent error responses
- **Validation**: Use DTOs with class-validator for request validation
- **Logging**: Implement structured logging for production monitoring
- **Rate Limiting**: Protect endpoints from abuse
- **Database**: Use transactions for critical operations
- **Security**: Implement CORS, helmet, and other security middleware

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL server is running
- Check firewall rules and network connectivity

### Stellar/Soroban Errors

- Confirm `CONTRACT_ID` matches deployed contract
- Verify `SOROBAN_SECRET_KEY` has sufficient funds for fees
- Check network status (testnet vs mainnet)

### Webhook Verification Failures

- Validate webhook secrets are correctly configured
- Check payload signature verification logic
- Review webhook endpoint logs

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)
- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)

## Contributing

Please see the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](../../LICENSE) for details