import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add unique constraint on quota usage rows
 *
 * Concurrent first-time requests for the same quota period could previously
 * both insert a `quota_usages` row, because the `ON CONFLICT DO NOTHING`
 * inserts in QuotaService had no DB-level unique index to back them.
 *
 * This migration:
 *   1. Deduplicates any rows already created by that race, keeping the single
 *      row with the highest usage counters per
 *      (tenantId, resourceType, periodStart).
 *   2. Creates a unique index on (tenantId, resourceType, periodStart) so the
 *      upsert-style inserts are truly atomic.
 *
 * See https://github.com/EarnQuestOne/stellar_Earn/issues/1904
 */
export class AddQuotaUsageUniqueIndex1820000000100 implements MigrationInterface {
  name = 'AddQuotaUsageUniqueIndex1820000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keep the single row with the highest counters per unique period and
    // remove duplicates left behind by the former find-then-create race.
    await queryRunner.query(`
      DELETE FROM "quota_usages" a
      USING "quota_usages" b
      WHERE a."id" <> b."id"
        AND a."tenantId" = b."tenantId"
        AND a."resourceType" = b."resourceType"
        AND a."periodStart" = b."periodStart"
        AND (
          a."questCount" < b."questCount"
          OR (
            a."questCount" = b."questCount"
            AND (
              a."payoutAmount" < b."payoutAmount"
              OR (
                a."payoutAmount" = b."payoutAmount"
                AND a."id" > b."id"
              )
            )
          )
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_quota_usages_tenant_resource_period"
      ON "quota_usages" ("tenantId", "resourceType", "periodStart")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_quota_usages_tenant_resource_period"`,
    );
  }
}
