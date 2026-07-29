import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { WalletProvider, useWallet } from './WalletContext';
// Closes #1938: coverage for the connect()/disconnect() exported methods.
const { mockGetAddress, mockSetWallet, mockDisconnectKit, mockState, mockActions, mockUseStore } = vi.hoisted(() => {
  const mockGetAddress = vi.fn().mockResolvedValue({ address: 'GNEW' });
  const mockSetWallet = vi.fn(), mockDisconnectKit = vi.fn().mockResolvedValue(undefined);
  const mockState: Record<string, any> = {};
  const mockActions = {
    setWalletAddress: vi.fn(), setIsConnecting: vi.fn(), setWalletError: vi.fn(),
    setSelectedWalletId: vi.fn(), setWalletModalOpen: vi.fn(), setIsVerifyingWallet: vi.fn(), disconnectWallet: vi.fn(),
  };
  const mockUseStore = Object.assign((s?: any) => (s ? s(mockState) : mockState), {
    getState: () => mockState,
    persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
  });
  return { mockGetAddress, mockSetWallet, mockDisconnectKit, mockState, mockActions, mockUseStore };
});
vi.mock('../lib/store', () => ({ useStore: mockUseStore }));
vi.mock('../lib/hooks/useHydrated', () => ({ useHydrated: () => true }));
vi.mock('../lib/api/auth', () => ({ logout: vi.fn() }));
vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn().mockImplementation(() => ({ setWallet: mockSetWallet, getAddress: mockGetAddress, disconnect: mockDisconnectKit })),
  WalletNetwork: { TESTNET: 'testnet' }, FREIGHTER_ID: 'freighter', allowAllModules: () => [],
}));
function Harness() {
  const w = useWallet();
  return <><button data-testid="connect" onClick={() => w.connect('freighter')}>c</button>
    <button data-testid="disconnect" onClick={() => w.disconnect()}>d</button></>;
}
describe('WalletProvider — connect/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockState, { address: null, selectedWalletId: null, walletError: null }, mockActions);
  });
  it('connect() calls the kit and stores the resolved address', async () => {
    const { getByTestId } = render(<WalletProvider><Harness /></WalletProvider>);
    fireEvent.click(getByTestId('connect'));
    await waitFor(() => expect(mockActions.setWalletAddress).toHaveBeenCalledWith('GNEW'));
  });
  it('disconnect() clears store state after a prior connect', async () => {
    const { getByTestId } = render(<WalletProvider><Harness /></WalletProvider>);
    fireEvent.click(getByTestId('connect'));
    await waitFor(() => expect(mockActions.setWalletAddress).toHaveBeenCalled());
    fireEvent.click(getByTestId('disconnect'));
    await waitFor(() => expect(mockActions.disconnectWallet).toHaveBeenCalled());
  });
});
