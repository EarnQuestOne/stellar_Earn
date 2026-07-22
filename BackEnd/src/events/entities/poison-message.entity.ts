import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PoisonMessageStatus {
  QUARANTINED = 'quarantined',
  RETRYING = 'retrying',
  RESOLVED = 'resolved',
  DISCARDED = 'discarded',
}

@Entity('poison_messages')
export class PoisonMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  eventName: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'text' })
  lastError: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 5 })
  maxRetries: number;

  @Column({
    type: 'enum',
    enum: PoisonMessageStatus,
    default: PoisonMessageStatus.QUARANTINED,
  })
  @Index()
  status: PoisonMessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  errorHistory: Array<{ error: string; attemptedAt: string }>;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  @Index()
  quarantinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
