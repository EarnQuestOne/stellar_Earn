import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DisputeStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  APPEALED = 'APPEALED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('disputes')
@Index('idx_disputes_submission', ['submissionId'])
@Index('idx_disputes_initiator_status', ['initiatorAddress', 'status'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questId: string;

  @Column()
  submissionId: string;

  @Column()
  initiatorAddress: string;

  @Column()
  arbitratorAddress: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @Column({ type: 'boolean', nullable: true })
  upheld: boolean | null;

  @Column({ type: 'int', nullable: true })
  slashBps: number | null;

  @Column({ type: 'varchar', nullable: true })
  openTransactionHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  appealTransactionHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolutionTransactionHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  filedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
