import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle of a transactional-outbox row (#2158).
 *
 * `PENDING` → claimed by the relay → `PROCESSING` → submitted on-chain →
 * `DONE`. A row that exhausts its retry budget is parked as `FAILED`, and a
 * row stuck in `PROCESSING` (e.g. a crash mid-submit) is recovered back to
 * `PENDING` by the reconciliation job.
 */
export enum PayoutOutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

/**
 * Transactional outbox for on-chain payout execution (#2158).
 *
 * The execution *intent* is written in the same DB transaction as the payout
 * state change, then relayed to Stellar by an idempotent worker. Because the
 * row is claimed atomically (`PENDING` → `PROCESSING`) and carries a unique
 * `idempotencyKey`, a payment is submitted at most once even across crashes or
 * duplicate jobs.
 */
@Entity('payout_outbox')
export class PayoutOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  payoutId: string;

  /** Deterministic key that makes relaying exactly-once. */
  @Column({ type: 'varchar', unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar' })
  recipientAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: string;

  @Index()
  @Column({ type: 'varchar', default: PayoutOutboxStatus.PENDING })
  status: PayoutOutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
