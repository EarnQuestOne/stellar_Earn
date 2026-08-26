import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: create `webhook_subscriptions` and `webhook_deliveries` (#2306).
 *
 * Backs the outbound event-subscription webhook system. Deliveries carry
 * their own attempt/backoff state in Postgres, so the composite index on
 * (status, "nextRetryAt") is what keeps the retry scheduler's claim query
 * cheap as the table grows.
 */
export class AddOutboundWebhookTables1850000000000 implements MigrationInterface {
  name = 'AddOutboundWebhookTables1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "label" character varying(120) NOT NULL,
        "targetUrl" character varying(2048) NOT NULL,
        "eventTypes" text NOT NULL,
        "secretCiphertext" character varying(512) NOT NULL,
        "secretHint" character varying(8) NOT NULL,
        "state" character varying NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_subscriptions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_subscriptions_state" ON "webhook_subscriptions" ("state")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "eventType" character varying(120) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 5,
        "responseStatusCode" integer,
        "lastError" character varying(512),
        "nextRetryAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "deadLetteredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_deliveries_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_status_next_retry" ON "webhook_deliveries" ("status", "nextRetryAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_subscription" ON "webhook_deliveries" ("subscriptionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_webhook_deliveries_subscription"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_webhook_deliveries_status_next_retry"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_webhook_subscriptions_state"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_subscriptions"`);
  }
}
