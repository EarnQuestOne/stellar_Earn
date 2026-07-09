/**
 * Tests for ApiUnreachableFallback – FE-027
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiUnreachableFallback } from './ApiUnreachableFallback';

// Minimal button stub so we don't need the full UI library in unit tests.
vi.mock('../ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

describe('ApiUnreachableFallback', () => {
  it('renders a heading about the server being unreachable', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Server unreachable'
    );
  });

  it('renders descriptive text about the situation', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} />);
    expect(
      screen.getByText(/could not reach the StellarEarn API/i)
    ).toBeDefined();
  });

  it('renders a retry button with the correct label', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} />);
    const btn = screen.getByRole('button', {
      name: /retry server connection/i,
    });
    expect(btn).toBeDefined();
  });

  it('calls onRetry when the button is clicked', () => {
    const onRetry = vi.fn();
    render(<ApiUnreachableFallback onRetry={onRetry} />);
    fireEvent.click(
      screen.getByRole('button', { name: /retry server connection/i })
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows "Checking…" when isChecking is true', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} isChecking />);
    const btn = screen.getByRole('button', { name: /checking server/i });
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('has a status role for accessibility', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('has aria-live="polite" on the container', () => {
    render(<ApiUnreachableFallback onRetry={() => {}} />);
    const container = screen.getByRole('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });
});
