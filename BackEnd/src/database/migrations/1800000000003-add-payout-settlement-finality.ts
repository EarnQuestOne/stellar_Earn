import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutSettlementFinality1800000000003 implements MigrationInterface {
  name = 'AddPayoutSettlementFinality1800000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "settlementConfirmations" INTEGER NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "settlementConfirmedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "settlementConfirmedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "settlementConfirmations"`,
    );
  }
}
