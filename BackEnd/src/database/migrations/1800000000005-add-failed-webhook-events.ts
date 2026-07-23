import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFailedWebhookEvents1800000000005 implements MigrationInterface {
  name = 'AddFailedWebhookEvents1800000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "failed_webhook_events" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "eventId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "signature" TEXT,
        "failureReason" TEXT NOT NULL,
        "errorHistory" JSONB NOT NULL DEFAULT '[]',
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "maxAttempts" INTEGER NOT NULL DEFAULT 5,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "nextRetryAt" TIMESTAMP,
        "lastAttemptAt" TIMESTAMP,
        "resolvedAt" TIMESTAMP,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_FailedWebhookEvent" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_failed_webhook_events_eventId" ON "failed_webhook_events" ("eventId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_failed_webhook_events_source" ON "failed_webhook_events" ("source")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_failed_webhook_events_status_nextRetryAt" ON "failed_webhook_events" ("status", "nextRetryAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_failed_webhook_events_status_nextRetryAt"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_failed_webhook_events_source"`);
    await queryRunner.query(`DROP INDEX "IDX_failed_webhook_events_eventId"`);
    await queryRunner.query(`DROP TABLE "failed_webhook_events"`);
  }
}
