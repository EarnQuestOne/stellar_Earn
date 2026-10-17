import type {
  PaginatedQuestsResponse,
  QuestQueryParams,
} from '@/lib/types/api.types';

/**
 * Server-side quest data fetching for React Server Components.
 *
 * Moving quest listing/detail fetches to the server removes client-side
 * fetch waterfalls and keeps fetching logic out of the browser bundle. Pair
 * with a Suspense boundary (see `QuestListServer`) to stream content.
 */

const API_VERSION = 'v1';

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
}

/**
 * Build the query string for the quests endpoint from filter/pagination params.
 * Pure and side-effect free so it can be unit tested without a network call.
 */
export function buildQuestsSearchParams(params: QuestQueryParams = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }

  return search.toString();
}

export interface GetQuestsServerOptions {
  /** ISR revalidation window in seconds. */
  revalidate?: number;
}

/**
 * Fetch a page of quests on the server. Intended for use inside Server
 * Components; the result can be streamed to the client via Suspense.
 */
export async function getQuestsServer(
  params: QuestQueryParams = {},
  options: GetQuestsServerOptions = {}
): Promise<PaginatedQuestsResponse> {
  const query = buildQuestsSearchParams(params);
  const url = `${apiBaseUrl()}/api/${API_VERSION}/quests${
    query ? `?${query}` : ''
  }`;

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: options.revalidate ?? 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quests: ${response.status}`);
  }

  return (await response.json()) as PaginatedQuestsResponse;
}
