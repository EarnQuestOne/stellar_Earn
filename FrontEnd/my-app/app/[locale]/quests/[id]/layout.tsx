import type { Metadata } from 'next';
import { createPageMetadata, getLocale, summarize } from '@/lib/seo';

type QuestMetadataRecord = {
  title?: string;
  description?: string;
};

function unwrapQuest(payload: unknown): QuestMetadataRecord | null {
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  const nestedData = record.data;

  if (nestedData && typeof nestedData === 'object') {
    const dataRecord = nestedData as Record<string, unknown>;
    if (dataRecord.data && typeof dataRecord.data === 'object') {
      return dataRecord.data as QuestMetadataRecord;
    }
    return dataRecord as QuestMetadataRecord;
  }

  return record as QuestMetadataRecord;
}

async function getQuestMetadata(
  id: string
): Promise<QuestMetadataRecord | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return null;

  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/api/v1/quests/${encodeURIComponent(id)}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(3_000) }
    );

    if (!response.ok) return null;
    return unwrapQuest(await response.json());
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  const locale = getLocale(localeParam);
  const quest = await getQuestMetadata(id);
  const shortId = id.slice(0, 8);
  const title =
    quest?.title?.trim() ||
    (locale === 'es' ? `Misión ${shortId}` : `Quest ${shortId}`);
  const fallbackDescription =
    locale === 'es'
      ? 'Consulta los requisitos, la recompensa y la fecha límite de esta misión de StellarEarn.'
      : 'Review this StellarEarn quest’s requirements, reward, and submission deadline.';

  return createPageMetadata({
    title,
    description: quest?.description
      ? summarize(quest.description)
      : fallbackDescription,
    locale,
    pathname: `/quests/${encodeURIComponent(id)}`,
  });
}

export default function QuestDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
