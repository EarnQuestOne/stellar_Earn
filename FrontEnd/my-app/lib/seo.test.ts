import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPageMetadata, getSiteUrl, summarize } from './seo';

describe('SEO helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes the configured public site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://earn.example.com/path');

    expect(getSiteUrl()).toBe('https://earn.example.com');
  });

  it('creates canonical, OpenGraph, and Twitter metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://earn.example.com');

    const metadata = createPageMetadata({
      title: 'Quest Board',
      description: 'Browse public quests.',
      locale: 'en',
      pathname: '/quests',
    });

    expect(metadata.title).toBe('Quest Board | StellarEarn');
    expect(metadata.alternates?.canonical).toBe(
      'https://earn.example.com/en/quests'
    );
    expect(metadata.openGraph).toMatchObject({
      title: 'Quest Board | StellarEarn',
      url: 'https://earn.example.com/en/quests',
      locale: 'en_US',
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary' });
  });

  it('removes markup and limits social descriptions', () => {
    expect(summarize('<p>A   useful quest</p>', 12)).toBe('A useful qu…');
  });
});
