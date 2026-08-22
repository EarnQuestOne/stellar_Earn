import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { WalletProvider, useWallet } from './WalletContext';

// ── Regression tests for #2149 ──────────────────────────────────────────────
// The provider used to allocate a fresh context `value` object (plus fresh
// callback and supportedWallets identities) on every render, forcing every
// useWallet() consumer to re-render whenever the provider re-rendered — even
// when no exposed wallet state had changed. These tests pin the memoized
// behaviour: consumers must bail out when nothing they read has changed, and
// must still update when real wallet state changes.

const { mockStoreState, mockStoreActions, emitStoreChange, subscribeStore } =
  vi.hoisted(() => {
    const listeners = new Set<() => void>();
    const subscribeStore = (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    const emitStoreChange = () => {
      listeners.forEach((l) => l());
    };

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

    return {
      mockStoreState,
      mockStoreActions,
      emitStoreChange,
      subscribeStore,
    };
  });

vi.mock('../lib/store', () => ({
  useStore: Object.assign(
    (selector?: any) =>
      useSyncExternalStore(
        subscribeStore,
        () => (selector ? selector(mockStoreState) : mockStoreState),
        () => (selector ? selector(mockStoreState) : mockStoreState)
      ),
    {
      getState: () => mockStoreState,
      persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
    }
  ),
}));

vi.mock('../lib/hooks/useHydrated', () => ({ useHydrated: () => true }));
vi.mock('../lib/api/auth', () => ({ logout: vi.fn() }));
vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn(),
  WalletNetwork: { TESTNET: 'testnet' },
  FREIGHTER_ID: 'freighter',
  allowAllModules: () => [],
}));

// ── Harness ─────────────────────────────────────────────────────────────────

/**
 * Consumer that records every committed render: how many times it rendered
 * and which context object identity it saw.
 */
function makeConsumer() {
  const samples: { value: ReturnType<typeof useWallet> }[] = [];

  function Consumer() {
    const value = useWallet();
    // No dep array — runs after every committed render of this component.
    useEffect(() => {
      samples.push({ value });
    });
    return <div data-testid="consumer">{value.address ?? 'none'}</div>;
  }

  return { Consumer, samples };
}

beforeEach(() => {
  vi.clearAllMocks();
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

describe('WalletProvider — memoized context value (#2149)', () => {
  it('does not re-render consumers when the provider re-renders with unchanged wallet state', () => {
    const { Consumer, samples } = makeConsumer();

    // Stable children element identity across parent re-renders mirrors a
    // real app tree, where the provider's children come from above and do
    // not change when the provider itself re-renders.
    const children = <Consumer />;

    function App({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <WalletProvider>{children}</WalletProvider>
        </div>
      );
    }

    const view = render(<App tick={0} />);
    expect(samples).toHaveLength(1);

    // 25 unrelated parent re-renders — none of them touch wallet state.
    for (let tick = 1; tick <= 25; tick++) {
      act(() => {
        view.rerender(<App tick={tick} />);
      });
    }

    // The consumer mounted once and never re-committed: the memoized value
    // kept its identity, so React could bail out of the subtree.
    expect(samples).toHaveLength(1);
  });

  it('keeps callback identities stable across provider re-renders with unchanged state', () => {
    const { Consumer, samples } = makeConsumer();
    const children = <Consumer />;

    function App({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <WalletProvider>{children}</WalletProvider>
        </div>
      );
    }

    const view = render(<App tick={0} />);
    for (let tick = 1; tick <= 10; tick++) {
      act(() => {
        view.rerender(<App tick={tick} />);
      });
    }

    expect(samples.length).toBeGreaterThanOrEqual(1);
    const first = samples[0].value;
    for (const { value } of samples) {
      expect(value.connect).toBe(first.connect);
      expect(value.disconnect).toBe(first.disconnect);
      expect(value.openModal).toBe(first.openModal);
      expect(value.closeModal).toBe(first.closeModal);
      expect(value.signMessage).toBe(first.signMessage);
      expect(value.signTransaction).toBe(first.signTransaction);
      expect(value.supportedWallets).toBe(first.supportedWallets);
    }
  });

  it('still re-renders consumers when exposed wallet state actually changes', () => {
    const { Consumer, samples } = makeConsumer();

    const view = render(
      <WalletProvider>
        <Consumer />
      </WalletProvider>
    );
    expect(samples).toHaveLength(1);

    // Simulate a store update flowing through the real subscription path.
    act(() => {
      mockStoreState.address = 'GNEWADDRESS';
      mockStoreState.isConnected = true;
      emitStoreChange();
    });

    // The consumer re-committed exactly once, with a new context identity
    // carrying the updated address.
    expect(samples).toHaveLength(2);
    expect(samples[1].value.address).toBe('GNEWADDRESS');
    expect(samples[1].value.isConnected).toBe(true);
    expect(view.getByTestId('consumer').textContent).toBe('GNEWADDRESS');
  });

  it('benchmark: 100 provider re-renders with unchanged state cause 0 extra consumer commits', () => {
    const { Consumer, samples } = makeConsumer();
    const children = <Consumer />;

    function App({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <WalletProvider>{children}</WalletProvider>
        </div>
      );
    }

    const view = render(<App tick={0} />);

    const start = performance.now();
    for (let tick = 1; tick <= 100; tick++) {
      act(() => {
        view.rerender(<App tick={tick} />);
      });
    }
    const elapsedMs = performance.now() - start;

    // eslint-disable-next-line no-console
    console.info(
      `[wallet-context benchmark] 100 provider re-renders → ${samples.length} consumer commit(s), ${elapsedMs.toFixed(1)}ms`
    );

    // Regression guard for #2149: before memoization this produced one
    // consumer commit per provider render (101 total); after memoization the
    // consumer commits only on mount. Keep as an exact assertion so any
    // future change that re-introduces per-render value allocation fails.
    expect(samples).toHaveLength(1);
  });
});
