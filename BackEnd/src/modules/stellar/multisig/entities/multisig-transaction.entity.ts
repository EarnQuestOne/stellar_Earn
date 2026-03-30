import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MultiSigTransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum MultiSigTransactionType {
  PAYOUT = 'PAYOUT',
  THRESHOLD_UPDATE = 'THRESHOLD_UPDATE',
  ADD_SIGNER = 'ADD_SIGNER',
  REMOVE_SIGNER = 'REMOVE_SIGNER',
  UPDATE_ROLE = 'UPDATE_ROLE',
  FREEZE_ACCOUNT = 'FREEZE_ACCOUNT',
  CUSTOM = 'CUSTOM',
}

@Entity('multisig_transactions')
@Index(['multiSigWalletId', 'status'])
@Index(['multiSigWalletId', 'createdAt'])
export class MultiSigTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  multiSigWalletId: string;

  @Column({
    type: 'varchar',
    enum: MultiSigTransactionType,
    default: MultiSigTransactionType.PAYOUT,
  })
  transactionType: MultiSigTransactionType;

  @Column({
    type: 'varchar',
    enum: MultiSigTransactionStatus,
    default: MultiSigTransactionStatus.PENDING,
  })
  status: MultiSigTransactionStatus;

  @Column()
  destinationAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 7, nullable: true })
  amount: number;

  @Column({ nullable: true })
  asset: string;

  @Column({ type: 'text', nullable: true })
  transactionPayload: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  approvalsReceived: number;

  @Column({ type: 'int', default: 0 })
  rejectionsReceived: number;

  @Column({ type: 'int' })
  threshold: number;

  @Column({ nullable: true })
  initiatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  stellarTransactionHash: string;

  @Column({ nullable: true })
  stellarLedger: number;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string;
}
