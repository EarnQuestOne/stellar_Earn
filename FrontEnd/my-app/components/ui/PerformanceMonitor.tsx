'use client';

import React, { useEffect } from 'react';
import {
  measureFCP,
  measureTTFB,
  reportWebVitals,
} from '@/lib/utils/performance';

const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // Basic measurements
    measureTTFB();
    measureFCP();

    // Advanced web vitals
    reportWebVitals((metric) => {
      console.log(`[Web Vital] ${metric.name}:`, metric.value);
    });
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
