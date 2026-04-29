'use client';

import { useEffect } from 'react';

export const SWRegister = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) =>
          console.log(
            'Service Worker registered with scope:',
            registration.scope
          )
        )
        .catch((error) =>
          console.error('Service Worker registration failed:', error)
        );
    }
  }, []);

  return null; // This component does not render anything
};
