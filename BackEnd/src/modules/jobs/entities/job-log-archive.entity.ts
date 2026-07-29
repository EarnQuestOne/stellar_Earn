import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { JobStatus, JobType } from '../job.types';

/**
 * Job Log Archive Entity
 *
 * Mirrors the active `JobLog` schema but lives in a separate table
 * (`job_logs_archive`).  Completed and failed jobs older than the
 * retention window are moved here by the archival service, keeping the
 * active table small and fast.
 *
 * Indexes are intentionally kept minimal — archived rows are rarely
 * queried and typically scanned in bulk for compliance exports.
 */
@Entity('job_logs_archive')
@Index('idx_archive_job_logs_created', ['createdAt'])
@Index('idx_archive_job_logs_job_type', ['jobType'])
export class JobLogArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  jobType: JobType;

  @Column({ type: 'varchar', nullable: true })
  externalJobId: string;

  @Column({ type: 'enum', enum: JobStatus })
  status: JobStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  queueName: string;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ type: 'int', default: 0 })
  maxAttempts: number;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  errorStack: string;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'bigint', nullable: true })
  processedAtTimestamp: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  correlationId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  traceId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: false })
  isRetryable: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  parentJobId: string;

  @Column({ type: 'simple-array', nullable: true })
  dependentJobIds: string[];

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  progressMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;
}
