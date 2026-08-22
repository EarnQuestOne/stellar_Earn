import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';
import { getSiteUrl } from '@/lib/seo';

type PublicQuest = {
  id: string;
  createdBy?: string;
  updatedAt?: string;
};

type QuestPage = {
  quests: PublicQuest[];
  nextCursor?: string;
};

const STELLAR_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
const MAX_QUEST_PAGES = 50;

function readQuestPage(payload: unknown): QuestPage {
  if (!payload || typeof payload !== 'object') return { quests: [] };

  const record = payload as Record<string, unknown>;
  const responseData =
    record.data &&
    typeof record.data === 'object' &&
    !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : record;
  const quests = Array.isArray(responseData.data)
    ? responseData.data
    : Array.isArray(responseData.quests)
      ? responseData.quests
      : [];

  return {
    quests: quests.filter(
      (quest): quest is PublicQuest =>
        !!quest &&
        typeof quest === 'object' &&
        typeof (quest as PublicQuest).id === 'string'
    ),
    nextCursor:
      typeof responseData.nextCursor === 'string'
        ? responseData.nextCursor
        : undefined,
  };
}

async function getPublicQuests(): Promise<PublicQuest[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return [];

  const quests: PublicQuest[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  try {
    for (let page = 0; page < MAX_QUEST_PAGES; page += 1) {
      const url = new URL(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/quests`);
      url.searchParams.set('limit', '100');
      url.searchParams.set('status', 'ACTIVE');
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url, {
        next: { revalidate: 3_600 },
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) break;

      const result = readQuestPage(await response.json());
      quests.push(...result.quests);

      if (!result.nextCursor || seenCursors.has(result.nextCursor)) break;
      seenCursors.add(result.nextCursor);
      cursor = result.nextCursor;
    }
  } catch {
    // Static public routes remain available when the API is offline.
  }

  return quests;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const publicQuests = await getPublicQuests();
  const profileAddresses = new Set(
    publicQuests
      .map((quest) => quest.createdBy)
      .filter(
        (address): address is string =>
          typeof address === 'string' && STELLAR_ADDRESS_PATTERN.test(address)
      )
  );

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push(
      {
        url: new URL(`/${locale}`, siteUrl).toString(),
        changeFrequency: 'weekly',
        priority: 1,
      },
      {
        url: new URL(`/${locale}/quests`, siteUrl).toString(),
        changeFrequency: 'hourly',
        priority: 0.9,
      }
    );

    for (const quest of publicQuests) {
      entries.push({
        url: new URL(
          `/${locale}/quests/${encodeURIComponent(quest.id)}`,
          siteUrl
        ).toString(),
        lastModified: quest.updatedAt ? new Date(quest.updatedAt) : undefined,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }

    for (const address of profileAddresses) {
      entries.push({
        url: new URL(
          `/${locale}/profile/${encodeURIComponent(address)}`,
          siteUrl
        ).toString(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  return entries;
}
