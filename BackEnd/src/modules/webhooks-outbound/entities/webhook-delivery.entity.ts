import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Delivery lifecycle for a single (subscription, event) attempt stream.
 *
 * A delivery starts `PENDING`, moves to `DELIVERED` on a 2xx response, and is
 * `DEAD_LETTERED` once retries are exhausted. `FAILED` is the transient state
 * between attempts while `nextRetryAt` is in the future.
 */
export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
  DEAD_LETTERED = 'DEAD_LETTERED',
}

/**
 * One durable delivery record per (subscription, dispatched event). Tracks the
 * attempt count, last response/error, and the next scheduled retry so delivery
 * status is queryable and retries survive restarts.
 */
@Index('idx_webhook_delivery_subscription', ['subscriptionId'])
@Index('idx_webhook_delivery_status', ['status'])
@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  /** Canonical event payload that was (or will be) signed and POSTed. */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: WebhookDeliveryStatus,
    default: WebhookDeliveryStatus.PENDING,
  })
  status: WebhookDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int', nullable: true })
  responseStatusCode: number | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'boolean', default: false })
  deadLettered: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
