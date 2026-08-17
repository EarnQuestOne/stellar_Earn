import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportWebVitals } from 'next/web-vitals';
import { WebVitals } from './web-vitals';

vi.mock('next/web-vitals', () => ({
  useReportWebVitals: vi.fn(),
}));

describe('WebVitals Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  it('should register useReportWebVitals hook on render', () => {
    render(<WebVitals />);
    expect(useReportWebVitals).toHaveBeenCalledTimes(1);
  });

  it('should send beacon when metric callback is executed', () => {
    let reportCallback: (metric: unknown) => void = () => {};

    vi.mocked(useReportWebVitals).mockImplementation((cb) => {
      reportCallback = cb as (metric: unknown) => void;
    });

    render(<WebVitals />);

    reportCallback({
      id: 'v3-12345',
      name: 'LCP',
      value: 1200,
      label: 'web-vital',
      startTime: 100,
    });

    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/analytics/vitals',
      JSON.stringify({
        id: 'v3-12345',
        name: 'LCP',
        value: '1200',
        label: 'web-vital',
        startTime: 100,
      }),
    );
  });
});