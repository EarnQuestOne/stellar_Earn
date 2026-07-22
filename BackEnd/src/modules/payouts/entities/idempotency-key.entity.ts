import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('idempotency_keys')
@Index(['fingerprint', 'expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar' })
  fingerprint: string;

  @Column({ type: 'varchar' })
  requestMethod: string;

  @Column({ type: 'varchar' })
  requestPath: string;

  @Column({ type: 'varchar', nullable: true })
  requestBodyHash: string | null;

  @Column({ type: 'int', nullable: true })
  responseStatusCode: number | null;

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  locked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
