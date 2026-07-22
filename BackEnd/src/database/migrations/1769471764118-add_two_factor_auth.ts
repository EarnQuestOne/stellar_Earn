import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Migration: add_two_factor_auth
 *
 * Creates the `two_factor_auth` table that stores per-user TOTP 2FA state.
 * The `secret` column is intentionally NOT indexed and should be encrypted
 * at rest in production via a column transformer or database-level encryption.
 */
export class AddTwoFactorAuth1769471764118 implements MigrationInterface {
  name = 'AddTwoFactorAuth1769471764118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'two_factor_auth',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'stellarAddress',
            type: 'varchar',
            length: '56',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'secret',
            type: 'varchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lastVerifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_two_factor_auth_stellarAddress" ON "two_factor_auth" ("stellarAddress")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'two_factor_auth',
      'IDX_two_factor_auth_stellarAddress',
    );
    await queryRunner.dropTable('two_factor_auth');
  }
}
