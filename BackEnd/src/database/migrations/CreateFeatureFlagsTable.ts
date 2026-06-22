import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeatureFlagsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feature_flags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'rolloutStrategy',
            type: 'enum',
            enum: [
              'BOOLEAN',
              'PERCENTAGE',
              'USER_WHITELIST',
              'USER_BLACKLIST',
              'SEGMENT_BASED',
            ],
            default: "'BOOLEAN'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'],
            default: "'DRAFT'",
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'rolloutPercentage',
            type: 'int',
            default: 0,
          },
          {
            name: 'whitelistedUsers',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'blacklistedUsers',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'segmentRules',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'scheduledActivationAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'scheduledDeactivationAt',
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

    await queryRunner.createIndex(
      'feature_flags',
      new TableIndex({
        name: 'IDX_feature_flags_key',
        columnNames: ['key'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('feature_flags', 'IDX_feature_flags_key');
    await queryRunner.dropTable('feature_flags');
  }
}
