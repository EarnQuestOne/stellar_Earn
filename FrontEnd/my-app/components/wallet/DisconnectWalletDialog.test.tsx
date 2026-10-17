import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisconnectWalletDialog } from './DisconnectWalletDialog';

const defaultProps = {
  open: true,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('DisconnectWalletDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <DisconnectWalletDialog {...defaultProps} open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the confirmation dialog when open', () => {
    render(<DisconnectWalletDialog {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^disconnect$/i })
    ).toBeInTheDocument();
  });

  it('calls onConfirm when Disconnect is clicked', () => {
    render(<DisconnectWalletDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<DisconnectWalletDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while disconnecting', () => {
    render(<DisconnectWalletDialog {...defaultProps} isDisconnecting />);

    expect(
      screen.getByRole('button', { name: /disconnecting/i })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
