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

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

/**
 * Submission entity for tracking quest completion attempts
 * Used for analytics on approval rates, completion times, and user engagement
 */
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  contractSubmissionId: string;

  @ManyToOne('Quest', 'submissions')
  quest: any;

  @ManyToOne('User', 'submissions')
  user: any;

  @Column({ type: 'text', nullable: true })
  proofHash: string;

  @Column({ default: 'PENDING' })
  @Index()
  status: SubmissionStatus;

  @Column({ type: 'timestamp', nullable: true })
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

  @OneToOne('Payout', 'submission')
  payout: any;
}
