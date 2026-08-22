import type { Metadata } from 'next';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/config';

const LOCAL_SITE_URL = 'http://localhost:3000';

export const SITE_NAME = 'StellarEarn';

export function getSiteUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!configuredUrl) return LOCAL_SITE_URL;

  const urlWithProtocol = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  try {
    return new URL(urlWithProtocol).origin;
  } catch {
    return LOCAL_SITE_URL;
  }
}

export function getLocale(locale: string): Locale {
  return locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;
}

type PageMetadataOptions = {
  title: string;
  description: string;
  locale: Locale;
  pathname: string;
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  locale,
  pathname,
  index = true,
}: PageMetadataOptions): Metadata {
  const localizedPath = `/${locale}${pathname === '/' ? '' : pathname}`;
  const canonicalUrl = new URL(localizedPath, getSiteUrl()).toString();
  const localizedUrls = Object.fromEntries(
    locales.map((supportedLocale) => [
      supportedLocale,
      new URL(
        `/${supportedLocale}${pathname === '/' ? '' : pathname}`,
        getSiteUrl()
      ).toString(),
    ])
  );
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: localizedUrls,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonicalUrl,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function summarize(value: string, maxLength = 160): string {
  const plainText = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength - 1).trimEnd()}…`;
}
