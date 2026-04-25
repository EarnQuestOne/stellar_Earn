# E2E Test Flakiness Fix Guide

## Overview

E2E tests are prone to flakiness due to timing issues, race conditions, and external dependencies. This guide provides strategies and tools to make E2E tests more stable and reliable.

## Table of Contents

- [Root Causes of Flakiness](#root-causes-of-flakiness)
- [Quick Wins](#quick-wins)
- [Retry Strategy](#retry-strategy)
- [Explicit Waits](#explicit-waits)
- [Best Practices](#best-practices)
- [Helper Utilities](#helper-utilities)
- [Debugging Flaky Tests](#debugging-flaky-tests)

## Root Causes of Flakiness

### 1. **Race Conditions**
- Tests don't wait for async operations to complete
- Database writes not flushed before reading
- Cache invalidation timing issues

**Example:**
```typescript
// ❌ FLAKY - No wait for database
it('should create and retrieve user', async () => {
  await request(app.getHttpServer())
    .post('/users')
    .send({ email: 'user@example.com' })
    .expect(201);

  // Database might not be ready yet
  const users = await request(app.getHttpServer())
    .get('/users')
    .expect(200);
});

// ✅ FIXED - Wait for resource availability
it('should create and retrieve user', async () => {
  await retryWithBackoff(() =>
    request(app.getHttpServer())
      .post('/users')
      .send({ email: 'user@example.com' })
      .expect(201)
  );

  // Wait for read consistency
  const users = await pollDatabase(
    () => getUsersFromDb(['user@example.com']),
    { timeoutMs: 5000 }
  );
});
```

### 2. **Timeout Issues**
- Tests exceed default 5-second timeout
- Slow database operations
- Network latency

**Solution:** Increase timeout and implement explicit waits
```typescript
// In jest-e2e.json
{
  "testTimeout": 30000  // 30 seconds for E2E
}
```

### 3. **Shared State**
- Tests depend on execution order
- Previous test data affects current test
- Database not cleaned between tests

**Example:**
```typescript
// ❌ FLAKY - Depends on test order
let userId = '';

it('should create user', () => {
  userId = createUser().id;
});

it('should update user', () => {
  expect(updateUser(userId)).toBeDefined(); // Fails if first test skipped
});

// ✅ FIXED - Each test is independent
it('should create user', () => {
  const user = createUser();
  expect(user.id).toBeDefined();
});

it('should update user', () => {
  const user = createUser();
  expect(updateUser(user.id)).toBeDefined();
});
```

### 4. **Environmental Instability**
- Database not ready
- Cache/Redis not available
- Port conflicts

**Solution:**
```typescript
beforeAll(async () => {
  // Wait for all services to be ready
  await waitForAppReady(app);
  await waitForDatabase(checkDbConnection);
  await waitForRedis(checkRedisConnection);
});
```

### 5. **Flaky Assertions**
- Timing-dependent assertions
- Assuming data ordering
- Not accounting for processing delays

**Example:**
```typescript
// ❌ FLAKY - Assumes immediate data availability
it('should list recent items', () => {
  createItem();
  return request(app.getHttpServer())
    .get('/items')
    .expect(res => {
      expect(res.body[0].id).toBeDefined();
    });
});

// ✅ FIXED - Wait for data to be queryable
it('should list recent items', async () => {
  const item = createItem();
  
  await waitFor(() =>
    request(app.getHttpServer())
      .get(`/items/${item.id}`)
      .then(res => res.status === 200)
  );
});
```

## Quick Wins

### 1. Increase Test Timeout

Update `jest-e2e.json`:
```json
{
  "testTimeout": 30000,
  "maxWorkers": "50%"
}
```

### 2. Add Retry Logic

Wrap flaky operations:
```typescript
await retryWithBackoff(
  () => request(app.getHttpServer()).post('/endpoint').send(data),
  { maxAttempts: 3, initialDelayMs: 100 }
);
```

### 3. Wait for App Readiness

Before running tests:
```typescript
beforeAll(async () => {
  await waitForAppReady(app);
});
```

### 4. Clear State Between Tests

```typescript
afterEach(async () => {
  jest.clearAllMocks();
  await sleep(50);
  // Clear database/cache as needed
});
```

### 5. Use Explicit Waits

Instead of arbitrary `sleep()`:
```typescript
// ❌ Arbitrary wait
await sleep(2000);

// ✅ Explicit wait for condition
await waitFor(
  () => checkIfDataIsAvailable(),
  { timeoutMs: 5000 }
);
```

## Retry Strategy

### Exponential Backoff Retry

```typescript
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from '../e2e-helpers';

// Basic usage
await retryWithBackoff(
  () => request(app.getHttpServer()).get('/endpoint')
);

// Custom configuration
await retryWithBackoff(
  () => request(app.getHttpServer()).post('/endpoint').send(data),
  {
    maxAttempts: 5,           // Retry up to 5 times
    initialDelayMs: 200,      // Start with 200ms delay
    maxDelayMs: 3000,         // Cap at 3 seconds
    backoffMultiplier: 2,     // Double delay each retry
    timeout: 10000            // 10 second timeout per attempt
  }
);
```

### How it works:
1. **Attempt 1:** Immediate
2. **Attempt 2:** Wait 200ms, then retry
3. **Attempt 3:** Wait 400ms, then retry
4. **Attempt 4:** Wait 800ms, then retry
5. **Attempt 5:** Wait 1600ms, then retry

### When to Use Retries

✅ **Good candidates for retry:**
- HTTP requests (network can be flaky)
- Database queries (might be temporarily locked)
- Cache operations (Redis might restart)
- File I/O (filesystem might be busy)

❌ **Don't retry:**
- Tests for specific error conditions
- Operations with side effects that shouldn't repeat
- Authentication attempts (retry login, not individual request)

## Explicit Waits

### Wait for Conditions

```typescript
import { waitFor, sleep } from '../e2e-helpers';

// Wait for data to exist
await waitFor(
  () => getUserFromDb(userId),
  { timeoutMs: 5000, intervalMs: 200 }
);

// Wait for event emission
await waitForEvent(eventEmitter, 'user.created', { timeoutMs: 3000 });

// Wait for async operation to complete
await waitFor(
  async () => {
    const response = await checkStatus();
    return response.status === 'completed';
  },
  { timeoutMs: 10000 }
);
```

### Poll Database

```typescript
import { pollDatabase } from '../e2e-helpers';

// Wait for database to return result
const user = await pollDatabase(
  () => getUserFromDb(userId),
  { timeoutMs: 5000, intervalMs: 100 }
);
```

### Wait for App Readiness

```typescript
beforeAll(async () => {
  // Wait for app to initialize
  await waitForAppReady(app, 10); // 10 attempts

  // Wait for database
  await waitForDatabase(
    () => checkDatabaseConnection(),
    { timeoutMs: 30000 }
  );

  // Wait for Redis
  await waitForRedis(
    () => checkRedisConnection(),
    { timeoutMs: 15000 }
  );
});
```

## Best Practices

### 1. Use E2E Test Context

```typescript
import { createE2ETestContext } from '../e2e-helpers';

let ctx: any;

beforeAll(async () => {
  ctx = createE2ETestContext(app);
});

it('should make request', async () => {
  const response = await ctx.requestWithRetry(
    'post',
    '/endpoint',
    { maxAttempts: 3 }
  );
  expect(response.status).toBe(201);
});
```

### 2. Proper Test Isolation

```typescript
describe('Module E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup once for all tests
    app = await setupApp();
  });

  afterAll(async () => {
    // Cleanup once after all tests
    await app.close();
  });

  beforeEach(async () => {
    // Reset state before each test
    await clearDatabase();
    await clearCache();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Allow event loop to drain
    await sleep(50);
  });

  it('test 1', async () => {
    // Test 1
  });

  it('test 2', async () => {
    // Test 2
  });
});
```

### 3. Avoid Hardcoded Delays

```typescript
// ❌ FLAKY - Timing dependent
it('should process request', async () => {
  await request(app.getHttpServer()).post('/process').send(data);
  await sleep(2000); // What if processing takes 3 seconds?
  const result = await getResult();
});

// ✅ STABLE - Wait for actual completion
it('should process request', async () => {
  const { id } = await request(app.getHttpServer())
    .post('/process')
    .send(data)
    .expect(200);

  const result = await waitFor(
    () => getResult(id),
    { timeoutMs: 10000 }
  );
  expect(result).toBeDefined();
});
```

### 4. Handle Transient Errors

```typescript
const response = await retryWithBackoff(
  () =>
    request(app.getHttpServer())
      .get('/flaky-endpoint')
      .expect(200),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    backoffMultiplier: 2,
  }
);
```

### 5. Test Data Independence

```typescript
// ✅ GOOD - Each test creates its own data
describe('User Module', () => {
  it('should create user', async () => {
    const userData = { email: `user-${Date.now()}@example.com` };
    const { body } = await createUser(userData);
    expect(body.id).toBeDefined();
  });

  it('should update user', async () => {
    const userData = { email: `user-${Date.now()}@example.com` };
    const user = await createUser(userData);
    const updated = await updateUser(user.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
  });
});
```

### 6. Use Authenticated Requests

```typescript
import { authenticatedRequestWithRetry } from '../e2e-helpers';

const response = await authenticatedRequestWithRetry(
  app,
  'post',
  '/protected-endpoint',
  accessToken,
  { maxAttempts: 3 }
);
```

## Helper Utilities

### Available Helpers

| Function | Purpose |
|----------|---------|
| `retryWithBackoff()` | Retry operation with exponential backoff |
| `waitFor()` | Wait for condition to be true |
| `sleep()` | Sleep for specified milliseconds |
| `waitForAppReady()` | Wait for app initialization |
| `waitForDatabase()` | Wait for database to be available |
| `waitForRedis()` | Wait for Redis to be available |
| `waitForEvent()` | Wait for event emission |
| `pollDatabase()` | Poll database until result found |
| `createE2ETestContext()` | Create test context with utilities |
| `authenticatedRequest()` | Make authenticated HTTP request |
| `requestWithRetry()` | Make HTTP request with retry |
| `CircuitBreaker` | Circuit breaker pattern for requests |

### Import and Use

```typescript
import {
  retryWithBackoff,
  waitFor,
  sleep,
  createE2ETestContext,
  pollDatabase,
  waitForAppReady,
  waitForEvent,
  authenticatedRequestWithRetry,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
} from '../e2e-helpers';
```

## Debugging Flaky Tests

### 1. Run Test Multiple Times

```bash
# Run test 10 times to identify flakiness
npm run test:e2e -- --testNamePattern="should do something" --runInBand
```

### 2. Run with Verbose Output

```bash
npm run test:e2e -- --verbose
```

### 3. Add Debug Logging

```typescript
it('should process data', async () => {
  console.log('Starting request at', Date.now());

  const response = await retryWithBackoff(
    () => {
      console.log('Attempt at', Date.now());
      return request(app.getHttpServer()).post('/process');
    },
    { maxAttempts: 3 }
  );

  console.log('Request completed at', Date.now());
  console.log('Response:', response.body);
  expect(response.status).toBe(200);
});
```

### 4. Check Logs for Patterns

```bash
# Run failing test and capture logs
npm run test:e2e -- --testNamePattern="flaky test" 2>&1 | tee test-output.log
```

### 5. Increase Verbosity Temporarily

```typescript
// In test file
beforeAll(async () => {
  // Enable debug logs
  app.useLogger(console);
  await app.init();
});
```

## Running E2E Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Module

```bash
npm run test:e2e -- --testPathPattern="auth"
```

### Run with Custom Configuration

```bash
npm run test:e2e -- --runInBand --maxWorkers=1
```

### Run Until First Failure

```bash
npm run test:e2e -- --bail
```

### Generate Coverage

```bash
npm run test:e2e -- --coverage
```

## Common E2E Test Patterns

### Authentication Flow

```typescript
// Get challenge
const challengeRes = await retryWithBackoff(() =>
  request(app.getHttpServer())
    .post('/auth/challenge')
    .send({ stellarAddress })
    .expect(200)
);

// Login
const loginRes = await retryWithBackoff(() =>
  request(app.getHttpServer())
    .post('/auth/login')
    .send({ ...loginData, challenge: challengeRes.body.challenge })
    .expect(200)
);

const accessToken = loginRes.body.accessToken;
```

### Protected Endpoint

```typescript
const response = await authenticatedRequestWithRetry(
  app,
  'get',
  '/protected-resource',
  accessToken,
  { maxAttempts: 3 }
);
```

### Database Verification

```typescript
// Create via API
const createRes = await request(app.getHttpServer())
  .post('/items')
  .send(itemData)
  .expect(201);

// Verify in database
const dbItem = await pollDatabase(
  () => getItemFromDb(createRes.body.id),
  { timeoutMs: 5000 }
);

expect(dbItem).toBeDefined();
expect(dbItem.name).toBe(itemData.name);
```

### Event Verification

```typescript
const eventPromise = waitForEvent(eventEmitter, 'item.created', {
  timeoutMs: 3000,
});

// Trigger event
await request(app.getHttpServer())
  .post('/items')
  .send(itemData)
  .expect(201);

const event = await eventPromise;
expect(event.itemId).toBeDefined();
```

## Monitoring Test Health

### Check Flakiness Over Time

Track test runs to identify consistently flaky tests:

```bash
# Run tests multiple times and capture results
for i in {1..10}; do
  npm run test:e2e >> test-results.log 2>&1
done

# Analyze results
grep -c "FAIL\|PASS" test-results.log
```

### Set Up CI/CD Monitoring

In your CI/CD pipeline:
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  continue-on-error: true  # Don't fail build on flaky test
  
- name: Analyze Results
  run: |
    if grep -q "FLAKY" test-results.log; then
      echo "Flaky tests detected"
      # Send alert or create issue
    fi
```

## Checklist for Stable E2E Tests

- [ ] All tests use `waitForAppReady()` in `beforeAll`
- [ ] Database operations use `pollDatabase()` for verification
- [ ] HTTP requests use `retryWithBackoff()` for transient failures
- [ ] Tests have proper isolation (no shared state)
- [ ] Test timeout is set to 30+ seconds in jest-e2e.json
- [ ] No hardcoded sleep times (use explicit waits)
- [ ] Cleanup in `afterEach` (clear mocks, delete test data)
- [ ] Event loop drained between tests (`await sleep(50)` in afterEach)
- [ ] Error conditions properly handled
- [ ] Tests pass consistently when run multiple times

## Resources

- [E2E Test Helpers](./e2e-helpers.ts)
- [Jest E2E Configuration](./jest-e2e.json)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)

## Support

For issues with specific E2E tests:
1. Check this guide for similar patterns
2. Review [auth.e2e-spec-fixed.ts](./auth/auth.e2e-spec-fixed.ts) for examples
3. Use e2e-helpers utilities
4. Add debug logging and run test multiple times
