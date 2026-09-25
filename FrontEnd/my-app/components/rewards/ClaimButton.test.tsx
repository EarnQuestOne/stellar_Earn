import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClaimButton } from './ClaimButton';

describe('ClaimButton', () => {
  it('renders correctly and calls onClick when clicked once', async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    render(<ClaimButton onClick={onClick} status="idle" />);

    const button = screen.getByRole('button', { name: /claim all rewards/i });
    expect(button).toBeEnabled();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('guards against duplicate reward claims during an in-flight request', async () => {
    let resolveClaim: () => void = () => {};
    const pendingPromise = new Promise<void>((resolve) => {
      resolveClaim = resolve;
    });
    const onClick = vi.fn().mockImplementation(() => pendingPromise);

    render(<ClaimButton onClick={onClick} status="idle" />);
    const button = screen.getByRole('button', { name: /claim all rewards/i });

    await act(async () => {
      // Simulate rapid repeat presses
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });

    // Despite 4 rapid clicks, onClick should only be called once
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Processing Transaction...')).toBeInTheDocument();

    // Resolve the in-flight claim
    await act(async () => {
      resolveClaim();
    });

    // Lock resets after completion
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('resets in-flight lock on claim failure', async () => {
    let rejectClaim: (err: Error) => void = () => {};
    const pendingPromise = new Promise<void>((_, reject) => {
      rejectClaim = reject;
    });
    pendingPromise.catch(() => {});
    const onClick = vi.fn().mockImplementation(() => pendingPromise);

    render(<ClaimButton onClick={onClick} status="idle" />);
    const button = screen.getByRole('button', { name: /claim all rewards/i });

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectClaim(new Error('Transaction rejected'));
    });

    // Lock resets on failure
    expect(screen.getByRole('button')).toBeEnabled();

    // A subsequent click is allowed
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('disables the button when status is pending or disabled prop is true', () => {
    const { rerender } = render(
      <ClaimButton onClick={vi.fn()} status="pending" />
    );

    let button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(
      screen.getByLabelText(/processing transaction, please wait/i)
    ).toBeInTheDocument();

    rerender(<ClaimButton onClick={vi.fn()} status="idle" disabled={true} />);
    button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(
      screen.getByLabelText(/claim rewards unavailable/i)
    ).toBeInTheDocument();
  });
});
