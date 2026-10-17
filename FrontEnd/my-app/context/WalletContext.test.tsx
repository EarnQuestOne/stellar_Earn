import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { WalletProvider } from './WalletContext';

// ── Hoisted mocks ──────────────────────────────────────────────────────────
// vitest 3.x hoists vi.mock calls above all user code.  Variables referenced
// inside factory functions are only auto-hoisted when their name starts with
// "mock".  Everything else must go through vi.hoisted().

const {
  mockGetAddress,
  mockSetWallet,
  mockDisconnectKit,
  mockLogout,
  mockStoreActions,
  mockStoreState,
  mockUseStore,
  mockStellarWalletsKitCtor,
} = vi.hoisted(() => {
  const mockGetAddress = vi.fn();
  const mockSetWallet = vi.fn();
  const mockDisconnectKit = vi.fn();
  const mockLogout = vi.fn().mockResolvedValue({ message: 'ok' });
  const mockStellarWalletsKitCtor = vi.fn();

  const mockStoreState: Record<string, any> = {};

  const mockStoreActions = {
    setWalletAddress: vi.fn(),
    setIsConnecting: vi.fn(),
    setIsVerifyingWallet: vi.fn(),
    setSelectedWalletId: vi.fn(),
    setWalletModalOpen: vi.fn(),
    setWalletError: vi.fn(),
    disconnectWallet: vi.fn(),
  };

  const mockUseStore = Object.assign(
    (selector?: any) => {
      if (typeof selector === 'function') return selector(mockStoreState);
      return mockStoreState;
    },
    {
      getState: () => mockStoreState,
      persist: {
        hasHydrated: () => true,
        onFinishHydration: (fn: any) => {
          fn(mockStoreState);
          return () => {};
        },
      },
    }
  );

  return {
    mockGetAddress,
    mockSetWallet,
    mockDisconnectKit,
    mockLogout,
    mockStoreActions,
    mockStoreState,
    mockUseStore,
    mockStellarWalletsKitCtor,
  };
});

// ── vi.mock calls (hoisted by vitest) ──────────────────────────────────────

vi.mock('../lib/store', () => ({
  useStore: mockUseStore,
}));

vi.mock('../lib/hooks/useHydrated', () => ({
  useHydrated: () => true,
}));

vi.mock('../lib/api/auth', () => ({
  logout: (...args: any[]) => mockLogout(...args),
}));

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: mockStellarWalletsKitCtor.mockImplementation(() => ({
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
    Object.assign(mockStoreState, {
      address: null,
      isConnected: false,
      isConnecting: false,
      isVerifyingWallet: false,
      selectedWalletId: null,
      isModalOpen: false,
      walletError: null,
    });
    Object.assign(mockStoreState, mockStoreActions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('skips verification when no persisted session exists', async () => {
    mockStoreState.address = null;
    mockStoreState.selectedWalletId = null;

    renderProvider();

    await waitFor(() => {
      expect(mockGetAddress).not.toHaveBeenCalled();
    });
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockStoreActions.disconnectWallet).not.toHaveBeenCalled();
  });

  it('maintains session when verification succeeds (address matches)', async () => {
    const persistedAddr = 'GABCDEF1234567890';
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';
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
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';
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
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';
    mockGetAddress.mockRejectedValue(new Error('Extension not found'));

    renderProvider();

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    expect(mockStoreActions.disconnectWallet).toHaveBeenCalledTimes(1);
  });

  it('clears session on verification timeout', { timeout: 15000 }, async () => {
    const persistedAddr = 'GABCDEF1234567890';
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';

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
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';

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
    mockStoreState.address = persistedAddr;
    mockStoreState.isConnected = true;
    mockStoreState.selectedWalletId = 'freighter';
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

// ── Lazy loading + caching of the wallet kit ────────────────────────────────
// Each test here re-imports the module fresh (vi.resetModules) so the
// module-level kit cache always starts empty, letting these tests assert
// exact construction counts instead of relative deltas.

describe('WalletProvider — lazy kit loading and caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(mockStoreState, {
      address: null,
      isConnected: false,
      isConnecting: false,
      isVerifyingWallet: false,
      selectedWalletId: null,
      isModalOpen: false,
      walletError: null,
    });
    Object.assign(mockStoreState, mockStoreActions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not construct the wallet kit on mount when there is no persisted session', async () => {
    const { WalletProvider: FreshProvider } = await import('./WalletContext');

    render(
      <FreshProvider>
        <div data-testid="child" />
      </FreshProvider>
    );

    await waitFor(() => {
      expect(mockGetAddress).not.toHaveBeenCalled();
    });
    expect(mockStellarWalletsKitCtor).not.toHaveBeenCalled();
  });

  it('constructs the wallet kit exactly once, on the first connect() call', async () => {
    const { WalletProvider: FreshProvider, useWallet: freshUseWallet } =
      await import('./WalletContext');

    function Harness() {
      const { connect } = freshUseWallet();
      return (
        <button data-testid="connect-btn" onClick={() => connect('freighter')}>
          connect
        </button>
      );
    }

    mockGetAddress.mockResolvedValue({ address: 'GNEWADDRESS' });

    const { getByTestId } = render(
      <FreshProvider>
        <Harness />
      </FreshProvider>
    );

    // Kit is not built until connect() is actually called.
    expect(mockStellarWalletsKitCtor).not.toHaveBeenCalled();

    fireEvent.click(getByTestId('connect-btn'));

    await waitFor(() => {
      expect(mockSetWallet).toHaveBeenCalledTimes(1);
    });
    expect(mockStellarWalletsKitCtor).toHaveBeenCalledTimes(1);

    // A second connect reuses the same cached kit instance — no re-import,
    // no re-construction.
    fireEvent.click(getByTestId('connect-btn'));

    await waitFor(() => {
      expect(mockSetWallet).toHaveBeenCalledTimes(2);
    });
    expect(mockStellarWalletsKitCtor).toHaveBeenCalledTimes(1);
  });
});
