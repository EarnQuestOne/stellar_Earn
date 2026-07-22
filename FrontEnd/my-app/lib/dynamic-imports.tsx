import dynamic from 'next/dynamic';

// Dynamic import helpers to reduce initial bundle size.
// Each component is loaded lazily on demand with SSR disabled
// where client-only APIs are used.

const DynamicLoading = () => (
  <div className="min-h-[200px] w-full animate-pulse rounded-lg bg-slate-800/50" />
);

export const DynamicModal = dynamic(
  () => import('../components/ui/Modal').then((mod) => mod.Modal),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);

export const DynamicWalletConnector = dynamic(
  () =>
    import('../components/wallet/WalletConnectionModal').then(
      (mod) => mod.WalletConnectionModal
    ),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);

export const DynamicToastNotification = dynamic(
  () =>
    import('../components/notifications/Toast').then(
      (mod) => mod.ToastProvider
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

// Homepage below-fold section dynamic imports
export const DynamicHowItWorks = dynamic(
  () =>
    import('../components/homepage/HowItWorks').then((mod) => mod.HowItWorks),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);

export const DynamicFeaturedQuests = dynamic(
  () =>
    import('../components/homepage/FeaturedQuests').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);

export const DynamicFAQAccordion = dynamic(
  () =>
    import('../components/homepage/FAQAccordion').then(
      (mod) => mod.FAQAccordion
    ),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);

export const DynamicCTASection = dynamic(
  () =>
    import('../components/homepage/CTASection').then((mod) => mod.CTASection),
  {
    ssr: false,
    loading: () => <DynamicLoading />,
  }
);
