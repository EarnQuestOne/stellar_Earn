import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferrals1870000000000 implements MigrationInterface {
  name = 'AddReferrals1870000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum" AS ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "referrals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referrerId" uuid NOT NULL,
        "referredUserId" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "status" "public"."referrals_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejectionReason" text,
        "qualifiedAt" TIMESTAMP WITH TIME ZONE,
        "rewardedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referrals_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referrals_referredUserId" UNIQUE ("referredUserId")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_referrals_referrer_status" ON "referrals" ("referrerId", "status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_referrals_code" ON "referrals" ("code")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."referral_rewards_status_enum" AS ENUM('PENDING', 'CREDITED', 'FAILED', 'REJECTED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "referral_rewards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referralId" uuid NOT NULL,
        "recipientId" uuid NOT NULL,
        "amount" numeric(18,7) NOT NULL DEFAULT '50',
        "asset" character varying(32) NOT NULL DEFAULT 'XLM',
        "status" "public"."referral_rewards_status_enum" NOT NULL DEFAULT 'CREDITED',
        "idempotencyKey" character varying(255) NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_rewards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referral_rewards_idempotencyKey" UNIQUE ("idempotencyKey")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_referral_rewards_recipient" ON "referral_rewards" ("recipientId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_referral_rewards_referral" ON "referral_rewards" ("referralId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_referral_rewards_referral"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_referral_rewards_recipient"`,
    );
    await queryRunner.query(`DROP TABLE "referral_rewards"`);
    await queryRunner.query(
      `DROP TYPE "public"."referral_rewards_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_referrals_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_referrals_referrer_status"`,
    );
    await queryRunner.query(`DROP TABLE "referrals"`);
    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum"`);
  }
}
