import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStellarEventStoreColumns1800000000001 implements MigrationInterface {
  name = 'AddStellarEventStoreColumns1800000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD COLUMN IF NOT EXISTS "source" character varying NOT NULL DEFAULT 'application'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD COLUMN IF NOT EXISTS "sourceId" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD COLUMN IF NOT EXISTS "contractId" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD COLUMN IF NOT EXISTS "transactionHash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD COLUMN IF NOT EXISTS "ledger" integer`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_EVENT_STORE_SOURCE_ID" ON "event_store" ("sourceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_EVENT_STORE_SOURCE_CONTRACT_LEDGER" ON "event_store" ("source", "contractId", "ledger")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_EVENT_STORE_SOURCE" ON "event_store" ("source")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EVENT_STORE_SOURCE"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_EVENT_STORE_SOURCE_CONTRACT_LEDGER"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EVENT_STORE_SOURCE_ID"`);
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN IF EXISTS "ledger"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN IF EXISTS "transactionHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN IF EXISTS "contractId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN IF EXISTS "sourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN IF EXISTS "source"`,
    );
  }
}
