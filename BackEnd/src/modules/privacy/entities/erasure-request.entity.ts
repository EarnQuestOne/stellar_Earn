import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle of an account-erasure (right-to-erasure) request:
 *
 *   REQUESTED  → user/admin submits; grace period starts (cancellable)
 *   PROCESSING → the BullMQ account-erasure worker claimed the request and is
 *                anonymizing PII inside a single transaction
 *   COMPLETED  → anonymization finished; the request is irreversible
 *   CANCELLED  → cancelled by the subject or an admin within the grace window
 *   FAILED     → execution errored and the job exhausted its retries
 */
export enum ErasureStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

/**
 * Tombstone marker used to de-identify retained rows (payouts, audit
 * references) while keeping referential integrity intact. Unique per subject.
 */
export function erasureTombstone(subjectId: string): string {
  return `erased:${subjectId}`;
}

@Entity('erasure_requests')
@Index('idx_erasure_subject_status', ['subjectId', 'status'])
export class ErasureRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The user whose data is being erased. The user row itself is retained. */
  @Column({ type: 'varchar' })
  subjectId: string;

  /** Who initiated the request — the subject, or an admin on their behalf. */
  @Column({ type: 'varchar', nullable: true })
  requestedBy: string | null;

  @Column({
    type: 'enum',
    enum: ErasureStatus,
    default: ErasureStatus.REQUESTED,
  })
  status: ErasureStatus;

  /** When the request was submitted (start of the grace period). */
  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  /**
   * End of the grace period. Before this instant the request can be
   * cancelled; the erasure job is scheduled for this moment.
   */
  @Column({ type: 'timestamptz' })
  scheduledFor: Date;

  /** When anonymization actually ran (COMPLETED). */
  @Column({ type: 'timestamptz', nullable: true })
  executedAt: Date | null;

  /** When the request was cancelled within the grace window. */
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  /** Modules included in the erasure (defaults to the full scope). */
  @Column({ type: 'jsonb', nullable: true })
  scope: string[] | null;

  /** Optional operator/legal reason for the request. */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
