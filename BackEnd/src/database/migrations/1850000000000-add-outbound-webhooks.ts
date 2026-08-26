import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the outbound event-subscription webhook system (issue #2306):
 * `webhook_subscriptions` (consumer registrations with encrypted signing
 * secrets) and `webhook_deliveries` (per-event delivery attempts with retry
 * and dead-letter state).
 */
export class AddOutboundWebhooks1850000000000 implements MigrationInterface {
  name = 'AddOutboundWebhooks1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "webhook_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying,
        "eventType" character varying NOT NULL,
        "targetUrl" character varying NOT NULL,
        "secretEncrypted" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_subscriptions_event_type" ON "webhook_subscriptions" ("eventType")`,
    );

    await queryRunner.query(
      `CREATE TABLE "webhook_deliveries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subscriptionId" uuid NOT NULL,
        "eventType" character varying NOT NULL,
        "eventId" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attemptCount" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 5,
        "responseCode" integer,
        "responseBody" text,
        "errorMessage" text,
        "nextRetryAt" TIMESTAMP WITH TIME ZONE,
        "lastAttemptAt" TIMESTAMP WITH TIME ZONE,
        "deadLetteredAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_webhook_deliveries" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_subscription_id" ON "webhook_deliveries" ("subscriptionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_status_next_retry" ON "webhook_deliveries" ("status", "nextRetryAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webhook_deliveries"`);
    await queryRunner.query(`DROP TABLE "webhook_subscriptions"`);
  }
}
