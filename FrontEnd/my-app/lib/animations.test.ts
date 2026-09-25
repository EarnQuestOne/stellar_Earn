import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import {
  prefersReducedMotion,
  onPrefersReducedMotionChange,
  usePrefersReducedMotion,
} from './animations';

type MediaQueryListener = (e: MediaQueryListEvent) => void;

interface MockMql {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  onchange: null;
  _fireChange: (next: boolean) => void;
}

function createMqlMock(matches: boolean): MockMql {
  let listener: MediaQueryListener | null = null;
  return {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_type: string, cb: MediaQueryListener) => {
      listener = cb;
    }),
    removeEventListener: vi.fn(() => {
      listener = null;
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
    _fireChange: vi.fn((next: boolean) => {
      listener?.({ matches: next } as MediaQueryListEvent);
    }),
  };
}

function fireMqlChange(mql: MockMql, next: boolean) {
  mql._fireChange(next);
}

describe('prefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when the reduced-motion query matches', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue(
        createMqlMock(true)
      ) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the reduced-motion query does not match', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue(
        createMqlMock(false)
      ) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('onPrefersReducedMotionChange', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('invokes the callback with the current value on change', () => {
    const mql = createMqlMock(false);
    window.matchMedia = vi
      .fn()
      .mockReturnValue(mql) as unknown as typeof window.matchMedia;

    const callback = vi.fn();
    onPrefersReducedMotionChange(callback);
    fireMqlChange(mql, true);

    expect(callback).toHaveBeenCalledWith(true);
  });

  it('returned unsubscribe stops future callbacks', () => {
    const mql = createMqlMock(false);
    window.matchMedia = vi
      .fn()
      .mockReturnValue(mql) as unknown as typeof window.matchMedia;

    const callback = vi.fn();
    const unsubscribe = onPrefersReducedMotionChange(callback);
    unsubscribe();
    fireMqlChange(mql, true);

    expect(callback).not.toHaveBeenCalled();
  });

  it('is a safe no-op outside a browser', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    let result: () => void = () => {};
    expect(() => {
      result = onPrefersReducedMotionChange(() => {});
    }).not.toThrow();
    expect(result).toEqual(expect.any(Function));

    window.matchMedia = matchMedia;
  });
});

describe('usePrefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns the initial reduced-motion value', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue(
        createMqlMock(true)
      ) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the preference changes', () => {
    const mql = createMqlMock(false);
    window.matchMedia = vi
      .fn()
      .mockReturnValue(mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      fireMqlChange(mql, true);
    });

    expect(result.current).toBe(true);
  });

  it('defaults to false when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});
