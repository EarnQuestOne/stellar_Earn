import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Referral } from './referral.entity';

export enum ReferralRewardStatus {
  PENDING = 'PENDING',
  CREDITED = 'CREDITED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

@Entity('referral_rewards')
@Index('idx_referral_rewards_recipient', ['recipientId'])
@Index('idx_referral_rewards_referral', ['referralId'])
@Index('idx_referral_rewards_idempotency_key', ['idempotencyKey'], {
  unique: true,
})
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referralId: string;

  @ManyToOne(() => Referral, (referral) => referral.rewards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'referralId' })
  referral: Referral;

  @Column({ type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'numeric', precision: 18, scale: 7, default: 50 })
  amount: number | string;

  @Column({ type: 'varchar', length: 32, default: 'XLM' })
  asset: string;

  @Column({
    type: 'enum',
    enum: ReferralRewardStatus,
    default: ReferralRewardStatus.CREDITED,
  })
  status: ReferralRewardStatus;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
