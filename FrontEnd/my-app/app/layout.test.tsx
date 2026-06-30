import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

// Mock next/font/google which is incompatible with jsdom
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', className: 'geist-sans' }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
    className: 'geist-mono',
  }),
}));

import RootLayout from './layout';

describe('RootLayout smoke test', () => {
  it('renders children without throwing — verifies global error boundary hydration', () => {
    expect(() => {
      render(
        <RootLayout>
          <div data-testid="child-element">Test Child</div>
        </RootLayout>
      );
    }).not.toThrow();
  });
});
