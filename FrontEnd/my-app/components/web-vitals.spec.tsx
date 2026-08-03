import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useReportWebVitals } from 'next/web-vitals';
import { WebVitals } from './web-vitals';

jest.mock('next/web-vitals', () => ({
  useReportWebVitals: jest.fn(),
}));

describe('WebVitals Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });
  });

  it('should register useReportWebVitals hook on render', () => {
    render(<WebVitals />);
    expect(useReportWebVitals).toHaveBeenCalledTimes(1);
  });

  it('should send beacon when metric callback is executed', () => {
    let reportCallback: (metric: unknown) => void = () => {};

    (
      useReportWebVitals as jest.MockedFunction<typeof useReportWebVitals>
    ).mockImplementation((cb) => {
      reportCallback = cb;
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