import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeatureFlagAuditLogsTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feature_flag_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'flagId',
            type: 'uuid',
          },
          {
            name: 'flagKey',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'action',
            type: 'enum',
            enum: [
              'CREATED',
              'UPDATED',
              'DELETED',
              'ACTIVATED',
              'DEACTIVATED',
              'ROLLOUT_CHANGED',
              'USER_LIST_CHANGED',
              'SEGMENT_CHANGED',
            ],
          },
          {
            name: 'previousValue',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'newValue',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'performedBy',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'feature_flag_audit_logs',
      new TableIndex({
        name: 'IDX_feature_flag_audit_logs_flagId',
        columnNames: ['flagId'],
      }),
    );

    await queryRunner.createIndex(
      'feature_flag_audit_logs',
      new TableIndex({
        name: 'IDX_feature_flag_audit_logs_flagKey',
        columnNames: ['flagKey'],
      }),
    );

    await queryRunner.createIndex(
      'feature_flag_audit_logs',
      new TableIndex({
        name: 'IDX_feature_flag_audit_logs_performedBy',
        columnNames: ['performedBy'],
      }),
    );

    await queryRunner.createIndex(
      'feature_flag_audit_logs',
      new TableIndex({
        name: 'IDX_feature_flag_audit_logs_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'feature_flag_audit_logs',
      'IDX_feature_flag_audit_logs_createdAt',
    );
    await queryRunner.dropIndex(
      'feature_flag_audit_logs',
      'IDX_feature_flag_audit_logs_performedBy',
    );
    await queryRunner.dropIndex(
      'feature_flag_audit_logs',
      'IDX_feature_flag_audit_logs_flagKey',
    );
    await queryRunner.dropIndex(
      'feature_flag_audit_logs',
      'IDX_feature_flag_audit_logs_flagId',
    );
    await queryRunner.dropTable('feature_flag_audit_logs');
  }
}
