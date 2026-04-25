import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Reasons a refresh token can be marked revoked. Stored as the
 * `revokedReason` column so we can audit *why* a token in a family was
 * invalidated (rotation, voluntary logout, or detected reuse).
 */
export enum RefreshTokenRevokeReason {
  /** Token was consumed by a normal /auth/refresh call and replaced. */
  ROTATED = 'rotated',
  /** User logged out (single session). */
  LOGOUT = 'logout',
  /** User logged out everywhere / admin force-logged the user out. */
  LOGOUT_ALL = 'logout_all',
  /**
   * A previously-rotated token was presented again — strong signal of theft,
   * so the entire family is revoked under this reason.
   */
  REUSE_DETECTED = 'reuse_detected',
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * SHA-256 hash of the opaque refresh-token value. The plaintext is only
   * ever returned to the caller in /auth/login or /auth/refresh responses
   * and is never persisted, so a leaked DB does not expose live sessions.
   */
  @Column()
  @Index()
  tokenHash: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  @Index()
  stellarAddress: string;

  /**
   * All refresh tokens descended from the same login share a familyId.
   * If any token in the family is presented after it has been rotated,
   * we revoke the entire family.
   */
  @Column({ type: 'uuid' })
  @Index()
  familyId: string;

  /** Id of the refresh token that superseded this one when it rotated. */
  @Column({ type: 'uuid', nullable: true })
  replacedByTokenId: string | null;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  revokedReason: RefreshTokenRevokeReason | null;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
