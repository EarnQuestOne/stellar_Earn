import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Stable, unique referral code for a user.
 *
 * A row is created once on first request and returned thereafter, so a user's
 * code never changes. Both `userId` and `code` are unique, which keeps
 * generation collision-free and lets a code be resolved back to its owner.
 */
@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @CreateDateColumn()
  createdAt: Date;
}
