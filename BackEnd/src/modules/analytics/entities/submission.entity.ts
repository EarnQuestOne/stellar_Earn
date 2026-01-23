import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Quest } from './quest.entity';
import { Payout } from './payout.entity';

export enum SubmissionStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PAID = 'Paid',
}

/**
 * Submission entity for tracking quest completion attempts
 * Used for analytics on approval rates, completion times, and user engagement
 */
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  contractSubmissionId: string;

  @ManyToOne(() => Quest, (quest) => quest.submissions)
  quest: Quest;

  @ManyToOne(() => User, (user) => user.submissions)
  user: User;

  @Column({ type: 'text' })
  proofHash: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  @Index()
  status: SubmissionStatus;

  @Column({ type: 'timestamp' })
  @Index()
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @OneToOne(() => Payout, (payout) => payout.submission)
  payout: Payout;
}
