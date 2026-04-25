/**
 * Jest E2E Setup - After Env Configuration
 * Provides test stability configurations and global utilities
 */

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Suppress specific console messages during testing
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress known harmless warnings
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';

    // Suppress socket.io warnings
    if (message.includes('socket') && message.includes('warn')) {
      return;
    }

    // Suppress listening port warnings
    if (message.includes('Listening on')) {
      return;
    }

    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';

    // Suppress known warnings
    if (message.includes('MaxListenersExceededWarning')) {
      return;
    }

    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.waitFor = async (
  fn: () => Promise<boolean> | boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> => {
  const { timeoutMs = 5000, intervalMs = 100 } = options;
  const startTime = Date.now();

  while (true) {
    try {
      const result = await fn();
      if (result) return;
    } catch {
      // Continue polling
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Condition not met within timeout');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

global.sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in E2E test:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in E2E test:', error);
});

// Allow natural event loop to drain between tests
afterEach((done) => {
  setImmediate(() => {
    done();
  });
});

// Extend global interface for TypeScript
declare global {
  function waitFor(
    fn: () => Promise<boolean> | boolean,
    options?: { timeoutMs?: number; intervalMs?: number },
  ): Promise<void>;
  function sleep(ms: number): Promise<void>;
}

export {};
