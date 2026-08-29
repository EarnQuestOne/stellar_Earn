import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Immutable ledger of credited referral rewards.
 *
 * The unique constraint on `referralId` is the idempotency guard: a referral
 * can be credited at most once, so re-processing the same qualifying event
 * never double-credits.
 */
@Index('idx_referral_reward_referrer', ['referrerUserId'])
@Entity('referral_rewards')
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The referral this reward settles. Unique — one reward per referral. */
  @Column({ type: 'uuid', unique: true })
  referralId: string;

  @Column({ type: 'uuid' })
  referrerUserId: string;

  @Column({ type: 'uuid' })
  referredUserId: string;

  /** Reward amount in the smallest asset unit (stroops for XLM-based assets). */
  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar', length: 12, default: 'XLM' })
  assetCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
