/**
 * Tests for OfflineModeProvider – FE-027
 *
 * Verifies that the provider renders the correct fallback depending on the
 * network / API reachability state returned by useNetworkStatus.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineModeProvider } from './OfflineModeProvider';

// ---------------------------------------------------------------------------
// Mock useNetworkStatus so we control the network state in each test.
// ---------------------------------------------------------------------------

const mockRecheckApi = vi.fn().mockResolvedValue(undefined);

const networkStatusMock = {
  isOnline: true,
  isApiReachable: true,
  recheckApi: mockRecheckApi,
};

vi.mock('@/lib/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => networkStatusMock,
}));

// Minimal stubs for fallback components.
vi.mock('@/components/error/OfflineFallback', () => ({
  OfflineFallback: ({ onRetry }: { onRetry: () => void }) => (
    <div data-testid="offline-fallback">
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock('@/components/error/ApiUnreachableFallback', () => ({
  ApiUnreachableFallback: ({
    onRetry,
    isChecking,
  }: {
    onRetry: () => void;
    isChecking?: boolean;
  }) => (
    <div data-testid="api-unreachable-fallback">
      <button onClick={onRetry} disabled={isChecking}>
        {isChecking ? 'Checking…' : 'Try Again'}
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OfflineModeProvider', () => {
  beforeEach(() => {
    mockRecheckApi.mockClear();
    networkStatusMock.isOnline = true;
    networkStatusMock.isApiReachable = true;
  });

  it('renders children when online and API is reachable', () => {
    render(
      <OfflineModeProvider>
        <span data-testid="child">content</span>
      </OfflineModeProvider>
    );
    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.queryByTestId('offline-fallback')).toBeNull();
    expect(screen.queryByTestId('api-unreachable-fallback')).toBeNull();
  });

  it('renders OfflineFallback when the device is offline', () => {
    networkStatusMock.isOnline = false;
    networkStatusMock.isApiReachable = false;

    render(
      <OfflineModeProvider>
        <span data-testid="child">content</span>
      </OfflineModeProvider>
    );

    expect(screen.getByTestId('offline-fallback')).toBeDefined();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('renders ApiUnreachableFallback when online but API is unreachable', () => {
    networkStatusMock.isOnline = true;
    networkStatusMock.isApiReachable = false;

    render(
      <OfflineModeProvider>
        <span data-testid="child">content</span>
      </OfflineModeProvider>
    );

    expect(screen.getByTestId('api-unreachable-fallback')).toBeDefined();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('calls recheckApi when retry is clicked on the API fallback', async () => {
    networkStatusMock.isOnline = true;
    networkStatusMock.isApiReachable = false;

    render(
      <OfflineModeProvider>
        <span>content</span>
      </OfflineModeProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /try again/i }).click();
    });

    expect(mockRecheckApi).toHaveBeenCalledTimes(1);
  });

  it('renders children when enabled is false regardless of network state', () => {
    networkStatusMock.isOnline = false;
    networkStatusMock.isApiReachable = false;

    render(
      <OfflineModeProvider enabled={false}>
        <span data-testid="child">content</span>
      </OfflineModeProvider>
    );

    expect(screen.getByTestId('child')).toBeDefined();
  });
});
