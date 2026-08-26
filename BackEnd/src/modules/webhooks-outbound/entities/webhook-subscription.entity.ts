import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle of an outbound webhook subscription (#2306).
 *
 * `active` → (pause) → `paused` → (resume) → `active`; deleting a
 * subscription also pauses it so pending deliveries short-circuit before
 * they hit the wire.
 */
export enum WebhookSubscriptionState {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

/**
 * A third-party registration for platform → consumer event delivery (#2306).
 *
 * The signing secret is stored encrypted (aes-256-gcm; see
 * `utils/signature.util.ts`) and is only ever returned in plaintext at
 * creation/rotation time — the same model GitHub/Stripe use for webhook
 * secrets.
 */
@Entity('webhook_subscriptions')
@Index('IDX_webhook_subscriptions_state', ['state'])
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human label for the consuming service ("Acme payouts watcher"). */
  @Column({ type: 'varchar', length: 120 })
  label: string;

  /** Target URL that will receive signed POSTs. */
  @Column({ type: 'varchar', length: 2048 })
  targetUrl: string;

  /**
   * Event types the subscription listens for. `'*'` subscribes to the whole
   * catalog (see WEBHOOK_OUTBOUND_EVENT_CATALOG).
   */
  @Column({ type: 'simple-array' })
  eventTypes: string[];

  /** aes-256-gcm ciphertext of the signing secret (v1.<iv>.<tag>.<data>). */
  @Column({ type: 'varchar', length: 512 })
  secretCiphertext: string;

  /** Last 4 chars of the plaintext secret, for UI display. */
  @Column({ type: 'varchar', length: 8 })
  secretHint: string;

  @Index()
  @Column({ type: 'varchar', default: WebhookSubscriptionState.ACTIVE })
  state: WebhookSubscriptionState;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
