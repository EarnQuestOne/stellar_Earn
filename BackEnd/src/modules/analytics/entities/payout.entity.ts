import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Submission } from './submission.entity';

/**
 * Payout entity for tracking reward distributions
 * Used for analytics on reward amounts, payment timing, and transaction history
 */
@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Submission, (submission) => submission.payout)
  @JoinColumn()
  submission: Submission;

  @ManyToOne(() => User)
  recipient: User;

  @Column({ type: 'bigint' })
  amount: string;

  @Column()
  assetCode: string;

  @Column()
  transactionHash: string;

  @Column({ type: 'timestamp' })
  @Index()
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;
}
