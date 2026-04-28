import dynamic from 'next/dynamic';

// Dynamic import helpers to reduce initial bundle size.
// Each component is loaded lazily on demand with SSR disabled
// where client-only APIs are used.

export const DynamicModal = dynamic(() => import('../components/Modal'), {
  ssr: false,
});

export const DynamicWalletConnector = dynamic(
  () => import('../components/WalletConnector'),
  { ssr: false }
);

export const DynamicChart = dynamic(() => import('../components/Chart'), {
  ssr: false,
  loading: () => null,
});

export const DynamicToastNotification = dynamic(
  () => import('../components/ToastNotification'),
  { ssr: false, loading: () => null }
);
