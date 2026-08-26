import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectButton } from './ConnectButton';

const { mockLogout, mockDisconnect, mockOpenModal } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockDisconnect: vi.fn(),
  mockOpenModal: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: mockLogout,
  }),
}));

vi.mock('../../context/WalletContext', () => ({
  useWallet: () => ({
    isConnected: true,
    address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD',
    isVerifyingWallet: false,
    openModal: mockOpenModal,
    disconnect: mockDisconnect,
  }),
}));

describe('ConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('shows a confirm step before disconnecting the wallet', async () => {
    render(<ConnectButton />);

    // Open the wallet menu.
    fireEvent.click(screen.getByRole('button', { name: /GABC/i }));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    // The disconnect must NOT happen yet — a confirmation dialog appears.
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
  });

  it('disconnects only after the user confirms', async () => {
    render(<ConnectButton />);

    fireEvent.click(screen.getByRole('button', { name: /GABC/i }));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    // The dialog closes once the disconnect completes.
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('does not disconnect when the user cancels', () => {
    render(<ConnectButton />);

    fireEvent.click(screen.getByRole('button', { name: /GABC/i }));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
