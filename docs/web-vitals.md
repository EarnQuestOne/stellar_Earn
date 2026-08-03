# Core Web Vitals Monitoring

## Overview
Continuous monitoring of Core Web Vitals (LCP, INP, CLS, TTFB, FCP) in production using Next.js `useReportWebVitals`.

## Tracked Metrics
* **LCP (Largest Contentful Paint):** Measures loading performance (Target: <= 2.5s).
* **INP (Interaction to Next Paint):** Measures responsiveness (Target: <= 200ms).
* **CLS (Cumulative Layout Shift):** Measures visual stability (Target: <= 0.1).

## Reporting Endpoint
Metrics are transmitted via non-blocking `navigator.sendBeacon` to `/api/analytics/vitals`.