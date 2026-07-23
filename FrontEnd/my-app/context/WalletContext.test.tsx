import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WalletProvider } from './WalletContext';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetAddress = vi.fn();
const mockSetWallet = vi.fn();
const mockDisconnectKit = vi.fn();
const mockLogout = vi.fn().mockResolvedValue({ message: 'ok' });

// Mutable store state that the WalletProvider reads via useStore(selector)
// and useStore.getState() inside the verification effect.
let storeState: Record<string, any> = {};

const mockStoreActions = {
  setWalletAddress: vi.fn(),
  setIsConnecting: vi.fn(),
  setIsVerifyingWallet: vi.fn(),
  setSelectedWalletId: vi.fn(),
  setWalletModalOpen: vi.fn(),
  setWalletError: vi.fn(),
  disconnectWallet: vi.fn(),
};

// Build the useStore mock: call as useStore(selector) or useStore.getState()
function useStoreMock(selector?: any) {
  if (typeof selector === 'function') return selector(storeState);
  return storeState;
}
useStoreMock.getState = () => storeState;

vi.mock('../../lib/store', () => ({
  useStore: Object.assign(useStoreMock, {
    persist: {
      hasHydrated: () => true,
      onFinishHydration: (fn: any) => {
        fn(storeState);
        return () => {};
      },
    },
  }),
}));

vi.mock('../../lib/hooks/useHydrated', () => ({
  useHydrated: () => true,
}));

vi.mock('../../lib/api/auth', () => ({
  logout: (...args: any[]) => mockLogout(...args),
}));

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn().mockImplementation(() => ({
    setWallet: mockSetWallet,
    getAddress: mockGetAddress,
    disconnect: mockDisconnectKit,
  })),
  WalletNetwork: { TESTNET: 'Test SDF Network ; September 2015' },
  FREIGHTER_ID: 'freighter',
  allowAllModules: () => [],
}));

// ── Test harness ───────────────────────────────────────────────────────────

function renderProvider() {
  return render(
    <WalletProvider>
      <div data-testid="child" />
    </WalletProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('WalletProvider — reconnection verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no persisted session
    storeState = {
      address: null,
      isConnected: false,
      isConnecting: false,
      isVerifyingWallet: false,
      selectedWalletId: null,
      isModalOpen: false,
      walletError: null,
      ...mockStoreActions,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips verification when no persisted session exists', async () => {
    storeState.address = null;
    storeState.selectedWalletId = null;

    renderProvider();

    await waitFor(() => {
      expect(mockGetAddress).not.toHaveBeenCalled();
    });
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockStoreActions.disconnectWallet).not.toHaveBeenCalled();
  });

  it('maintains session when verification succeeds (address matches)', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';
    mockGetAddress.mockResolvedValue({ address: persistedAddr });

    renderProvider();

    await waitFor(() => {
      expect(mockSetWallet).toHaveBeenCalledWith('freighter');
      expect(mockGetAddress).toHaveBeenCalledWith({ skipRequestAccess: true });
    });

    // Session should be preserved — no logout or disconnect
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockStoreActions.disconnectWallet).not.toHaveBeenCalled();
  });

  it('clears session and calls backend logout on address mismatch', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    const liveAddr = 'GDIFFERENT_ADDRESS_XYZ';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';
    mockGetAddress.mockResolvedValue({ address: liveAddr });

    renderProvider();

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockStoreActions.disconnectWallet).toHaveBeenCalledTimes(1);
  });

  it('clears session when getAddress throws (extension unavailable)', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';
    mockGetAddress.mockRejectedValue(new Error('Extension not found'));

    renderProvider();

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    expect(mockStoreActions.disconnectWallet).toHaveBeenCalledTimes(1);
  });

  it('clears session on verification timeout', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';

    // Never-resolving promise — will trigger the 5s timeout
    mockGetAddress.mockReturnValue(new Promise(() => {}));

    renderProvider();

    // Wait for the 5s timeout to fire
    await waitFor(
      () => {
        expect(mockLogout).toHaveBeenCalled();
      },
      { timeout: 7000 }
    );

    expect(mockStoreActions.disconnectWallet).toHaveBeenCalledTimes(1);
  });

  it('sets isVerifyingWallet during verification', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';

    // Deferred promise so we can observe the intermediate state
    let resolveGetAddress: (v: any) => void;
    mockGetAddress.mockReturnValue(
      new Promise((resolve) => {
        resolveGetAddress = resolve;
      })
    );

    renderProvider();

    // Wait for setIsVerifyingWallet(true) to be called
    await waitFor(() => {
      expect(mockStoreActions.setIsVerifyingWallet).toHaveBeenCalledWith(true);
    });

    // Resolve verification
    resolveGetAddress!({ address: persistedAddr });

    await waitFor(() => {
      expect(mockStoreActions.setIsVerifyingWallet).toHaveBeenCalledWith(false);
    });
  });

  it('sets isVerifyingWallet(false) even when logout fails', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    storeState.address = persistedAddr;
    storeState.isConnected = true;
    storeState.selectedWalletId = 'freighter';
    mockGetAddress.mockRejectedValue(new Error('Extension not found'));
    mockLogout.mockRejectedValueOnce(new Error('Network error'));

    renderProvider();

    await waitFor(() => {
      expect(mockStoreActions.disconnectWallet).toHaveBeenCalled();
    });

    // isVerifyingWallet must be cleared even though logout threw
    expect(mockStoreActions.setIsVerifyingWallet).toHaveBeenCalledWith(false);
  });
});
