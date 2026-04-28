# Environment Variable Validation

## Overview

The StellarEarn frontend now includes comprehensive environment variable validation that ensures the application fails fast with clear error messages when required configuration is missing, rather than failing silently at runtime.

## Features

### ✅ Fail-Fast Validation

- **Startup Validation**: All required environment variables are validated when the application starts
- **Clear Error Messages**: Missing variables display helpful error messages with examples
- **User-Friendly UI**: Configuration errors show a dedicated error page with setup instructions
- **Development Warnings**: Optional variables with defaults show warnings in development mode

### 🔒 Type-Safe Configuration

- **Type-Safe Access**: Environment variables accessed through type-safe helper functions
- **Centralized Configuration**: All environment variable definitions in one place
- **Default Values**: Optional variables have sensible defaults
- **Runtime Validation**: Variables validated at runtime, not just build time

### 📝 Documentation

- **Self-Documenting**: Each variable includes description and example
- **Example File**: `.env.example` file with all variables documented
- **Error Guidance**: Error messages include setup instructions

## Architecture

### File Structure

```
FrontEnd/my-app/
├── lib/
│   └── config/
│       ├── env.ts                    # Environment validation logic
│       ├── startup.ts                # Startup validation orchestration
│       └── __tests__/
│           └── env.test.ts           # Unit tests
├── components/
│   └── providers/
│       └── EnvValidator.tsx          # Client-side validation component
├── app/
│   └── layout.tsx                    # Root layout (includes EnvValidator)
└── .env.example                      # Example environment file
```

### Components

#### 1. Environment Configuration (`lib/config/env.ts`)

Core validation logic with three main sections:

**Required Variables**:

```typescript
const REQUIRED_ENV_VARS = {
  NEXT_PUBLIC_API_BASE_URL: {
    description: 'Backend API base URL',
    example: 'http://localhost:3001',
    required: true,
  },
};
```

**Optional Variables**:

```typescript
const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_STELLAR_NETWORK: {
    description: 'Stellar network (testnet/mainnet)',
    example: 'testnet',
    default: 'testnet',
  },
  // ... more optional variables
};
```

**Type-Safe Helpers**:

```typescript
export const env = {
  apiBaseUrl: () => getRequiredEnv('NEXT_PUBLIC_API_BASE_URL'),
  stellarNetwork: () => getEnv('NEXT_PUBLIC_STELLAR_NETWORK'),
  isDevelopment: process.env.NODE_ENV === 'development',
  // ... more helpers
};
```

#### 2. Startup Validation (`lib/config/startup.ts`)

Orchestrates validation at application startup:

```typescript
export function validateStartup(): void {
  validateEnvOrThrow();
  // Add more startup validations here
}
```

#### 3. Client-Side Validator (`components/providers/EnvValidator.tsx`)

React component that:

- Validates environment variables on mount
- Shows loading state during validation
- Displays user-friendly error page if validation fails
- Renders children if validation passes

#### 4. Root Layout Integration (`app/layout.tsx`)

EnvValidator wraps the entire application:

```tsx
<EnvValidator>
  <ThemeProvider>{/* ... rest of app */}</ThemeProvider>
</EnvValidator>
```

## Usage

### Setting Up Environment Variables

1. **Copy the example file**:

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required variables**:

   ```bash
   # Required
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

   # Optional (with defaults)
   NEXT_PUBLIC_STELLAR_NETWORK=testnet
   NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   ```

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

### Using Environment Variables in Code

**❌ Old Way (Direct Access)**:

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
```

**✅ New Way (Type-Safe Helper)**:

```typescript
import { env } from '@/lib/config/env';

const apiUrl = env.apiBaseUrl(); // Type-safe, validated
```

### Adding New Environment Variables

1. **Add to configuration** (`lib/config/env.ts`):

   For required variables:

   ```typescript
   const REQUIRED_ENV_VARS = {
     // ... existing variables
     NEXT_PUBLIC_NEW_VARIABLE: {
       description: 'Description of what this does',
       example: 'example-value',
       required: true,
     },
   };
   ```

   For optional variables:

   ```typescript
   const OPTIONAL_ENV_VARS = {
     // ... existing variables
     NEXT_PUBLIC_NEW_OPTIONAL: {
       description: 'Description of what this does',
       example: 'example-value',
       default: 'default-value',
     },
   };
   ```

2. **Add type-safe helper**:

   ```typescript
   export const env = {
     // ... existing helpers
     newVariable: () => getRequiredEnv('NEXT_PUBLIC_NEW_VARIABLE'),
     newOptional: () => getEnv('NEXT_PUBLIC_NEW_OPTIONAL'),
   };
   ```

3. **Update `.env.example`**:

   ```bash
   # New Variable
   # Description of what this does
   NEXT_PUBLIC_NEW_VARIABLE=example-value
   ```

4. **Add tests** (`lib/config/__tests__/env.test.ts`):
   ```typescript
   it('should provide access to new variable', () => {
     process.env.NEXT_PUBLIC_NEW_VARIABLE = 'test-value';
     expect(env.newVariable()).toBe('test-value');
   });
   ```

## Environment Variables Reference

### Required Variables

| Variable                   | Description          | Example                 |
| -------------------------- | -------------------- | ----------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3001` |

### Optional Variables

| Variable                          | Description           | Default                               | Example                               |
| --------------------------------- | --------------------- | ------------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_STELLAR_NETWORK`     | Stellar network       | `testnet`                             | `testnet` or `mainnet`                |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`     | Soroban RPC endpoint  | `https://soroban-testnet.stellar.org` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_CONTRACT_ID`         | Deployed contract ID  | `""`                                  | `CXXXXX...`                           |
| `NEXT_PUBLIC_ANALYTICS_TEST_MODE` | Analytics test mode   | `false`                               | `true` or `false`                     |
| `NEXT_PUBLIC_ANALYTICS_ID`        | Analytics tracking ID | `""`                                  | `G-XXXXXXXXXX`                        |
| `E2E_BASE_URL`                    | E2E test base URL     | `http://localhost:3000`               | `http://localhost:3000`               |

## Error Handling

### Validation Errors

When required variables are missing, the app displays a configuration error page:

```
Configuration Error

Missing required environment variables:

• NEXT_PUBLIC_API_BASE_URL: Backend API base URL

How to fix this:
1. Create a .env.local file in the project root
2. Add the required environment variables
3. Restart the development server

Example .env.local:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
...
```

### Development Warnings

In development mode, warnings are logged for optional variables using defaults:

```
⚠️  Environment Variable Warnings:
   NEXT_PUBLIC_STELLAR_NETWORK not set, using default: "testnet"
   NEXT_PUBLIC_CONTRACT_ID not set, using default: ""
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run env validation tests specifically
npm test env.test.ts

# Run with coverage
npm run test:coverage
```

### Test Coverage

The validation system includes comprehensive unit tests:

- ✅ Validation passes with all required variables
- ✅ Validation fails with missing required variables
- ✅ Warnings for missing optional variables
- ✅ Default values work correctly
- ✅ Type-safe helpers return correct values
- ✅ Environment detection (dev/prod/test)
- ✅ Error message formatting

### Example Test

```typescript
it('should fail validation when required variables are missing', () => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;

  const result = validateEnv();

  expect(result.valid).toBe(false);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].variable).toBe('NEXT_PUBLIC_API_BASE_URL');
});
```

## Migration Guide

### Updating Existing Code

Replace direct `process.env` access with type-safe helpers:

**Before**:

```typescript
// lib/api/client.ts
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// lib/analytics/provider.ts
const testMode = process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE === 'true';

// components/SomeComponent.tsx
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

**After**:

```typescript
// lib/api/client.ts
import { env } from '@/lib/config/env';
const BASE_URL = env.apiBaseUrl();

// lib/analytics/provider.ts
import { env } from '@/lib/config/env';
const testMode = env.analyticsTestMode();

// components/SomeComponent.tsx
import { env } from '@/lib/config/env';
if (env.isDevelopment) {
  console.log('Debug info');
}
```

### Files Updated

The following files were updated to use the new env system:

1. ✅ `lib/api/client.ts` - API base URL
2. ✅ `lib/api/submissions.ts` - API base URL
3. ✅ `lib/analytics/provider.ts` - Analytics test mode
4. ✅ `lib/utils/tracking.ts` - Analytics test mode
5. ✅ `app/layout.tsx` - Added EnvValidator

## Benefits

### Before

- ❌ Silent failures when environment variables are missing
- ❌ Runtime errors deep in the application
- ❌ Inconsistent default values across files
- ❌ No type safety for environment variables
- ❌ Difficult to debug configuration issues
- ❌ No documentation of required variables

### After

- ✅ Fail-fast validation at startup
- ✅ Clear error messages with setup instructions
- ✅ Centralized default values
- ✅ Type-safe access to environment variables
- ✅ Easy to debug configuration issues
- ✅ Self-documenting configuration
- ✅ User-friendly error UI
- ✅ Comprehensive test coverage

## Best Practices

### 1. Always Use Type-Safe Helpers

```typescript
// ❌ Don't
const url = process.env.NEXT_PUBLIC_API_BASE_URL;

// ✅ Do
import { env } from '@/lib/config/env';
const url = env.apiBaseUrl();
```

### 2. Add New Variables to Configuration

When adding a new environment variable:

1. Add to `REQUIRED_ENV_VARS` or `OPTIONAL_ENV_VARS`
2. Add type-safe helper to `env` object
3. Update `.env.example`
4. Add tests

### 3. Use Descriptive Names

```typescript
// ❌ Don't
NEXT_PUBLIC_URL=...

// ✅ Do
NEXT_PUBLIC_API_BASE_URL=...
```

### 4. Provide Examples

Always include realistic examples in the configuration:

```typescript
{
  description: 'Backend API base URL',
  example: 'http://localhost:3001', // ✅ Helpful
}
```

### 5. Document Defaults

Make defaults explicit and documented:

```typescript
{
  description: 'Stellar network (testnet/mainnet)',
  default: 'testnet', // ✅ Clear default
}
```

## Troubleshooting

### Issue: "Configuration Error" on Startup

**Cause**: Required environment variables are missing.

**Solution**:

1. Check the error message for which variables are missing
2. Create or update `.env.local` file
3. Add the required variables
4. Restart the development server

### Issue: Variables Not Loading

**Cause**: Environment variables must start with `NEXT_PUBLIC_` to be available in the browser.

**Solution**: Ensure browser-accessible variables have the `NEXT_PUBLIC_` prefix.

### Issue: Changes Not Reflected

**Cause**: Next.js caches environment variables.

**Solution**: Restart the development server after changing `.env.local`.

### Issue: Tests Failing

**Cause**: Tests may not have environment variables set.

**Solution**: Set required variables in test setup:

```typescript
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
});
```

## Future Enhancements

Potential improvements:

1. **Schema Validation**: Use Zod or similar for runtime type validation
2. **Environment-Specific Configs**: Different validation rules for dev/prod
3. **Secret Detection**: Warn if secrets are accidentally exposed
4. **Auto-Documentation**: Generate documentation from configuration
5. **CLI Tool**: Command-line tool to validate environment files
6. **CI/CD Integration**: Validate environment in CI pipeline

## Related Files

- `lib/config/env.ts` - Core validation logic
- `lib/config/startup.ts` - Startup orchestration
- `lib/config/__tests__/env.test.ts` - Unit tests
- `components/providers/EnvValidator.tsx` - Client-side validator
- `app/layout.tsx` - Root layout integration
- `.env.example` - Example environment file

## Contributing

When adding new features that require environment variables:

1. Add the variable to `lib/config/env.ts`
2. Update `.env.example`
3. Add tests to `lib/config/__tests__/env.test.ts`
4. Update this documentation
5. Update the README if necessary

## License

MIT - See [LICENSE](../../LICENSE) for details
