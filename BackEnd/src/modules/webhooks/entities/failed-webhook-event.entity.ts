import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FailedWebhookStatus {
  /** Awaiting its next scheduled retry attempt. */
  PENDING = 'pending',
  /** A retry attempt is currently in flight. */
  RETRYING = 'retrying',
  /** Reprocessing eventually succeeded. */
  SUCCEEDED = 'succeeded',
  /** Exhausted all retry attempts, or failed for a non-retryable reason. */
  DEAD_LETTER = 'dead_letter',
}

export interface WebhookErrorHistoryEntry {
  error: string;
  attemptedAt: string;
}

/**
 * Persisted record of a webhook event that failed processing.
 *
 * Deliberately does not store the webhook secret: secrets are resolved
 * fresh from environment configuration (by `source`) at retry time, the
 * same way `WebhooksController` resolves them for a live delivery.
 */
@Entity('failed_webhook_events')
export class FailedWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The original WebhookEvent.id (GitHub delivery ID / webhook ID). */
  @Column()
  @Index()
  eventId: string;

  @Column()
  type: string;

  /** e.g. 'github', 'api', or a generic service name. */
  @Column()
  @Index()
  source: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'varchar', nullable: true })
  signature: string | null;

  @Column({ type: 'text' })
  failureReason: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  errorHistory: WebhookErrorHistoryEntry[];

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: 5 })
  maxAttempts: number;

  @Column({
    type: 'enum',
    enum: FailedWebhookStatus,
    default: FailedWebhookStatus.PENDING,
  })
  @Index()
  status: FailedWebhookStatus;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  nextRetryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  canRetry(): boolean {
    return (
      (this.status === FailedWebhookStatus.PENDING ||
        this.status === FailedWebhookStatus.RETRYING) &&
      this.attempts < this.maxAttempts
    );
  }
}
