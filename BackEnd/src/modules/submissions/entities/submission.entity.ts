import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  DeleteDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { SubmissionStatus } from '../submission-status';

@Index('idx_submission_active_quest_status', ['questId', 'status'], {
  where: '"deletedAt" IS NULL',
})
@Index('idx_submission_active_user_status', ['userId', 'status'], {
  where: '"deletedAt" IS NULL',
})
@Index('uq_submission_user_quest', ['userId', 'questId'], { unique: true })
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  questId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'json' })
  proof: any;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  withdrawnAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true })
  verifierNotes: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Optimistic-concurrency token — auto-incremented by TypeORM on each save of
   * a managed entity; a stale-version save is rejected, preventing lost updates
   * (e.g. a status transition racing with an edit) (#2157).
   */
  @VersionColumn()
  version: number;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne('User', 'submissions')
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: any;

  @ManyToOne('Quest', 'submissions')
  @JoinColumn({ name: 'questId', referencedColumnName: 'id' })
  quest: any;
}