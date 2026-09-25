import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/admin',
        '/*/dashboard',
        '/*/notifications',
        '/*/quests/create',
        '/*/rewards',
        '/*/settings',
        '/*/submissions',
        // Debug/demo routes (also gated off in production, see #1922)
        '/*/error-panel-demo',
        '/*/test-error',
      ],
    },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
    host: siteUrl,
  };
}
