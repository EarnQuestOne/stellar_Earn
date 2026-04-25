/**
 * Test Helpers and Utilities for Unit Tests
 * Provides mock objects, factories, and common test utilities
 */

import { Repository } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { Role } from '../../src/common/enums/role.enum';

/**
 * Creates a mock repository for TypeORM entities
 * @template T Entity type
 * @returns Partial mock implementation of Repository
 */
export function createMockRepository<T>(): Partial<Repository<T>> {
  return {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(undefined),
    findOneBy: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(undefined),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
  };
}

/**
 * Creates a mock User entity
 * @param overrides Partial overrides for User properties
 * @returns Mock User entity
 */
export function createMockUser(overrides?: Partial<User>): User {
  const user = new User();
  user.id = 'test-user-id';
  user.email = 'test@example.com';
  user.username = 'testuser';
  user.stellarAddress = 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K';
  user.role = Role.USER;
  user.level = 1;
  user.xp = 0;
  user.reputation = 0;
  user.isEmailVerified = true;
  user.createdAt = new Date();
  user.updatedAt = new Date();

  return Object.assign(user, overrides);
}

/**
 * Creates a mock RefreshToken entity
 * @param overrides Partial overrides for RefreshToken properties
 * @returns Mock RefreshToken entity
 */
export function createMockRefreshToken(
  overrides?: Partial<RefreshToken>,
): RefreshToken {
  const token = new RefreshToken();
  token.id = 'test-token-id';
  token.userId = 'test-user-id';
  token.token = 'mock-refresh-token-value';
  token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  token.createdAt = new Date();
  token.revokedAt = null;

  return Object.assign(token, overrides);
}

/**
 * Creates a mock JWT payload
 * @param overrides Partial overrides for JWT payload
 * @returns Mock JWT payload object
 */
export function createMockJwtPayload(
  overrides?: Partial<any>,
): Record<string, any> {
  return {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: Role.USER,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

/**
 * Creates mock configuration service response
 * @returns Mock config object
 */
export function createMockConfigService() {
  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-key',
        JWT_EXPIRATION: '1h',
        REFRESH_TOKEN_EXPIRATION: '7d',
        AUTH_CHALLENGE_EXPIRATION: '5',
        NODE_ENV: 'test',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-key',
        JWT_EXPIRATION: '1h',
        REFRESH_TOKEN_EXPIRATION: '7d',
        AUTH_CHALLENGE_EXPIRATION: '5',
        NODE_ENV: 'test',
      };
      if (!(key in config)) {
        throw new Error(`Configuration key not found: ${key}`);
      }
      return config[key];
    }),
  };
}

/**
 * Creates mock JWT service
 * @returns Mock JwtService
 */
export function createMockJwtService() {
  return {
    sign: jest.fn().mockImplementation((payload: any) => {
      return `token.for.${payload.sub}`;
    }),
    verify: jest.fn().mockImplementation((token: string) => {
      return createMockJwtPayload();
    }),
    decode: jest.fn().mockImplementation((token: string) => {
      return createMockJwtPayload();
    }),
  };
}

/**
 * Creates mock EventEmitter
 * @returns Mock EventEmitter2
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn().mockResolvedValue(true),
    emitAsync: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
  };
}

/**
 * Creates mock Logger
 * @returns Mock Logger
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * Creates mock Cache Manager
 * @returns Mock Cache
 */
export function createMockCacheManager() {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Sleep utility for async tests
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that an error is thrown with specific message
 * @param fn Function to execute
 * @param errorMessage Expected error message
 */
export async function expectErrorWithMessage(
  fn: () => Promise<any>,
  errorMessage: string,
): Promise<void> {
  try {
    await fn();
    throw new Error(`Expected error with message "${errorMessage}" to be thrown`);
  } catch (error: any) {
    if (!error.message.includes(errorMessage)) {
      throw new Error(
        `Expected error message to include "${errorMessage}", got "${error.message}"`,
      );
    }
  }
}

/**
 * Create a Bearer token string (for testing)
 * @param token Token string
 * @returns Bearer token string
 */
export function createBearerToken(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Generate a random Stellar address for testing
 * @returns Random Stellar public key
 */
export function generateRandomStellarAddress(): string {
  const prefix = 'G';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = prefix;
  for (let i = 0; i < 55; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random string for testing
 * @param length Length of string to generate
 * @returns Random string
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Timeout utility for tests that might hang
 * @param promise Promise to wrap with timeout
 * @param timeoutMs Timeout in milliseconds
 * @param message Timeout error message
 * @returns Promise that rejects after specified timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  message: string = 'Test timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs),
    ),
  ]);
}
