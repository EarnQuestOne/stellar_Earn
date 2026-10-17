import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle state of an outbound webhook subscription.
 *
 * A `PAUSED` subscription stops generating new deliveries and short-circuits any
 * pending ones (see the delivery processor). Deletion is a hard delete.
 */
export enum WebhookSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

/**
 * A third-party consumer's registration to receive signed HTTP callbacks for a
 * chosen set of platform domain events.
 *
 * The per-subscription signing secret is stored **encrypted at rest** (AES-256-GCM);
 * the plaintext is only ever held transiently while computing an HMAC signature.
 */
@Index('idx_webhook_subscription_status', ['status'])
@Entity('webhook_subscriptions')
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-friendly label for the subscription (optional). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string | null;

  /** Destination URL the platform POSTs signed events to. */
  @Column({ type: 'varchar', length: 2048 })
  targetUrl: string;

  /**
   * Event types this subscription is interested in, stored as a comma-separated
   * list (e.g. `quest.created,submission.approved`).
   */
  @Column({ type: 'simple-array' })
  eventTypes: string[];

  /**
   * The signing secret, encrypted at rest as `iv:authTag:ciphertext` (all hex).
   * Never returned by the API.
   */
  @Column({ type: 'text' })
  encryptedSecret: string;

  @Column({
    type: 'enum',
    enum: WebhookSubscriptionStatus,
    default: WebhookSubscriptionStatus.ACTIVE,
  })
  status: WebhookSubscriptionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
