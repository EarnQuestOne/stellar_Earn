/**
 * Batches per-address reputation lookups into a single call instead of
 * fetching one address at a time. Closes #1969.
 */
export type ReputationLookup = (
  addresses: string[],
) => Promise<Map<string, number>>;

export async function batchFetchReputationMap(
  addresses: string[],
  lookup: ReputationLookup,
): Promise<Map<string, number>> {
  const distinct = Array.from(new Set(addresses));
  if (distinct.length === 0) return new Map();
  return lookup(distinct);
}

export function enrichWithReputation<T extends { createdBy: string }>(
  items: T[],
  reputationByAddress: Map<string, number>,
): (T & { creatorReputation: number })[] {
  return items.map((item) => ({
    ...item,
    creatorReputation: reputationByAddress.get(item.createdBy) ?? 0,
  }));
}
