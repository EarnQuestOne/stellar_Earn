import type { SelectQueryBuilder } from 'typeorm';
import type { Quest } from '../entities/quest.entity';

/**
 * Columns needed to render the quest list view, so listing queries don't
 * hydrate large fields (description, verifierConfig) only the detail view
 * needs. Apply via applyListProjection when wiring into a list query.
 * Closes #1968.
 */
export const QUEST_LIST_COLUMNS = [
  'quest.id',
  'quest.title',
  'quest.rewardAmount',
  'quest.status',
  'quest.createdBy',
  'quest.createdAt',
  'quest.difficulty',
] as const;

export function applyListProjection(
  qb: SelectQueryBuilder<Quest>,
): SelectQueryBuilder<Quest> {
  return qb.select([...QUEST_LIST_COLUMNS]);
}
