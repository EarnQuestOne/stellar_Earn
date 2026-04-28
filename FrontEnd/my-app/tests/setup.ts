import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Close server after all tests
afterAll(() => server.close());

afterEach(() => {
  cleanup();
  // Reset handlers after each test `important for test isolation`
  server.resetHandlers();
});
