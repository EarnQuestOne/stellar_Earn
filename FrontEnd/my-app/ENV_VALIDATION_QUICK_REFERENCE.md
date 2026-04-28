# Environment Validation Quick Reference

## Quick Setup

```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Edit .env.local with your values
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# 3. Restart dev server
npm run dev
```

## Using Environment Variables

```typescript
// ❌ Old way
const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'default';

// ✅ New way
import { env } from '@/lib/config/env';
const url = env.apiBaseUrl();
```

## Available Helpers

```typescript
import { env } from '@/lib/config/env';

// API
env.apiBaseUrl(); // Required: Backend API URL

// Stellar
env.stellarNetwork(); // Optional: 'testnet' | 'mainnet'
env.sorobanRpcUrl(); // Optional: Soroban RPC endpoint
env.contractId(); // Optional: Contract ID

// Analytics
env.analyticsTestMode(); // Optional: boolean
env.analyticsId(); // Optional: Analytics ID

// Testing
env.e2eBaseUrl(); // Optional: E2E test URL

// Environment
env.isDevelopment; // boolean
env.isProduction; // boolean
env.isTest; // boolean
```

## Adding New Variables

### 1. Add to Configuration

```typescript
// lib/config/env.ts

// Required variable
const REQUIRED_ENV_VARS = {
  NEXT_PUBLIC_NEW_VAR: {
    description: 'What this does',
    example: 'example-value',
    required: true,
  },
};

// Optional variable
const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_NEW_OPTIONAL: {
    description: 'What this does',
    example: 'example-value',
    default: 'default-value',
  },
};
```

### 2. Add Helper

```typescript
// lib/config/env.ts
export const env = {
  // ... existing
  newVar: () => getRequiredEnv('NEXT_PUBLIC_NEW_VAR'),
  newOptional: () => getEnv('NEXT_PUBLIC_NEW_OPTIONAL'),
};
```

### 3. Update .env.example

```bash
# New Variable
NEXT_PUBLIC_NEW_VAR=example-value
```

### 4. Add Test

```typescript
// lib/config/__tests__/env.test.ts
it('should provide access to new variable', () => {
  process.env.NEXT_PUBLIC_NEW_VAR = 'test';
  expect(env.newVar()).toBe('test');
});
```

## Testing

```bash
# Run all tests
npm test

# Run env tests only
npm test env.test.ts

# Run with coverage
npm run test:coverage
```

## Common Issues

### Configuration Error on Startup

**Problem**: Missing required environment variables

**Solution**:

```bash
# Check .env.local exists
ls -la .env.local

# Verify required variables are set
cat .env.local

# Restart server
npm run dev
```

### Variables Not Loading

**Problem**: Variables must have `NEXT_PUBLIC_` prefix for browser access

**Solution**: Rename variable to include prefix:

```bash
# ❌ Wrong
API_URL=http://localhost:3001

# ✅ Correct
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Changes Not Reflected

**Problem**: Next.js caches environment variables

**Solution**: Restart the development server:

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

## Required Variables

| Variable                   | Description     | Example                 |
| -------------------------- | --------------- | ----------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:3001` |

## Optional Variables (with defaults)

| Variable                          | Default                               | Example                |
| --------------------------------- | ------------------------------------- | ---------------------- |
| `NEXT_PUBLIC_STELLAR_NETWORK`     | `testnet`                             | `testnet` or `mainnet` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`     | `https://soroban-testnet.stellar.org` | RPC URL                |
| `NEXT_PUBLIC_CONTRACT_ID`         | `""`                                  | `CXXXXX...`            |
| `NEXT_PUBLIC_ANALYTICS_TEST_MODE` | `false`                               | `true` or `false`      |
| `NEXT_PUBLIC_ANALYTICS_ID`        | `""`                                  | `G-XXXXXXXXXX`         |
| `E2E_BASE_URL`                    | `http://localhost:3000`               | Test URL               |

## File Structure

```
FrontEnd/my-app/
├── lib/config/
│   ├── env.ts                    # Core validation
│   ├── startup.ts                # Startup validation
│   └── __tests__/env.test.ts     # Tests
├── components/providers/
│   └── EnvValidator.tsx          # UI validator
├── app/layout.tsx                # Integration
└── .env.example                  # Example file
```

## Validation Flow

```
App Start
    ↓
EnvValidator Component
    ↓
validateEnv()
    ↓
Check Required Variables
    ↓
    ├─ Missing → Show Error Page
    └─ Present → Render App
```

## Error Page Example

When validation fails, users see:

```
❌ Configuration Error

Missing required environment variables:

• NEXT_PUBLIC_API_BASE_URL: Backend API base URL

How to fix this:
1. Create a .env.local file
2. Add required variables
3. Restart the server

Example .env.local:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Best Practices

✅ **Do**:

- Use type-safe helpers (`env.apiBaseUrl()`)
- Add new variables to configuration
- Update `.env.example`
- Write tests for new variables
- Restart server after changes

❌ **Don't**:

- Access `process.env` directly
- Hardcode default values
- Forget `NEXT_PUBLIC_` prefix
- Skip documentation
- Commit `.env.local` to git

## Quick Commands

```bash
# Setup
cp .env.example .env.local

# Development
npm run dev

# Testing
npm test
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Getting Help

1. Check error message for missing variables
2. Review `.env.example` for required format
3. See `ENV_VALIDATION.md` for detailed docs
4. Check `README.md` for project setup

## Related Documentation

- [ENV_VALIDATION.md](./ENV_VALIDATION.md) - Comprehensive guide
- [README.md](./README.md) - Project documentation
- [.env.example](./.env.example) - Example environment file
