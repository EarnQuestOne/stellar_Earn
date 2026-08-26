import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle of a single outbound delivery attempt chain (#2306).
 *
 * `pending` → claimed by the worker → `delivering` → HTTP 2xx → `delivered`;
 * failure → `retrying` with `nextRetryAt` set → re-claimed after the backoff
 * window → …; exhausted attempts → `dead_lettered`. Rows whose subscription
 * was paused/deleted transition to `skipped`. A crash mid-attempt can strand
 * a row in `delivering`; the dispatch scheduler resets those back to
 * `pending` after `stuckDeliveringMs`.
 */
export enum WebhookDeliveryStatusEnum {
  PENDING = 'pending',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  RETRYING = 'retrying',
  DEAD_LETTERED = 'dead_lettered',
  SKIPPED = 'skipped',
}

/**
 * One platform event × one subscription → one delivery row (#2306).
 * Attempt state lives in Postgres (not Redis) so retry scheduling and
 * dead-lettering are observable and auditable from the database.
 */
@Entity('webhook_deliveries')
@Index('IDX_webhook_deliveries_status_next_retry', ['status', 'nextRetryAt'])
@Index('IDX_webhook_deliveries_subscription', ['subscriptionId'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  subscriptionId: string;

  /** Domain event name from the catalog (e.g. `payout.processed`). */
  @Column({ type: 'varchar', length: 120 })
  eventType: string;

  /** Canonical payload exactly as delivered (also what the HMAC covers). */
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Index()
  @Column({ type: 'varchar', default: WebhookDeliveryStatusEnum.PENDING })
  status: WebhookDeliveryStatusEnum;

  /** Completed delivery attempts (a 2xx increments this). */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Cap for this delivery; snapshot of the subscription's setting at creation. */
  @Column({ type: 'int', default: 5 })
  maxAttempts: number;

  /** HTTP status of the last attempt (null before the first attempt). */
  @Column({ type: 'int', nullable: true })
  responseStatusCode: number | null;

  /** Truncated error text from the last failed attempt. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  lastError: string | null;

  /** When the scheduler may pick this delivery up again (retrying rows). */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deadLetteredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
