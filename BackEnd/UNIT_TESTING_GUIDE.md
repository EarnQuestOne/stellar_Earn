# Unit Testing Best Practices & Guidelines

## Overview

This document outlines best practices for writing comprehensive unit tests for the StellarEarn backend service. Following these guidelines will ensure maintainable, reliable, and effective test coverage.

## Table of Contents

- [Test Structure](#test-structure)
- [Mocking Strategies](#mocking-strategies)
- [Service Testing](#service-testing)
- [Repository Testing](#repository-testing)
- [Controller Testing](#controller-testing)
- [Common Patterns](#common-patterns)
- [Coverage Goals](#coverage-goals)
- [Debugging Tests](#debugging-tests)

## Test Structure

### File Organization

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts      # Unit test file
│   │   ├── auth.controller.ts
│   │   ├── auth.controller.spec.ts
│   │   └── entities/
│   └── users/
│       ├── user.service.ts
│       ├── user.service.spec.ts
│       └── ...
test/
├── utils/
│   ├── test-helpers.ts               # Shared test utilities
│   └── mocks/
├── common/
│   ├── repository-base.spec.ts
│   └── ...
```

### Test File Naming

- Unit test files: `<module>.spec.ts`
- E2E test files: `<module>.e2e-spec.ts`
- Integration test files: `<module>.integration.spec.ts`

### Basic Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let dependency: IDependency;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: IDependency,
          useValue: mockDependency,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    dependency = module.get<IDependency>(IDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expectedValue);
    });
  });
});
```

## Mocking Strategies

### 1. Mock Repository Pattern

```typescript
import { createMockRepository } from '../../test/utils/test-helpers';

const usersRepository = createMockRepository<User>();

jest.spyOn(usersRepository, 'findOne').mockResolvedValue(mockUser);
jest.spyOn(usersRepository, 'save').mockResolvedValue(mockUser);
```

### 2. Mock Services

```typescript
const mockAuthService = {
  generateTokens: jest.fn().mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
  }),
  validateUser: jest.fn().mockResolvedValue(mockUser),
};

const module = await Test.createTestingModule({
  providers: [
    {
      provide: AuthService,
      useValue: mockAuthService,
    },
  ],
}).compile();
```

### 3. Mock Configuration

```typescript
import { createMockConfigService } from '../../test/utils/test-helpers';

const configService = createMockConfigService();
// Returns mocked config values for common keys
```

### 4. Mock Event Emitter

```typescript
import { createMockEventEmitter } from '../../test/utils/test-helpers';

const eventEmitter = createMockEventEmitter();
jest.spyOn(eventEmitter, 'emit').mockResolvedValue(true);
```

## Service Testing

### Testing Service Methods

```typescript
describe('getUserStats', () => {
  it('should return cached stats if available', async () => {
    const cachedStats = { /* ... */ };
    jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedStats);

    const result = await service.getUserStats(address);

    expect(result).toEqual(cachedStats);
    expect(cacheManager.get).toHaveBeenCalledWith(`user_stats_${address}`);
  });

  it('should calculate and cache stats when not cached', async () => {
    jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
    jest.spyOn(repository, 'find').mockResolvedValue([]);
    jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

    const result = await service.getUserStats(address);

    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.any(Number)
    );
  });
});
```

### Testing Error Handling

```typescript
it('should throw NotFoundException when user not found', async () => {
  jest.spyOn(repository, 'findOne').mockResolvedValue(null);

  await expect(
    service.findById('non-existent-id')
  ).rejects.toThrow(NotFoundException);
});

it('should throw UnauthorizedException with expired token', async () => {
  const expiredToken = { expiresAt: new Date(Date.now() - 1000) };
  jest.spyOn(repository, 'findOne').mockResolvedValue(expiredToken);

  await expect(
    service.validateToken(token)
  ).rejects.toThrow(UnauthorizedException);
});
```

### Testing Async Operations

```typescript
it('should handle async operations in sequence', async () => {
  const spy1 = jest.spyOn(service, 'operation1').mockResolvedValue('result1');
  const spy2 = jest.spyOn(service, 'operation2').mockResolvedValue('result2');

  const result = await service.chainedOperation();

  expect(spy1).toHaveBeenCalledBefore(spy2);
  expect(result).toBe('result2');
});

it('should handle parallel async operations', async () => {
  const promises = [
    service.asyncOp1(),
    service.asyncOp2(),
    service.asyncOp3(),
  ];

  const results = await Promise.all(promises);

  expect(results).toHaveLength(3);
});
```

## Repository Testing

### Testing Query Operations

```typescript
describe('findByEmail', () => {
  it('should query repository with email condition', async () => {
    const email = 'test@example.com';
    jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

    const result = await repository.findOne({ where: { email } });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email },
    });
    expect(result).toEqual(mockUser);
  });
});
```

### Testing Pagination

```typescript
it('should handle pagination correctly', async () => {
  const page = 2;
  const limit = 20;
  const skip = (page - 1) * limit;

  jest.spyOn(repository, 'findAndCount').mockResolvedValue([items, 100]);

  const result = await repository.findAndCount({
    skip,
    take: limit,
  });

  expect(repository.findAndCount).toHaveBeenCalledWith({
    skip: 20,
    take: 20,
  });
  expect(result[1]).toBe(100); // total count
});
```

## Controller Testing

### Testing Request Handling

```typescript
describe('POST /auth/login', () => {
  it('should return tokens on successful login', async () => {
    const loginDto = { /* ... */ };
    const expectedResponse = { accessToken: 'token', /* ... */ };

    jest.spyOn(service, 'login').mockResolvedValue(expectedResponse);

    const result = await controller.login(loginDto);

    expect(service.login).toHaveBeenCalledWith(loginDto);
    expect(result).toEqual(expectedResponse);
  });

  it('should handle validation errors', async () => {
    const invalidDto = {};

    await expect(
      controller.login(invalidDto)
    ).rejects.toThrow(BadRequestException);
  });
});
```

## Common Patterns

### Testing Event Emission

```typescript
it('should emit user created event', async () => {
  const emitSpy = jest.spyOn(eventEmitter, 'emit');

  await service.createUser(userData);

  expect(emitSpy).toHaveBeenCalledWith(
    'user.created',
    expect.objectContaining({
      userId: expect.any(String),
      username: userData.username,
    })
  );
});
```

### Testing Retry Logic

```typescript
it('should retry operation on transient failure', async () => {
  const operation = jest.fn()
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValueOnce({ success: true });

  const result = await service.executeWithRetry(operation);

  expect(operation).toHaveBeenCalledTimes(2);
  expect(result).toEqual({ success: true });
});
```

### Testing Validation

```typescript
it('should validate input before processing', async () => {
  const invalidInput = { email: 'not-an-email' };

  await expect(
    service.createUser(invalidInput)
  ).rejects.toThrow(BadRequestException);
});

it('should accept valid input', async () => {
  const validInput = { email: 'valid@example.com', username: 'user' };

  const result = await service.createUser(validInput);

  expect(result).toBeDefined();
});
```

### Testing Caching

```typescript
it('should cache results', async () => {
  const cacheKey = 'test_key';
  jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
  jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

  await service.getCachedData(cacheKey);

  expect(cacheManager.set).toHaveBeenCalledWith(
    cacheKey,
    expect.any(Object),
    expect.any(Number) // ttl
  );
});

it('should return cached value when available', async () => {
  const cachedValue = { data: 'cached' };
  jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedValue);

  const result = await service.getCachedData('test_key');

  expect(result).toEqual(cachedValue);
});
```

## Coverage Goals

### Minimum Coverage Targets

| Metric | Target |
|--------|--------|
| Line Coverage | > 80% |
| Branch Coverage | > 75% |
| Function Coverage | > 80% |
| Statement Coverage | > 80% |

### Critical Areas (100% Coverage Required)

- Authentication/Authorization logic
- Payment/Transaction processing
- User data validation
- Error handling paths
- Security-critical operations

### Run Coverage Analysis

```bash
npm run test:cov
```

Output shows coverage by file and highlights uncovered lines.

## Debugging Tests

### Running Specific Tests

```bash
# Run single test file
npm test -- auth.service.spec

# Run tests matching pattern
npm test -- --testNamePattern="should validate user"

# Run in watch mode
npm run test:watch

# Debug mode
npm run test:debug
```

### Debug Output

```typescript
// Add debug statements
it('should debug test', async () => {
  console.log('Input:', input);
  const result = await service.method(input);
  console.log('Result:', result);
  expect(result).toBeDefined();
});

// Run with debug output
npm test -- --verbose
```

### Using debugger

```bash
node --inspect-brk -r tsconfig-paths/register -r ts-node/register \
  node_modules/.bin/jest --runInBand
```

Then open chrome://inspect in Chrome DevTools.

## Test Data Factories

Use the provided test helpers to create consistent test data:

```typescript
import {
  createMockUser,
  createMockRefreshToken,
  generateRandomStellarAddress,
} from '../../test/utils/test-helpers';

const user = createMockUser({
  email: 'custom@example.com',
  role: Role.ADMIN,
});

const token = createMockRefreshToken({
  userId: user.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

## Performance Testing

### Testing Performance-Critical Code

```typescript
it('should complete within acceptable time', async () => {
  const startTime = performance.now();

  await service.complexCalculation(largeDataSet);

  const endTime = performance.now();
  const duration = endTime - startTime;

  expect(duration).toBeLessThan(1000); // 1 second max
});
```

## Mocking External APIs

```typescript
// Mock HTTP client
const mockHttpClient = {
  get: jest.fn().mockResolvedValue({ data: 'response' }),
  post: jest.fn().mockResolvedValue({ data: 'response' }),
};

// Mock external service
const mockExternalService = {
  fetchData: jest.fn().mockResolvedValue({ /* ... */ }),
};
```

## Checklist Before Committing Tests

- [ ] All tests pass locally (`npm test`)
- [ ] Coverage is above minimum targets (`npm run test:cov`)
- [ ] No console.log or debugging code left
- [ ] Tests are isolated and don't depend on order
- [ ] Mocks are cleaned up in afterEach
- [ ] Error cases are tested
- [ ] Edge cases are covered
- [ ] Comments explain non-obvious test logic
- [ ] Test names are descriptive
- [ ] No hardcoded timeouts in tests (unless necessary)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM Testing](https://typeorm.io/select-query-builder)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Examples Location

- Service tests: `src/modules/*/[service].service.spec.ts`
- Repository tests: `test/common/repository-base.spec.ts`
- Test helpers: `test/utils/test-helpers.ts`
