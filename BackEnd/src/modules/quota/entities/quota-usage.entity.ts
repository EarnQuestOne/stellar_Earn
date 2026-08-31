import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum QuotaResourceType {
  QUEST = 'quest',
  PAYOUT = 'payout',
}

@Entity('quota_usages')
@Index(
  'UQ_quota_usages_tenant_resource_period',
  ['tenantId', 'resourceType', 'periodStart'],
  { unique: true },
)
export class QuotaUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'enum', enum: QuotaResourceType })
  resourceType: QuotaResourceType;

  /** Start of the current quota period */
  @Column({ type: 'timestamp' })
  periodStart: Date;

  /** Count of quests created in this period */
  @Column({ type: 'int', default: 0 })
  questCount: number;

  /** Total payout amount in this period */
  @Column({ type: 'decimal', precision: 18, scale: 7, default: 0 })
  payoutAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
