import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Attribution lifecycle for a single referred user.
 *
 * `PENDING` on signup → `QUALIFIED` once the referred user hits the qualifying
 * milestone (their first approved submission) → `REWARDED` once the referrer's
 * reward is credited (exactly once). `REJECTED` covers anti-abuse failures
 * (self-referral, circular/duplicate attribution).
 */
export enum ReferralStatus {
  PENDING = 'PENDING',
  QUALIFIED = 'QUALIFIED',
  REWARDED = 'REWARDED',
  REJECTED = 'REJECTED',
}

/**
 * One attribution row per referred user. The unique constraint on
 * `referredUserId` is what makes a signup attributable to at most one referrer
 * (duplicate attribution is impossible at the storage layer).
 */
@Index('idx_referral_referrer', ['referrerUserId'])
@Index('idx_referral_status', ['status'])
@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The user who owns the referral code (the inviter). */
  @Column({ type: 'uuid' })
  referrerUserId: string;

  /** The newly signed-up user attributed to the referrer. At most one per user. */
  @Column({ type: 'uuid', unique: true })
  referredUserId: string;

  /** The referral code that was used at signup. */
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  /** Populated when a referral is rejected by anti-abuse checks. */
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  qualifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rewardedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
