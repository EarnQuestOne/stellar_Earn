import type { Metadata } from 'next';

/**
 * Shared OpenGraph defaults for all public routes (#2228).
 * Import and spread into each route's generateMetadata / metadata export.
 */
export const defaultOpenGraph: Metadata['openGraph'] = {
  siteName: 'StellarEarn',
  type: 'website',
  locale: 'en_US',
};

/** Builds a complete Metadata object for a public page */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${path}`;
  const ogImage = image ?? '/og-default.png';

  return {
    title: `${title} | StellarEarn`,
    description,
    openGraph: {
      ...defaultOpenGraph,
      title,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical: url },
  };
}