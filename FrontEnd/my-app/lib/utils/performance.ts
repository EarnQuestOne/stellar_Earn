import type { Metric } from 'web-vitals';

export const trackPerformance = (metricName: string, value: number, extra?: any) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
        console.log(`[Performance] ${metricName}: ${value}ms`, extra || '');

        // You could send this to an analytics endpoint here
        // analytics.track('Performance Metric', { metricName, value, ...extra });
    }
};

export const measureTTFB = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
            trackPerformance('TTFB', navEntry.responseStart - navEntry.requestStart);
        }
    }
};

export const measureFCP = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            trackPerformance('FCP', fcpEntry.startTime);
        }
    }
};

export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
            onCLS(onPerfEntry);
            // onFID(onPerfEntry);
            onFCP(onPerfEntry);
            onLCP(onPerfEntry);
            onTTFB(onPerfEntry);
        }).catch(err => {
            console.error('Error reporting web vitals:', err);
        });
    }
};
