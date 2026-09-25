import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: create the outbound-webhook tables (#2306).
 *
 * `webhook_subscriptions` holds third-party registrations (target URL, selected
 * event types, encrypted signing secret, active/paused state). `webhook_deliveries`
 * is one durable row per (subscription, dispatched event) so delivery status,
 * attempt counts, and dead-lettering survive restarts and stay queryable.
 */
export class AddOutboundWebhooks1850000000000 implements MigrationInterface {
  name = 'AddOutboundWebhooks1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200),
        "targetUrl" character varying(2048) NOT NULL,
        "eventTypes" text NOT NULL,
        "encryptedSecret" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_subscriptions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_subscription_status" ON "webhook_subscriptions" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "eventType" character varying(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "attemptCount" integer NOT NULL DEFAULT 0,
        "responseStatusCode" integer,
        "lastError" text,
        "nextRetryAt" TIMESTAMP WITH TIME ZONE,
        "deadLettered" boolean NOT NULL DEFAULT false,
        "deliveredAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_deliveries_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_delivery_subscription" ON "webhook_deliveries" ("subscriptionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_delivery_status" ON "webhook_deliveries" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_subscriptions"`);
  }
}
