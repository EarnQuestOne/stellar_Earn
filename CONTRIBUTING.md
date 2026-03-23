# Contributing to stellar_Earn

Thank you for contributing to **stellar_Earn**! This guide covers the standards every contributor must follow to keep the codebase consistent, secure, and maintainable.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Branch & Commit Conventions](#2-branch--commit-conventions)
3. [Pull Request Requirements](#3-pull-request-requirements)
4. [NestJS Best Practices](#4-nestjs-best-practices)
   - [DTO Validation](#41-dto-validation)
   - [Error Handling & Exceptions](#42-error-handling--exceptions)
   - [Logging](#43-logging)
   - [Guards & Authorization](#44-guards--authorization)
5. [Testing Standards](#5-testing-standards)
6. [Swagger / API Documentation](#6-swagger--api-documentation)
7. [Smart Contract (Rust / Soroban)](#7-smart-contract-rust--soroban)
8. [Reviewer Checklist](#8-reviewer-checklist)
9. [Labels](#9-labels)

---

## 1. Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 22 |
| npm | ≥ 10 |
| PostgreSQL | ≥ 14 |
| Redis | ≥ 7 |
| Rust | stable (see `rust-toolchain.toml`) |

### Local Setup

```bash
# Backend
cd BackEnd
cp .env.example .env          # Fill in your local values
npm install
npm run typeorm:run-migrations
npm run start:dev

# Frontend
cd FrontEnd/my-app
npm install
npm run dev

# Contracts
cd Contract
cargo build --workspace
```

---

## 2. Branch & Commit Conventions

### Branch Naming

```
<type>/<short-description>
```

| Type | When to use |
|------|-------------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `chore/` | Tooling, CI, dependencies |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring without behavior change |
| `test/` | Tests only |
| `security/` | Security-related fix |

**Example:** `feat/quest-reward-distribution`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(scope): <short description>

[optional body]

[optional footer: Closes #<issue>]
```

**Example:**
```
feat(quests): add reward distribution via Soroban contract

Implements payout logic triggered on quest completion.
Uses BullMQ job queue to handle async Stellar transactions.

Closes #42
```

---

## 3. Pull Request Requirements

> **All PRs must use the PR template.** PRs that skip required sections or are not linked to an issue will be blocked from merging.

### Mandatory Before Opening a PR

- [ ] Branch is up to date with `main`
- [ ] Linked to an open GitHub issue
- [ ] PR template fully filled out (no placeholder text left)
- [ ] All CI checks pass (lint, format, build, tests)
- [ ] Self-reviewed every line of the diff

### PR Size Guidelines

Keep PRs focused. If a PR touches more than ~400 lines (excluding migrations and generated files), consider splitting it. Large PRs take much longer to review and are more likely to introduce bugs.

---

## 4. NestJS Best Practices

### 4.1 DTO Validation

Every public endpoint **must** validate its input through a DTO. Raw, unvalidated request data must never reach the service layer.

#### Rules

- Create a dedicated DTO file: `src/modules/<module>/dto/<action>-<resource>.dto.ts`
- Use `class-validator` decorators for all fields
- Use `class-transformer` decorators for type coercion and sanitization
- Mark optional fields with `@IsOptional()` **before** all other decorators
- Use `@ApiProperty` / `@ApiPropertyOptional` on every field for Swagger

#### Example

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestDto {
  @ApiProperty({ description: 'Quest title', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Reward in stroops' })
  @IsUUID()
  rewardAssetId: string;
}
```

#### Do NOT

```typescript
// Never access req.body directly in a service or controller without a DTO
@Post()
create(@Body() body: any) { ... } // untyped body
```

---

### 4.2 Error Handling & Exceptions

Use the appropriate NestJS HTTP exception class. Never throw a generic `Error` from a controller or service.

#### Exception Reference

| Situation | Exception Class |
|-----------|----------------|
| Resource not found | `NotFoundException` |
| Malformed / invalid input | `BadRequestException` |
| Unauthenticated request | `UnauthorizedException` |
| Authenticated but not allowed | `ForbiddenException` |
| Duplicate / conflict state | `ConflictException` |
| Unprocessable business logic | `UnprocessableEntityException` |
| Upstream / third-party failure | `ServiceUnavailableException` |

#### Example

```typescript
import { NotFoundException, ForbiddenException } from '@nestjs/common';

async findQuest(id: string, userId: string): Promise<Quest> {
  const quest = await this.questsRepository.findOne({ where: { id } });

  if (!quest) {
    throw new NotFoundException(`Quest ${id} not found`);
  }

  if (quest.ownerId !== userId) {
    throw new ForbiddenException('You do not have access to this quest');
  }

  return quest;
}
```

#### Stellar / Soroban Errors

Wrap all contract and Horizon calls in try/catch and translate failures into NestJS exceptions:

```typescript
try {
  await this.sorobanService.invokeContract(payload);
} catch (err) {
  this.logger.error('Soroban contract invocation failed', err.stack);
  throw new ServiceUnavailableException('Blockchain transaction failed. Please retry.');
}
```

#### Do NOT

```typescript
throw new Error('Quest not found');              // generic Error
throw new HttpException('Forbidden', 403);       // magic status code
if (!quest) return null;                         // silent failure
```

---

### 4.3 Logging

The project uses **Winston** via `nest-winston`. Inject `LoggerService` from `@nestjs/common` — do not use `console.log` anywhere in production code.

#### Log Levels

| Level | When to use |
|-------|-------------|
| `error` | Exceptions, failed external calls, unexpected states |
| `warn` | Recoverable issues, deprecated usage, rate limit hits |
| `log` (info) | Significant lifecycle events (service started, job completed) |
| `debug` | Detailed flow tracing — only in development (`NODE_ENV=development`) |
| `verbose` | High-frequency events — disabled in production |

#### Example

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  async completeQuest(id: string): Promise<void> {
    this.logger.log(`Completing quest ${id}`);

    try {
      await this.processReward(id);
      this.logger.log(`Quest ${id} completed and reward dispatched`);
    } catch (err) {
      this.logger.error(`Failed to complete quest ${id}`, err.stack);
      throw err;
    }
  }
}
```

#### Never Log

- Passwords, JWT tokens, or refresh tokens
- Stellar secret keys (`S...`) or contract IDs that are sensitive
- Full request/response bodies containing user PII
- Raw database query results with credentials

The global `LoggerMiddleware` already handles request/response logging — do not duplicate it.

---

### 4.4 Guards & Authorization

#### Authentication

All endpoints requiring a signed-in user must be protected:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) { ... }
```

#### Public Endpoints

Use the `@Public()` decorator to explicitly opt out of authentication — do not remove or disable guards:

```typescript
import { Public } from 'src/common/decorators/public.decorator';

@Public()
@Get('health')
healthCheck() { ... }
```

#### Admin Endpoints

Admin-restricted routes must use the admin guard **in addition** to `JwtAuthGuard`:

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Delete('quests/:id')
adminDeleteQuest(@Param('id') id: string) { ... }
```

#### Throttler

The global `AppThrottlerGuard` applies to all routes. If a specific endpoint needs a custom limit use `@Throttle()`:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('auth/login')
login(@Body() dto: LoginDto) { ... }
```

#### Do NOT

```typescript
// Never bypass guards with role checks inside the handler
@Get('admin/users')
getUsers(@CurrentUser() user: User) {
  if (user.role !== 'admin') throw new ForbiddenException(); // use a guard instead
}
```

---

## 5. Testing Standards

### Unit Tests

- Co-locate spec files with the source: `<name>.service.spec.ts`
- Mock all external dependencies (repositories, external services, config)
- Aim for **≥ 80% branch coverage** on all new services
- Run before pushing: `npm run test:cov`

### E2E Tests

- Located in `BackEnd/test/`
- Use `supertest` against a test application instance
- Each test must clean up its own database state

### Test Naming Convention

```typescript
describe('QuestsService', () => {
  describe('completeQuest', () => {
    it('should dispatch a reward when quest exists and is pending', async () => { ... });
    it('should throw NotFoundException when quest does not exist', async () => { ... });
    it('should throw ForbiddenException when user does not own the quest', async () => { ... });
  });
});
```

---

## 6. Swagger / API Documentation

- Run the app and verify changes at `http://localhost:3000/api/docs`
- Every controller method must have `@ApiOperation({ summary: '...' })`
- Every possible response status must have an `@ApiResponse` decorator
- DTOs must have `@ApiProperty` on every field — use `example:` to show realistic values
- Protected endpoints must have `@ApiBearerAuth()`

---

## 7. Smart Contract (Rust / Soroban)

- All contract changes must pass `cargo test --workspace` and `cargo clippy -- -D warnings`
- Snapshot tests in `contracts/earn-quest/test_snapshots/` must be updated when behavior changes
- Never expose raw contract errors to API consumers — translate them in the NestJS service layer
- Soroban RPC calls must be async and non-blocking to the main request thread (use BullMQ jobs)

---

## 8. Reviewer Checklist

Use this checklist when reviewing any PR targeting the NestJS backend:

### Architecture & Structure

- [ ] Module boundaries respected — no cross-module direct repository access
- [ ] Business logic lives in the service layer, not controllers or guards
- [ ] New entities registered in `AppModule` TypeORM configuration
- [ ] New modules imported in `AppModule` (or the appropriate parent module)

### DTO Validation

- [ ] Every endpoint body/query has a typed DTO (no `any` or plain objects)
- [ ] `class-validator` decorators are complete and sensible
- [ ] Optional fields use `@IsOptional()` before other decorators
- [ ] `@ApiProperty` present on all DTO fields

### Error Handling

- [ ] Correct NestJS HTTP exception class used for every failure case
- [ ] No silent failures (returning `null`/`undefined` without throwing)
- [ ] Stellar/Soroban failures are caught and translated to NestJS exceptions
- [ ] Global exception filter not bypassed

### Logging

- [ ] `Logger` from `@nestjs/common` used — no `console.log`
- [ ] Errors logged with `err.stack`
- [ ] No sensitive data in log messages
- [ ] Log level is appropriate (not everything logged at `error`)

### Guards & Authorization

- [ ] All authenticated routes use `JwtAuthGuard` (or equivalent)
- [ ] Admin routes have an additional admin guard
- [ ] Public routes explicitly marked with `@Public()`
- [ ] Throttler not disabled without justification

### Testing

- [ ] Unit tests cover the happy path and all edge cases
- [ ] Tests use mocks — no real DB or network calls in unit tests
- [ ] E2E tests added for new endpoints
- [ ] All tests pass in CI

### Security

- [ ] No secrets or keys hardcoded in source
- [ ] `.env.example` updated for new env vars
- [ ] Input sanitized via `class-transformer` `@Transform` where needed
- [ ] No new direct SQL queries bypassing TypeORM

### Database

- [ ] Migration created for schema changes
- [ ] Migration is reversible
- [ ] No `synchronize: true` in non-development environments

---

## 9. Labels

| Label | Description |
|-------|-------------|
| `backend` | Changes to the NestJS backend |
| `frontend` | Changes to the Next.js frontend |
| `contract` | Changes to Rust/Soroban smart contracts |
| `collaboration` | Process, templates, or contribution workflow |
| `developer-experience` | Tooling, CI/CD, or dev environment improvements |
| `priority-high` | Blocking issue or critical bug |
| `priority-medium` | Important but not blocking |
| `priority-low` | Nice to have |
| `security` | Security-related change — requires security review |
| `breaking-change` | Introduces a breaking API or contract change |
| `needs-review` | Ready for reviewer attention |
| `work-in-progress` | Not ready for review yet |

---

*For questions, open a GitHub Discussion or ping a maintainer in the PR comments.*
