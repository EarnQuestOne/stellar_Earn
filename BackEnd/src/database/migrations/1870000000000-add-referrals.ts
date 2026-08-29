import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: referral & invitation program tables (#2357).
 *
 * `referral_codes` holds each user's stable, unique code. `referrals` is the
 * attribution ledger (unique on `referredUserId`, so a user is attributable to
 * at most one referrer). `referral_rewards` is the credited-reward ledger
 * (unique on `referralId` — the idempotency guard against double-crediting).
 */
export class AddReferrals1870000000000 implements MigrationInterface {
  name = 'AddReferrals1870000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "code" character varying(32) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referral_codes_user" UNIQUE ("userId"),
        CONSTRAINT "UQ_referral_codes_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referrerUserId" uuid NOT NULL,
        "referredUserId" uuid NOT NULL,
        "code" character varying(32) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "rejectionReason" text,
        "qualifiedAt" TIMESTAMP WITH TIME ZONE,
        "rewardedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referrals_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referrals_referred_user" UNIQUE ("referredUserId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_referral_referrer" ON "referrals" ("referrerUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_referral_status" ON "referrals" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_rewards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referralId" uuid NOT NULL,
        "referrerUserId" uuid NOT NULL,
        "referredUserId" uuid NOT NULL,
        "amount" bigint NOT NULL,
        "assetCode" character varying(12) NOT NULL DEFAULT 'XLM',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_rewards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referral_rewards_referral" UNIQUE ("referralId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_referral_reward_referrer" ON "referral_rewards" ("referrerUserId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_rewards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referrals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_codes"`);
  }
}
