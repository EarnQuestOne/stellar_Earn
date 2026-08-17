import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddSubmissionUserCreatedAtIndex
 *
 * Composite index backing the user submission-history query
 * (`WHERE "userId" = ? ORDER BY "createdAt" DESC, "id" DESC`).
 *
 * Keyset (cursor) pagination pages through this index with
 * `(createdAt < :cv OR (createdAt = :cv AND id < :idv))` predicates, so the
 * tiebreaker `id` column is intentionally part of the index. Without the
 * composite index Postgres falls back to a sequential scan + sort for deep
 * pages; with it each page is an index-only walk of `limit + 1` rows.
 *
 * `CREATE INDEX IF NOT EXISTS` keeps the migration idempotent — earlier
 * cursor-pagination migrations (e.g. `AddCursorPaginationIndexes`) may
 * already have created the same index on environments with full migration
 * history, and this guarantees it independently for environments that did not.
 */
export class AddSubmissionUserCreatedAtIndex1820000000200 implements MigrationInterface {
  name = 'AddSubmissionUserCreatedAtIndex1820000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_submissions_user_created_at_id"
      ON "submissions" ("userId", "createdAt" DESC, "id" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_submissions_user_created_at_id"`,
    );
  }
}
