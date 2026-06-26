// ---------------------------------------------------------------------------
// Test-only env bootstrap (FE-022)
//
// Sets every NEXT_PUBLIC_* variable to a deterministic test value *before*
// any module imports.  Using ||= ensures an outer env (CI, .env.test) can
// still override individual values when needed.
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_API_BASE_URL ||= 'http://localhost:3000';
process.env.NEXT_PUBLIC_STELLAR_NETWORK ||= 'testnet';
process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||=
  'https://soroban-testnet.stellar.org';
process.env.NEXT_PUBLIC_CONTRACT_ID ||=
  'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE ||= 'true';
process.env.NEXT_PUBLIC_ANALYTICS_ID ||= 'G-TEST-XXXXXXXXXX';
process.env.NEXT_PUBLIC_SENTRY_DSN ||= '';
process.env.E2E_BASE_URL ||= 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll, expect } from 'vitest';
import { server } from './mocks/server';

// Custom matcher to support testing without external dependencies
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to be in the document`,
    };
  },
  toHaveTextContent(received, expected: string | RegExp) {
    const content = received?.textContent || '';
    const pass =
      expected instanceof RegExp
        ? expected.test(content)
        : content.includes(String(expected));
    return {
      pass,
      message: () =>
        `expected element to have text content matching ${expected}`,
    };
  },
  toHaveClass(received, expected: string) {
    const pass = received?.classList?.contains(expected) ?? false;
    return {
      pass,
      message: () => `expected element to have class ${expected}`,
    };
  },
  toHaveAttribute(received, attribute: string, value?: string) {
    const hasAttr = received?.hasAttribute(attribute) ?? false;
    const attrValue = received?.getAttribute(attribute);
    const pass = value ? hasAttr && attrValue === value : hasAttr;
    return {
      pass,
      message: () =>
        `expected element to have attribute ${attribute}${value ? `=${value}` : ''}`,
    };
  },
  toBeDisabled(received) {
    const pass = received?.disabled ?? false;
    return {
      pass,
      message: () => `expected element to be disabled`,
    };
  },
  toBeEmptyDOMElement(received) {
    const pass = (received?.textContent?.trim() ?? '') === '';
    return {
      pass,
      message: () => `expected element to be empty`,
    };
  },
  toHaveFocus(received) {
    const pass = document.activeElement === received;
    return {
      pass,
      message: () => `expected element to have focus`,
    };
  },
});

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Close server after all tests
afterAll(() => server.close());

afterEach(() => {
  cleanup();
  // Reset handlers after each test `important for test isolation`
  server.resetHandlers();
});

import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toBeInTheDocument(...args: unknown[]): void;
    toBeEmptyDOMElement(...args: unknown[]): void;
    toHaveTextContent(...args: unknown[]): void;
    toHaveClass(...args: unknown[]): void;
    toHaveAttribute(...args: unknown[]): void;
    toBeDisabled(...args: unknown[]): void;
    toHaveFocus(): void;
  }
}
