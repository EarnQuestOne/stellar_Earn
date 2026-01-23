import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY_SCHEDULED = 'retry_scheduled',
}

export enum PayoutType {
  QUEST_REWARD = 'quest_reward',
  BONUS = 'bonus',
  REFERRAL = 'referral',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  stellarAddress: string;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  amount: number;

  @Column({ default: 'XLM' })
  asset: string;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  @Index()
  status: PayoutStatus;

  @Column({
    type: 'enum',
    enum: PayoutType,
    default: PayoutType.QUEST_REWARD,
  })
  type: PayoutType;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  questId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  submissionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'int', nullable: true })
  stellarLedger: number | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if payout can be retried
  canRetry(): boolean {
    return (
      this.status === PayoutStatus.FAILED &&
      this.retryCount < this.maxRetries
    );
  }

  // Helper method to check if payout is claimable
  isClaimable(): boolean {
    return this.status === PayoutStatus.PENDING && !this.claimedAt;
  }
}
