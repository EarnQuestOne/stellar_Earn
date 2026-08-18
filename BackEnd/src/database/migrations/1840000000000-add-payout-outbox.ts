import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: create the `payout_outbox` table (#2158).
 *
 * Backs the transactional outbox for on-chain payout execution. The unique
 * index on `idempotencyKey` is what makes relaying exactly-once, and the
 * `status` index keeps the relay's "claim next pending" query cheap.
 */
export class AddPayoutOutbox1840000000000 implements MigrationInterface {
  name = 'AddPayoutOutbox1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payoutId" uuid NOT NULL,
        "idempotencyKey" character varying NOT NULL,
        "recipientAddress" character varying NOT NULL,
        "amount" numeric(20,7) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "transactionHash" character varying(128),
        "lastError" text,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_outbox_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payout_outbox_idempotency_key" UNIQUE ("idempotencyKey")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_outbox_payout" ON "payout_outbox" ("payoutId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_outbox_status" ON "payout_outbox" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_outbox_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_outbox_payout"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_outbox"`);
  }
}
