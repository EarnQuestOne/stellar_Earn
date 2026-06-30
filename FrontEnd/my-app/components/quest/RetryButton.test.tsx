import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { RetryButton } from './RetryButton';

describe('RetryButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isVisible is false', () => {
    const onRetry = vi.fn();

    const { container } = render(
      <RetryButton isVisible={false} onRetry={onRetry} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders button when isVisible is true', () => {
    const onRetry = vi.fn();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('shows loading state while retrying', async () => {
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        })
    );

    const user = userEvent.setup();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText('Retrying...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('disables button while retrying', async () => {
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        })
    );

    const user = userEvent.setup();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    const button = screen.getByRole('button', {
      name: /retry/i,
    }) as HTMLButtonElement;

    await user.click(button);

    expect(button.disabled).toBe(true);

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('displays custom button text', () => {
    const onRetry = vi.fn();

    render(
      <RetryButton isVisible={true} onRetry={onRetry} buttonText="Try Again" />
    );

    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('shows error message when retry fails', async () => {
    const errorMessage = 'Network error occurred';

    const onRetry = vi.fn().mockRejectedValue(new Error(errorMessage));

    const user = userEvent.setup();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('has isLoading prop to control loading state', () => {
    const onRetry = vi.fn();

    const { rerender } = render(
      <RetryButton isVisible={true} isLoading={false} onRetry={onRetry} />
    );

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      false
    );

    rerender(
      <RetryButton isVisible={true} isLoading={true} onRetry={onRetry} />
    );

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      true
    );

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('supports full width styling', () => {
    const onRetry = vi.fn();

    render(<RetryButton isVisible={true} onRetry={onRetry} fullWidth={true} />);

    expect(screen.getByRole('button').classList.contains('w-full')).toBe(true);
  });

  it('applies custom className', () => {
    const onRetry = vi.fn();

    render(
      <RetryButton
        isVisible={true}
        onRetry={onRetry}
        className="custom-class"
      />
    );

    expect(screen.getByRole('button').classList.contains('custom-class')).toBe(
      true
    );
  });

  it('has proper accessibility attributes', () => {
    const onRetry = vi.fn();

    render(<RetryButton isVisible={true} onRetry={onRetry} />);

    const button = screen.getByRole('button');

    expect(button.getAttribute('aria-label')).toBe('Retry');
  });

  it('updates aria-busy when loading state changes', () => {
    const onRetry = vi.fn();

    const { rerender } = render(
      <RetryButton isVisible={true} isLoading={false} onRetry={onRetry} />
    );

    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('false');

    rerender(
      <RetryButton isVisible={true} isLoading={true} onRetry={onRetry} />
    );

    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });
});
