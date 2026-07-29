import { renderHook, act } from '@testing-library/react';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { useWalletBalance } from './useWalletBalance';

describe('useWalletBalance Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ balance: '100.50' }),
    } as unknown as Response);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('debounces balance requests on initial invocation', async () => {
    renderHook(() => useWalletBalance({ address: 'GABC123' }));

    expect(global.fetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('pauses polling when document visibility becomes hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });

    renderHook(() => useWalletBalance({ address: 'GABC123' }));

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
