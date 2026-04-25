/**
 * E2E Test Helpers & Utilities
 * Provides retry logic, explicit waits, and common patterns for stable E2E tests
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Retry configuration for flaky operations
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeout?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
  timeout: 10000,
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param config Retry configuration
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error('Operation timeout')),
            finalConfig.timeout,
          ),
        ),
      ]);
    } catch (error) {
      lastError = error as Error;

      if (attempt < finalConfig.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 * @param fn Condition function that returns boolean
 * @param options Wait options
 */
export async function waitFor(
  fn: () => Promise<boolean> | boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    errorMessage?: string;
  } = {},
): Promise<void> {
  const {
    timeoutMs = 5000,
    intervalMs = 100,
    errorMessage = 'Condition not met within timeout',
  } = options;

  const startTime = Date.now();

  while (true) {
    try {
      const result = await fn();
      if (result) {
        return;
      }
    } catch {
      // Continue polling
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(errorMessage);
    }

    await sleep(intervalMs);
  }
}

/**
 * HTTP request with retry logic
 * @param app NestJS application
 * @param method HTTP method
 * @param path Request path
 * @param config Retry configuration
 */
export async function requestWithRetry(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  config: Partial<RetryConfig> = {},
) {
  return retryWithBackoff(
    () => request(app.getHttpServer())[method](path),
    config,
  );
}

/**
 * Authenticated request helper
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string,
) {
  return request(app.getHttpServer())[method](path).set(
    'Authorization',
    `Bearer ${token}`,
  );
}

/**
 * Authenticated request with retry
 */
export async function authenticatedRequestWithRetry(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string,
  config: Partial<RetryConfig> = {},
) {
  return retryWithBackoff(
    () => authenticatedRequest(app, method, path, token),
    config,
  );
}

/**
 * Wait for application to be ready
 * @param app NestJS application
 * @param maxAttempts Maximum attempts to check readiness
 */
export async function waitForAppReady(
  app: INestApplication,
  maxAttempts = 10,
): Promise<void> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await request(app.getHttpServer()).get('/health').expect((res) => {
        if (res.status !== 200 && res.status !== 503) {
          throw new Error('App not ready');
        }
      });
      return;
    } catch {
      attempts++;
      if (attempts < maxAttempts) {
        await sleep(500);
      }
    }
  }

  throw new Error('Application failed to become ready');
}

/**
 * Wait for database to be ready
 * @param checkFn Function that checks database connectivity
 * @param options Wait options
 */
export async function waitForDatabase(
  checkFn: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  return waitFor(checkFn, {
    timeoutMs: options.timeoutMs || 30000,
    intervalMs: options.intervalMs || 1000,
    errorMessage: 'Database failed to become ready',
  });
}

/**
 * Wait for Redis cache to be ready
 * @param checkFn Function that checks Redis connectivity
 * @param options Wait options
 */
export async function waitForRedis(
  checkFn: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  return waitFor(checkFn, {
    timeoutMs: options.timeoutMs || 15000,
    intervalMs: options.intervalMs || 500,
    errorMessage: 'Redis failed to become ready',
  });
}

/**
 * Wait for event to be emitted
 * @param eventEmitter EventEmitter to listen to
 * @param eventName Event name to wait for
 * @param options Wait options
 */
export async function waitForEvent(
  eventEmitter: any,
  eventName: string,
  options: { timeoutMs?: number } = {},
): Promise<any> {
  const { timeoutMs = 5000 } = options;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Event "${eventName}" not received within timeout`)),
      timeoutMs,
    );

    const handler = (data: any) => {
      clearTimeout(timeout);
      eventEmitter.removeListener(eventName, handler);
      resolve(data);
    };

    eventEmitter.once(eventName, handler);
  });
}

/**
 * Polling function for database queries
 * @param queryFn Query function that returns result or undefined
 * @param options Wait options
 */
export async function pollDatabase<T>(
  queryFn: () => Promise<T | undefined>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 10000, intervalMs = 200 } = options;
  const startTime = Date.now();

  while (true) {
    const result = await queryFn();

    if (result !== undefined) {
      return result;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Database query polling timeout');
    }

    await sleep(intervalMs);
  }
}

/**
 * Setup test isolation - clear state between tests
 */
export async function setupTestIsolation(options: {
  clearDatabase?: boolean;
  clearCache?: boolean;
  clearStorage?: boolean;
} = {}) {
  const { clearDatabase = true, clearCache = true, clearStorage = true } =
    options;

  // Override with appropriate cleanup logic based on your setup
  return {
    async cleanup() {
      // Implement based on your database/cache setup
      if (clearDatabase) {
        // Clear database
      }
      if (clearCache) {
        // Clear cache
      }
      if (clearStorage) {
        // Clear storage
      }
    },
  };
}

/**
 * Create test context with common utilities
 */
export function createE2ETestContext(app: INestApplication) {
  return {
    app,
    request: (method: string, path: string) => {
      return request(app.getHttpServer())[method as any](path);
    },
    authenticatedRequest: (method: string, path: string, token: string) => {
      return authenticatedRequest(app, method as any, path, token);
    },
    requestWithRetry: (
      method: string,
      path: string,
      config?: Partial<RetryConfig>,
    ) => {
      return requestWithRetry(app, method as any, path, config);
    },
    waitForAppReady: () => waitForAppReady(app),
    waitFor,
    sleep,
    retryWithBackoff,
    pollDatabase,
    waitForEvent,
    waitForDatabase,
    waitForRedis,
  };
}

/**
 * Retry a supertest request
 */
export async function retryRequest(
  req: request.Test,
  config: Partial<RetryConfig> = {},
): Promise<request.Response> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      // Clone the request if retrying
      if (attempt > 1) {
        // Note: Supertest doesn't support direct cloning, so we'd need to recreate
        // This is a limitation - better to use requestWithRetry instead
      }
      return await req;
    } catch (error) {
      lastError = error as Error;

      if (attempt < finalConfig.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  throw lastError || new Error('Request retry failed');
}

/**
 * Assert response with retry
 */
export async function assertResponseWithRetry(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  expectedStatus: number,
  config: Partial<RetryConfig> = {},
): Promise<request.Response> {
  return retryWithBackoff(
    () =>
      new Promise((resolve, reject) => {
        request(app.getHttpServer())[method](path).expect(expectedStatus, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      }),
    config,
  );
}

/**
 * Transaction-like test execution - ensures proper cleanup
 */
export async function transactionalTest<T>(
  fn: () => Promise<T>,
  cleanup: () => Promise<void>,
): Promise<T> {
  try {
    return await fn();
  } finally {
    await cleanup();
  }
}

/**
 * Batch async operations with controlled concurrency
 */
export async function batchAsync<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = Promise.resolve().then(async () => {
      const result = await fn(item);
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex((p) => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 5000,
  errorMessage = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Circuit breaker for flaky operations
 */
export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly timeout = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = 'closed';
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}
