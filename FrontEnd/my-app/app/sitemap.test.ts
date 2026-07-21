import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

describe('sitemap', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('always returns localized marketing and quest-listing routes', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://earn.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://earn.example.com/en',
      'https://earn.example.com/en/quests',
      'https://earn.example.com/es',
      'https://earn.example.com/es/quests',
    ]);
  });

  it('adds public quest details and creator profiles from the API', async () => {
    const address = `G${'A'.repeat(55)}`;
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://earn.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            data: [
              {
                id: 'quest-1',
                createdBy: address,
                updatedAt: '2026-07-20T12:00:00.000Z',
              },
            ],
            nextCursor: null,
          },
        }),
      })
    );

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('https://earn.example.com/en/quests/quest-1');
    expect(urls).toContain(`https://earn.example.com/en/profile/${address}`);
    expect(urls).toContain('https://earn.example.com/es/quests/quest-1');
    expect(urls).toContain(`https://earn.example.com/es/profile/${address}`);
  });
});
