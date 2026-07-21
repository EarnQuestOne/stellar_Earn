import type { Metadata } from 'next';
import { createPageMetadata, getLocale } from '@/lib/seo';

function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; address: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, address } = await params;
  const locale = getLocale(localeParam);
  const displayAddress = shortenAddress(address);
  const descriptions = {
    en: `View ${displayAddress}'s public quest activity, achievements, and on-chain reputation on StellarEarn.`,
    es: `Consulta la actividad pública, los logros y la reputación on-chain de ${displayAddress} en StellarEarn.`,
  };

  return createPageMetadata({
    title:
      locale === 'es'
        ? `Perfil de ${displayAddress}`
        : `${displayAddress}'s Profile`,
    description: descriptions[locale],
    locale,
    pathname: `/profile/${encodeURIComponent(address)}`,
  });
}

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
