import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { DashboardLayout } from './DashboardLayout';

// Make React available globally for JSX transform in vitest
globalThis.React = React;

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

describe('DashboardLayout with ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders normal dashboard children successfully', () => {
    render(
      <DashboardLayout>
        <div data-testid="widget-1">Active Widget</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('widget-1')).toBeInTheDocument();
    expect(screen.getByText('Active Widget')).toBeInTheDocument();
  });

  it('catches widget render error gracefully and shows error fallback UI without crashing layout', () => {
    const CrashingWidget = () => {
      throw new Error('Widget render explosion');
    };

    render(
      <DashboardLayout>
        <CrashingWidget />
      </DashboardLayout>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
