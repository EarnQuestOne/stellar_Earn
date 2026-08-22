import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

describe('robots', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows public pages and keeps private application routes out of search', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://earn.example.com');

    const result = robots();

    expect(result.sitemap).toBe('https://earn.example.com/sitemap.xml');
    expect(result.host).toBe('https://earn.example.com');
    expect(result.rules).toMatchObject({
      userAgent: '*',
      allow: '/',
      disallow: expect.arrayContaining([
        '/*/admin',
        '/*/dashboard',
        '/*/settings',
      ]),
    });
  });
});
