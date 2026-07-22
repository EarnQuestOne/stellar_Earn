import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('quota_configs')
@Index(['tenantId'], { unique: true })
export class QuotaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Tenant/project identifier (e.g. Stellar address or org slug) */
  @Column()
  tenantId: string;

  /** Max quests allowed per period (null = unlimited) */
  @Column({ type: 'int', nullable: true, default: 100 })
  maxQuestsPerPeriod: number | null;

  /** Max total payout amount per period (null = unlimited) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 7,
    nullable: true,
    default: 10000,
  })
  maxPayoutAmountPerPeriod: number | null;

  /** Max individual payout amount (null = unlimited) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 7,
    nullable: true,
    default: 1000,
  })
  maxSinglePayoutAmount: number | null;

  /** Period in seconds (default: 86400 = 1 day) */
  @Column({ type: 'int', default: 86400 })
  periodSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
