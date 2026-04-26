import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores per-user TOTP 2FA configuration.
 *
 * Kept in a separate table from the main User entity so that:
 *  - The hot-path auth query (JWT validation) never loads the secret.
 *  - The secret can be encrypted at rest independently.
 *  - 2FA state can be audited / rotated without touching the user row.
 */
@Entity('two_factor_auth')
export class TwoFactorAuth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The Stellar address this 2FA config belongs to.
   * Matches the stellarAddress used throughout the auth module.
   */
  @Column({ type: 'varchar', length: 56 })
  @Index({ unique: true })
  stellarAddress: string;

  /**
   * Base32-encoded TOTP secret.
   * In production this should be encrypted at rest (e.g. via a KMS-backed
   * column transformer).  The column is marked `select: false` so it is
   * never accidentally included in a SELECT *.
   */
  @Column({ type: 'varchar', length: 256, select: false })
  secret: string;

  /**
   * Whether 2FA has been fully enabled (i.e. the user has verified the
   * first TOTP code after setup).  A record with enabled=false means the
   * user started setup but has not yet confirmed.
   */
  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /**
   * Timestamp of the last successful TOTP verification.
   * Used for audit logging and anomaly detection.
   */
  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
