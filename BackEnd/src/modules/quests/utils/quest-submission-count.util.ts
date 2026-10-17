import type { SelectQueryBuilder } from 'typeorm';

/**
 * Attach submission counts to a quest list query via a single JOIN +
 * GROUP BY instead of issuing one count query per quest (N+1).
 * Closes #1966.
 */
export function withSubmissionCounts(
  qb: SelectQueryBuilder<any>,
): SelectQueryBuilder<any> {
  return qb
    .leftJoin(
      'submissions',
      'submission',
      'submission."questId" = quest.id AND submission."deletedAt" IS NULL',
    )
    .addSelect('COUNT(submission.id)', 'submissionscount')
    .groupBy('quest.id');
}

export function mapSubmissionCounts(
  rawResults: { submissionscount: string }[],
): number[] {
  return rawResults.map((r) => parseInt(r.submissionscount, 10) || 0);
}
