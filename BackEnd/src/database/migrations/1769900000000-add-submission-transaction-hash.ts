import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `transactionHash` column to `submissions` so that
 * SubmissionsService.approveSubmission can persist the on-chain tx hash
 * returned by StellarService.approveSubmission (which calls the
 * Soroban `approve_submission` contract method).
 */
export class AddSubmissionTransactionHash1769900000000
  implements MigrationInterface
{
  name = 'AddSubmissionTransactionHash1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD "transactionHash" varchar(128)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN "transactionHash"`,
    );
  }
}
