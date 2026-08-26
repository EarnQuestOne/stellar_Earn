import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A third-party consumer's subscription to a platform domain event.
 *
 * When the platform emits an event matching `eventType`, the dispatcher
 * delivers an HMAC-signed HTTP callback to `targetUrl` using the encrypted
 * signing secret stored here.
 */
@Entity('webhook_subscriptions')
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable label for the subscription (e.g. the consumer name). */
  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  /** Domain event type this subscription listens to (e.g. `quest.created`). */
  @Column({ type: 'varchar' })
  @Index('IDX_webhook_subscriptions_event_type')
  eventType: string;

  /** Callback URL receiving the signed POST delivery. */
  @Column({ type: 'varchar' })
  targetUrl: string;

  /** AES-256-GCM encrypted signing secret (never stored in plaintext). */
  @Column({ type: 'text', nullable: true })
  secretEncrypted: string | null;

  /** Paused subscriptions stop receiving deliveries. */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
