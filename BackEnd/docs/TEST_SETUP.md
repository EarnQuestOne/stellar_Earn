# Unit Test Setup & Execution Guide

## Installation & Configuration

### Testing Framework Already Installed ✓

Your project already has Jest and NestJS testing utilities configured:

```json
{
  "jest": "^29.7.0",
  "@nestjs/testing": "^11.0.1",
  "ts-jest": "^29.1.2",
  "supertest": "^7.0.0",
  "@types/jest": "^29.5.14"
}
```

### Jest Configuration (Already in package.json)

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test auth.service.spec

# Run tests matching pattern
npm test -- --testNamePattern="should validate"

# Debug mode with Node inspector
npm run test:debug
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:cov

# Coverage report shows:
# - Line coverage
# - Branch coverage
# - Function coverage
# - Statement coverage
```

## Project Test Structure

### Test Files Added

#### Core Service Tests
- ✅ `src/modules/auth/auth.service.spec.ts` - Authentication service (14 test suites)
- ✅ `src/modules/users/user.service.spec.ts` - User management service (12 test suites)
- ✅ `src/modules/stellar/stellar.service.spec.ts` - Stellar blockchain integration (8 test suites)
- ✅ `src/modules/cache/cache.service.spec.ts` - Cache management service (12 test suites)

#### Utilities & Helpers
- ✅ `test/utils/test-helpers.ts` - Reusable test factories and mocks
- ✅ `test/common/repository-base.spec.ts` - TypeORM repository testing patterns
- ✅ `UNIT_TESTING_GUIDE.md` - Comprehensive testing best practices documentation

### Test Coverage by Module

| Module | Test File | Test Cases | Coverage |
|--------|-----------|-----------|----------|
| Auth | auth.service.spec.ts | 14+ | Core functionality |
| Users | user.service.spec.ts | 12+ | Core functionality |
| Stellar | stellar.service.spec.ts | 8+ | Core functionality |
| Cache | cache.service.spec.ts | 12+ | Core functionality |
| Repository | repository-base.spec.ts | 20+ | Patterns & examples |

## Test Helpers Available

### User & Entity Factories

```typescript
import {
  createMockUser,
  createMockRefreshToken,
  createMockJwtPayload,
} from '../../test/utils/test-helpers';

const user = createMockUser({ email: 'custom@test.com' });
const token = createMockRefreshToken({ userId: user.id });
```

### Service Mocks

```typescript
import {
  createMockRepository,
  createMockJwtService,
  createMockConfigService,
  createMockEventEmitter,
  createMockCacheManager,
  createMockLogger,
} from '../../test/utils/test-helpers';

const repository = createMockRepository<User>();
const jwtService = createMockJwtService();
const config = createMockConfigService();
```

### Utility Functions

```typescript
import {
  generateRandomStellarAddress,
  generateRandomString,
  createBearerToken,
  expectErrorWithMessage,
  withTimeout,
  sleep,
} from '../../test/utils/test-helpers';

const address = generateRandomStellarAddress();
const token = createBearerToken('my-token');
```

## Creating New Tests

### Step 1: Create Test File

Create `src/modules/mymodule/mymodule.service.spec.ts`

### Step 2: Use Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MyService } from './mymodule.service';
import { MyEntity } from './entities/my.entity';
import { createMockRepository } from '../../test/utils/test-helpers';

describe('MyService', () => {
  let service: MyService;
  let repository: any;

  beforeEach(async () => {
    repository = createMockRepository<MyEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: getRepositoryToken(MyEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      const result = await service.methodName();
      expect(result).toBeDefined();
    });
  });
});
```

### Step 3: Run Your Tests

```bash
npm test mymodule.service.spec
npm run test:cov -- mymodule.service.spec
```

## Test Organization Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should authenticate user', async () => {
  // Arrange - Set up test data
  const loginDto = { address: 'test', signature: 'sig' };
  jest.spyOn(service, 'verify').mockResolvedValue(true);

  // Act - Execute the function
  const result = await service.login(loginDto);

  // Assert - Verify results
  expect(result).toHaveProperty('token');
});
```

### 2. Mock Setup

```typescript
beforeEach(async () => {
  // Create mocks
  const mockRepository = createMockRepository<User>();

  // Configure module
  const module = await Test.createTestingModule({
    providers: [
      Service,
      { provide: getRepositoryToken(Entity), useValue: mockRepository },
    ],
  }).compile();

  // Get instances
  service = module.get<Service>(Service);
});

afterEach(() => {
  // Always clean up
  jest.clearAllMocks();
});
```

### 3. Test Isolation

```typescript
// ❌ BAD - Tests depend on execution order
let userId = '';

it('should create user', () => {
  userId = createUser().id;
});

it('should find user', () => {
  expect(findUser(userId)).toBeDefined();
});

// ✅ GOOD - Each test is independent
it('should create user', () => {
  const user = createUser();
  expect(user.id).toBeDefined();
});

it('should find user', () => {
  const user = createUser();
  const found = findUser(user.id);
  expect(found).toBeDefined();
});
```

## Common Testing Patterns

### Testing Async Methods

```typescript
it('should handle async operations', async () => {
  jest.spyOn(service, 'asyncOp').mockResolvedValue('result');

  const result = await service.asyncOp();

  expect(result).toBe('result');
});
```

### Testing Error Handling

```typescript
it('should throw on invalid input', async () => {
  await expect(service.method(invalid))
    .rejects
    .toThrow(BadRequestException);
});
```

### Testing Event Emission

```typescript
it('should emit event on creation', async () => {
  const emitSpy = jest.spyOn(eventEmitter, 'emit');

  await service.create(data);

  expect(emitSpy).toHaveBeenCalledWith(
    'event.name',
    expect.any(Object)
  );
});
```

### Testing Cache Operations

```typescript
it('should cache results', async () => {
  jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

  await service.getCachedData(key);

  expect(cacheManager.set).toHaveBeenCalled();
});
```

## Coverage Goals

### Minimum Thresholds

| Metric | Target | Current |
|--------|--------|---------|
| Line | 80% | Increasing |
| Branch | 75% | Increasing |
| Function | 80% | Increasing |
| Statement | 80% | Increasing |

### View Coverage Report

```bash
npm run test:cov
# Opens coverage/index.html in your browser
```

## Debugging Failed Tests

### 1. Run with Verbose Output

```bash
npm test -- --verbose auth.service.spec
```

### 2. Use Node Debugger

```bash
npm run test:debug
# Then open chrome://inspect in Chrome
```

### 3. Add Debug Logging

```typescript
it('test with debug', async () => {
  console.log('Test value:', testValue);
  console.log('Mock calls:', mockFn.mock.calls);
  
  const result = await service.method();
  
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

### 4. Check Mock Calls

```typescript
it('should verify mock was called correctly', async () => {
  jest.spyOn(service, 'method').mockResolvedValue('result');

  await service.method('arg1', 'arg2');

  // View all calls
  console.log('All calls:', mockFn.mock.calls);
  
  // Verify specific call
  expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  
  // Count calls
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
```

## Next Steps

### Phase 2: Expand Test Coverage

1. **Controller Tests** - Add tests for HTTP endpoints
2. **E2E Tests** - Expand existing E2E test suite
3. **Integration Tests** - Database integration tests
4. **Performance Tests** - Load and stress testing

### Phase 3: Advanced Testing

1. **Contract Tests** - Smart contract interaction tests
2. **Event Stream Tests** - Event processing validation
3. **Cache Strategy Tests** - Cache performance testing
4. **Security Tests** - Authentication/Authorization edge cases

## Troubleshooting

### Issue: "Cannot find module"

**Solution:** Check the import path and ensure the file exists:
```bash
npm test -- --clearCache
npm test
```

### Issue: "Timeout - async callback not invoked"

**Solution:** Add timeout or ensure promises are handled:
```typescript
it('test name', async () => {
  // Make sure to await
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

### Issue: "Mock not being called"

**Solution:** Verify mock is set up before calling:
```typescript
// ✅ Correct - Mock set up first
jest.spyOn(service, 'method').mockResolvedValue('result');
await service.method();
expect(service.method).toHaveBeenCalled();

// ❌ Wrong - Mock set up after call
await service.method();
jest.spyOn(service, 'method').mockResolvedValue('result');
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM Testing Guide](https://typeorm.io/select-query-builder)
- [Test Best Practices](/BackEnd/UNIT_TESTING_GUIDE.md)

## Support

For questions about tests:
1. Check [UNIT_TESTING_GUIDE.md](/BackEnd/UNIT_TESTING_GUIDE.md)
2. Review existing test examples in test files
3. Use test helpers from `test/utils/test-helpers.ts`
