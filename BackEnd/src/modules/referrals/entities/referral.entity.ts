import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReferralReward } from './referral-reward.entity';

export enum ReferralStatus {
  PENDING = 'PENDING',
  QUALIFIED = 'QUALIFIED',
  REWARDED = 'REWARDED',
  REJECTED = 'REJECTED',
}

@Entity('referrals')
@Index('idx_referrals_referrer_status', ['referrerId', 'status'])
@Index('idx_referrals_referred_user', ['referredUserId'], { unique: true })
@Index('idx_referrals_code', ['code'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column({ type: 'uuid', unique: true })
  referredUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  qualifiedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rewardedAt: Date | null;

  @OneToMany(() => ReferralReward, (reward) => reward.referral)
  rewards: ReferralReward[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
