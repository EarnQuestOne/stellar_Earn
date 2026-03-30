import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { JobStatus, JobType } from './job.types';

/**
 * Job Log Entity
 * Audit trail for all background job executions
 * Enables monitoring, debugging, and compliance tracking
 */
@Entity('job_logs')
@Index('idx_job_logs_status', ['status'])
@Index('idx_job_logs_job_type', ['jobType'])
@Index('idx_job_logs_organization', ['organizationId'])
@Index('idx_job_logs_user', ['userId'])
@Index('idx_job_logs_created', ['createdAt'])
@Index('idx_job_logs_external_id', ['externalJobId'])
@Index('idx_job_logs_status_created', ['status', 'createdAt'])
@Index('idx_job_logs_organization_status', ['organizationId', 'status'])
export class JobLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  jobType: JobType;

  @Column({ type: 'varchar', nullable: true })
  externalJobId: string; // BullMQ job ID reference

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
  durationMs: number; // Job execution duration

  @Column({ type: 'bigint', nullable: true })
  processedAtTimestamp: number; // Unix timestamp in milliseconds

  @Column({ type: 'varchar', length: 36, nullable: true })
  correlationId: string; // For tracing related jobs

  @Column({ type: 'varchar', length: 36, nullable: true })
  traceId: string; // Distributed tracing ID

  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: false })
  isRetryable: boolean; // Whether this job can be retried

  @Column({ type: 'varchar', length: 36, nullable: true })
  parentJobId: string; // For dependent jobs

  @Column({ type: 'simple-array', nullable: true })
  dependentJobIds: string[]; // Jobs that depend on this one

  @Column({ type: 'int', default: 0 })
  progress: number; // 0-100 percentage

  @Column({ type: 'varchar', length: 255, nullable: true })
  progressMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date; // When scheduled for processing

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date; // When processing started

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date; // When processing completed

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date; // When next retry will occur

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // For log retention policies

  // Relations - Optional, for more complex queries
  @OneToMany('JobLogRetry', 'jobLog', { lazy: true })
  retries: any[];

  // Helper methods
  getStatus(): JobStatus {
    return this.status;
  }

  isCompleted(): boolean {
    return this.status === JobStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === JobStatus.FAILED;
  }

  isPending(): boolean {
    return this.status === JobStatus.PENDING;
  }

  getSuccessRate(): number {
    if (this.maxAttempts === 0) return 0;
    return ((this.maxAttempts - this.attempt) / this.maxAttempts) * 100;
  }
}

/**
 * Job Log Retry Entity
 * Tracks retry history for failed jobs
 */
@Entity('job_log_retries')
@Index('idx_job_log_retries_job', ['jobLogId'])
@Index('idx_job_log_retries_status', ['status'])
export class JobLogRetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  jobLogId: string;

  @ManyToOne('JobLog', 'retries', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobLogId' })
  jobLog: JobLog;

  @Column({ type: 'int' })
  attemptNumber: number;

  @Column({ type: 'enum', enum: JobStatus })
  status: JobStatus;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Job Dependency Registry Entity
 * Tracks job dependencies for sequential/parallel execution
 */
@Entity('job_dependencies')
@Index('idx_job_dependencies_parent', ['parentJobId'])
@Index('idx_job_dependencies_child', ['childJobId'])
@Index('idx_job_dependencies_status', ['status'])
export class JobDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  parentJobId: string; // Job that must complete first

  @Column({ type: 'varchar', length: 36 })
  childJobId: string; // Job that depends on parent

  @Column({ type: 'enum', enum: JobStatus })
  status: JobStatus; // PENDING or RESOLVED

  @Column({ type: 'int', default: 0 })
  executionOrder: number; // For managing parallel/sequential execution

  @Column({ type: 'boolean', default: true })
  blockOnFailure: boolean; // If true, child won't run if parent fails

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Job Schedule Entity
 * Manages recurring/scheduled job execution
 */
@Entity('job_schedules')
@Index('idx_job_schedules_type', ['jobType'])
@Index('idx_job_schedules_active', ['isActive'])
@Index('idx_job_schedules_next_run', ['nextRunAt'])
export class JobSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  jobType: JobType;

  @Column({ type: 'varchar', length: 255 })
  cronExpression: string; // Standard cron format

  @Column({ type: 'varchar', length: 255, nullable: true })
  timezone: string; // e.g., 'America/New_York'

  @Column({ type: 'jsonb', nullable: true })
  jobPayload: Record<string, any>;

  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'varchar', max: 255, nullable: true })
  lastErrorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  disabledAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;
}
