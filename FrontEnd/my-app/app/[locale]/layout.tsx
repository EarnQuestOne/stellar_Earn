import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppLayout } from '@/components/layout/AppLayout';
import { headers } from 'next/headers';
import '../globals.css';
import { RootProviders } from '@/app/providers/RootProviders';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { WalletConnectionModal } from '@/components/wallet/WalletConnectionModal';
import { SessionManager } from '@/components/auth/SessionManager';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';
import { SkipToContent } from '@/components/a11y/SkipToContent';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import { EnvValidator } from '@/components/providers/EnvValidator';
import { SWRegister } from '@/components/SWRegister';
import { createPageMetadata, getLocale } from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const homeMetadata = {
  en: {
    title: 'Complete Quests and Earn Stellar Rewards',
    description:
      'Discover community quests, earn Stellar rewards, and build your on-chain reputation with StellarEarn.',
  },
  es: {
    title: 'Completa misiones y gana recompensas Stellar',
    description:
      'Descubre misiones de la comunidad, gana recompensas Stellar y construye tu reputación on-chain con StellarEarn.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocale(localeParam);

  return createPageMetadata({
    ...homeMetadata[locale],
    locale,
    pathname: '/',
  });
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Render-blocking script prevents flash of unstyled theme on first paint */}
        <script src="/theme-init.js" nonce={nonce} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EnvValidator>
          <RootProviders>
            <I18nProvider locale={locale}>
              <SkipToContent />
              <SWRegister />
              {children}
              <PerformanceMonitor />
              <ConsentBanner />
              <WalletConnectionModal />
              <SessionManager />
            </I18nProvider>
          </RootProviders>
        </EnvValidator>
      </body>
    </html>
  );
}
