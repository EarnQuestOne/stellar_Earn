'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      id: metric.id,
      name: metric.name, // LCP, INP, CLS, FCP, TTFB, FID
      value: metric.value.toString(),
      label: metric.label, // 'web-vital' or 'custom'
      startTime: metric.startTime,
    });

    const url = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics/vitals';

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        body,
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => console.error('Failed to report Web Vitals:', err));
    }
  });

  return null;
}