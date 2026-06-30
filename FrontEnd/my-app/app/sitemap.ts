import type { MetadataRoute } from 'next';
import { getQuests } from '@/lib/api/quests';
import { locales } from '@/lib/i18n/config';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://stellarearn.app';

// Static, locale-independent-content routes worth indexing.
const STATIC_ROUTES = ['', '/quests', '/rewards'];

const QUEST_PAGE_SIZE = 100;
const MAX_QUEST_PAGES = 50; // safety cap (~5,000 quests) so a runaway API can't hang the build

async function getActiveQuestIds(): Promise<string[]> {
  const ids: string[] = [];

  try {
    let page = 1;
    let totalPages = 1;

    do {
      const result = await getQuests({ status: 'Active', page, limit: QUEST_PAGE_SIZE });
      ids.push(...result.quests.map((quest) => quest.id));
      totalPages = result.totalPages || 1;
      page += 1;
    } while (page <= totalPages && page <= MAX_QUEST_PAGES);
  } catch {
    // If the API is unreachable at build/request time, fall back to the
    // static routes only rather than failing the whole sitemap.
  }

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const questIds = await getActiveQuestIds();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}/${locale}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? 'daily' : 'hourly',
      priority: route === '' ? 1 : 0.8,
    })),
  );

  const questEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    questIds.map((id) => ({
      url: `${SITE_URL}/${locale}/quests/${id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    })),
  );

  return [...staticEntries, ...questEntries];
}