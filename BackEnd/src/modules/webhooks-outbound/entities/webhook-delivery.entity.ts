import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  DEAD_LETTERED = 'dead_lettered',
  CANCELLED = 'cancelled',
}

/**
 * A single delivery attempt record for one subscription × event.
 *
 * The row is created when the event is dispatched, then updated by the
 * delivery worker on every attempt (success, retry scheduling, or
 * dead-lettering). `status` + `nextRetryAt` are indexed so pending/retryable
 * deliveries can be queried.
 */
@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_webhook_deliveries_subscription_id')
  subscriptionId: string;

  /** Domain event type that triggered this delivery. */
  @Column({ type: 'varchar' })
  eventType: string;

  /** Stable identifier of the originating event (replay guard / dedupe key). */
  @Column({ type: 'varchar' })
  eventId: string;

  /** Canonical signed payload delivered to the consumer. */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'varchar',
    default: WebhookDeliveryStatus.PENDING,
  })
  @Index('IDX_webhook_deliveries_status_next_retry')
  status: WebhookDeliveryStatus;

  /** Number of HTTP attempts made so far. */
  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  /** Maximum attempts before the delivery is dead-lettered. */
  @Column({ type: 'int', default: 5 })
  maxAttempts: number;

  /** HTTP status code of the last attempt. */
  @Column({ type: 'int', nullable: true })
  responseCode: number | null;

  /** Truncated response body of the last attempt. */
  @Column({ type: 'text', nullable: true })
  responseBody: string | null;

  /** Last failure message (for observability). */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /** When the next retry is due (exponential backoff + jitter). */
  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadLetteredAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
