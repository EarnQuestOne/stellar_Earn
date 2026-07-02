/**
 * Tests for useNetworkStatus – FE-027
 *
 * Covers:
 * - Initial state synchronisation
 * - Browser online / offline events
 * - API health probe logic
 * - `network-unreachable` custom-event handling
 * - `recheckApi` on-demand probe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stable mock state object – mutate fields per test instead of recreating
// the mock on every selector call (which would cause infinite re-renders).
const mockState = {
  isOnline: true,
  isApiReachable: true,
  setOnlineStatus: vi.fn(),
  setApiReachable: vi.fn(),
};

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

const mockGet = vi.fn().mockResolvedValue({ data: { status: 'ok' } });

vi.mock('../api/client', () => ({
  getApiClient: () => ({ get: mockGet }),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');

    // Reset mock state to defaults
    mockState.isOnline = true;
    mockState.isApiReachable = true;
    mockState.setOnlineStatus = vi.fn();
    mockState.setApiReachable = vi.fn();
    mockGet.mockResolvedValue({ data: { status: 'ok' } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── initial state ─────────────────────────────────────────────────────────

  it('sets initial online status from navigator.onLine on mount', () => {
    renderHook(() => useNetworkStatus());
    expect(mockState.setOnlineStatus).toHaveBeenCalledWith(navigator.onLine);
  });

  it('returns isOnline and isApiReachable from the store', () => {
    mockState.isOnline = true;
    mockState.isApiReachable = false;
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isApiReachable).toBe(false);
  });

  // ── online / offline events ───────────────────────────────────────────────

  it('registers online and offline event listeners', () => {
    renderHook(() => useNetworkStatus());
    expect(window.addEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('calls setOnlineStatus(true) when the online event fires', () => {
    renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(mockState.setOnlineStatus).toHaveBeenCalledWith(true);
  });

  it('calls setOnlineStatus(false) and setApiReachable(false) when offline event fires', () => {
    renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(mockState.setOnlineStatus).toHaveBeenCalledWith(false);
    expect(mockState.setApiReachable).toHaveBeenCalledWith(false);
  });

  // ── API health probe ──────────────────────────────────────────────────────

  it('fires an API health probe immediately when online', async () => {
    renderHook(() => useNetworkStatus());
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({ timeout: 5000 })
    );
  });

  it('sets isApiReachable(true) when the health probe succeeds', async () => {
    mockGet.mockResolvedValue({ data: { status: 'ok' } });
    renderHook(() => useNetworkStatus());
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(mockState.setApiReachable).toHaveBeenCalledWith(true);
  });

  it('sets isApiReachable(false) when the health probe fails', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));
    renderHook(() => useNetworkStatus());
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(mockState.setApiReachable).toHaveBeenCalledWith(false);
  });

  it('does NOT probe the API when offline', async () => {
    mockState.isOnline = false;
    mockGet.mockClear();
    renderHook(() => useNetworkStatus());
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    // Periodic effect only runs when storeIsOnline is true.
    expect(mockGet).not.toHaveBeenCalled();
  });

  // ── network-unreachable custom event ──────────────────────────────────────

  it('registers a network-unreachable event listener', () => {
    renderHook(() => useNetworkStatus());
    expect(window.addEventListener).toHaveBeenCalledWith(
      'network-unreachable',
      expect.any(Function)
    );
  });

  it('sets isApiReachable(false) when network-unreachable fires', () => {
    renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new CustomEvent('network-unreachable'));
    });
    expect(mockState.setApiReachable).toHaveBeenCalledWith(false);
  });

  it('removes network-unreachable listener on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'network-unreachable',
      expect.any(Function)
    );
  });

  // ── recheckApi ────────────────────────────────────────────────────────────

  it('exposes recheckApi as a function', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(typeof result.current.recheckApi).toBe('function');
  });

  it('recheckApi triggers an API probe and resolves', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {
      await result.current.recheckApi();
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({ timeout: 5000 })
    );
  });
});
