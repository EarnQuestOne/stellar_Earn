import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GlobalOfflineIndicator } from './GlobalOfflineIndicator';

const { mockIsOnline } = vi.hoisted(() => {
  let isOnline = true;
  return {
    mockIsOnline: {
      get value() {
        return isOnline;
      },
      set value(v: boolean) {
        isOnline = v;
      },
    },
  };
});

vi.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({
    isOnline: mockIsOnline.value,
    hasRetryableError: false,
    retryFailedRequest: vi.fn(),
  }),
}));

describe('GlobalOfflineIndicator', () => {
  it('renders the offline banner when the app is offline', () => {
    mockIsOnline.value = false;
    render(<GlobalOfflineIndicator />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('You appear to be offline. Some features may not work.')
    ).toBeInTheDocument();
  });

  it('renders nothing when the app is online', () => {
    mockIsOnline.value = true;
    const { container } = render(<GlobalOfflineIndicator />);

    expect(container.firstChild).toBeNull();
  });
});
