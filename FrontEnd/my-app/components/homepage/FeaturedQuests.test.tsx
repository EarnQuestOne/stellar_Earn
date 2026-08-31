import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import FeaturedQuests from '@/components/homepage/FeaturedQuests';
import { ERROR_CODES, createAppError } from '@/lib/utils/error-handler';

// Create a re-assignable mock function to allow dynamic behavior across tests
const mockGetQuests = vi.fn();

vi.mock('@/lib/api/quests', () => ({
  getQuests: (...args: any[]) => mockGetQuests(...args),
}));

describe('FeaturedQuests - Error Boundary and Timeout Integration', () => {
  beforeEach(() => {
    mockGetQuests.mockReset();
  });

  it('should render loading skeleton while fetching', async () => {
    // Never resolves
    mockGetQuests.mockImplementation(() => new Promise(() => {}));

    render(<FeaturedQuests />);

    // Should show loading indicators
    expect(screen.getByText(/Loading featured quests/i)).toBeInTheDocument();
  });

  it('should display error message on generic API failure', async () => {
    const mockError = new Error('API request failed');
    mockGetQuests.mockRejectedValue(mockError);

    render(<FeaturedQuests />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Quests/i)).toBeInTheDocument();
      expect(screen.getByText(/API request failed/i)).toBeInTheDocument();
    });
  });

  it('should provide retry functionality in generic error state', async () => {
    const mockError = new Error('API request failed');
    mockGetQuests
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ data: [] });

    render(<FeaturedQuests />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetQuests).toHaveBeenCalledTimes(2);
    });
  });

  it('should display timeout-specific amber UI on request timeout', async () => {
    const timeoutError = createAppError(
      'Request timed out',
      ERROR_CODES.TIMEOUT_ERROR,
      0
    );
    mockGetQuests.mockRejectedValue(timeoutError);

    render(<FeaturedQuests />);

    await waitFor(() => {
      // Container exists
      expect(screen.getByTestId('timeout-error-container')).toBeInTheDocument();
      // Amber UI elements are visible
      expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      expect(screen.getByText(/standard 30-second limit/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Retry with Extended Timeout/i })
      ).toBeInTheDocument();
    });
  });

  it('should support double timeout retry action and invoke getQuests with custom timeout', async () => {
    const timeoutError = createAppError(
      'Request timed out',
      ERROR_CODES.TIMEOUT_ERROR,
      0
    );
    mockGetQuests
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ data: [] });

    render(<FeaturedQuests />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Retry with Extended Timeout/i })
      ).toBeInTheDocument();
    });

    const extendedBtn = screen.getByRole('button', {
      name: /Retry with Extended Timeout/i,
    });
    fireEvent.click(extendedBtn);

    await waitFor(() => {
      // Verify second call is made with 60000ms custom timeout
      expect(mockGetQuests).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.any(Object),
        60000,
        expect.objectContaining({ onRevalidate: expect.any(Function) })
      );
    });
  });

  it('should run auto-retry countdown and auto-trigger refetch when auto-retry is toggled', async () => {
    const timeoutError = createAppError(
      'Request timed out',
      ERROR_CODES.TIMEOUT_ERROR,
      0
    );
    mockGetQuests
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ data: [] });

    render(<FeaturedQuests />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Auto-retry on timeout/i)
      ).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/Auto-retry on timeout/i);

    vi.useFakeTimers();
    try {
      fireEvent.click(checkbox);

      // Should display countdown message
      expect(screen.getByText(/Auto-retrying in/i)).toBeInTheDocument();

      // Fast-forward 5 seconds in 1-second increments to let React render and queue the next countdown timer
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() => {
      // Auto-retry should have triggered a second load call
      expect(mockGetQuests).toHaveBeenCalledTimes(2);
    });
  });

  it('should display network diagnostic tips collapsible section', async () => {
    const timeoutError = createAppError(
      'Request timed out',
      ERROR_CODES.TIMEOUT_ERROR,
      0
    );
    mockGetQuests.mockRejectedValue(timeoutError);

    render(<FeaturedQuests />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Network & Diagnosis Tips/i })
      ).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', {
      name: /Network & Diagnosis Tips/i,
    });
    // Expand tips
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/VPN/i)).toBeInTheDocument();
    expect(screen.getByText(/Current request limit:/i)).toBeInTheDocument();
  });
});
