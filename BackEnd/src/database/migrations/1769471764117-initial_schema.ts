import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1769471764117 implements MigrationInterface {
  name = 'InitialSchema1769471764117';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "stellarAddress" TEXT NOT NULL,
        "username" TEXT,
        "email" TEXT,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "xp" INTEGER NOT NULL DEFAULT 0,
        "level" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_User" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_USER_STELLAR_ADDRESS" ON "users" ("stellarAddress")`,
    );

    await queryRunner.query(
      `CREATE TABLE "quests" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "contractTaskId" TEXT NOT NULL,
        "rewardAsset" TEXT NOT NULL,
        "rewardAmount" INTEGER NOT NULL,
        "deadline" TIMESTAMP WITH TIME ZONE,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "verifierType" TEXT NOT NULL,
        "verifierConfig" JSON NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_Quest" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "submissions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "questId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "proof" JSON NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "approvedBy" TEXT,
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "rejectedBy" TEXT,
        "rejectedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" TEXT,
        "verifierNotes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_Submission" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_SUBMISSION_QUEST_ID" ON "submissions" ("questId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_SUBMISSION_USER_ID" ON "submissions" ("userId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_SUBMISSION_STATUS" ON "submissions" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE "notifications" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "metadata" JSON,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_Notification" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_USER_ID" ON "notifications" ("userId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_READ" ON "notifications" ("read")`,
    );

    await queryRunner.query(
      `CREATE TABLE "payouts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "asset" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_Payout" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "token" TEXT NOT NULL,
        "stellarAddress" TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isRevoked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_RefreshToken" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_REFRESH_TOKEN_TOKEN" ON "refresh_tokens" ("token")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_REFRESH_TOKEN_STELLAR_ADDRESS" ON "refresh_tokens" ("stellarAddress")`,
    );

    await queryRunner.query(
      `CREATE TABLE "analytics_snapshots" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "date" DATE NOT NULL,
        "type" TEXT NOT NULL,
        "referenceId" TEXT,
        "metrics" JSONB NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_AnalyticsSnapshot" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_ANALYTICS_SNAPSHOT_DATE" ON "analytics_snapshots" ("date")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_ANALYTICS_SNAPSHOT_TYPE" ON "analytics_snapshots" ("type")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_ANALYTICS_SNAPSHOT_REFERENCE_ID" ON "analytics_snapshots" ("referenceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ANALYTICS_SNAPSHOT_REFERENCE_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ANALYTICS_SNAPSHOT_TYPE"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ANALYTICS_SNAPSHOT_DATE"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "AnalyticsSnapshot"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_STELLAR_ADDRESS"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_TOKEN"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "RefreshToken"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "Payout"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_READ"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_USER_ID"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Notification"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_USER_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_QUEST_ID"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Submission"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "Quest"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_STELLAR_ADDRESS"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "User"`);
  }
}
