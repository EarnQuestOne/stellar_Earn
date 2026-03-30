import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MultiSigWalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum SignerRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  VIEWER = 'VIEWER',
}

@Entity('multisig_wallets')
@Index(['walletAddress', 'organizationId'], { unique: true })
export class MultiSigWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  walletAddress: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  threshold: number;

  @Column({ type: 'int', default: 1 })
  totalSigners: number;

  @Column({
    type: 'varchar',
    enum: MultiSigWalletStatus,
    default: MultiSigWalletStatus.ACTIVE,
  })
  status: MultiSigWalletStatus;

  @Column({ type: 'bigint', default: 0 })
  totalTransactions: number;

  @Column({ type: 'bigint', default: 0 })
  approvedTransactions: number;

  @Column({ type: 'decimal', precision: 20, scale: 7, default: 0 })
  totalAmountApproved: number;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastModifiedBy: string;

  @Column({ nullable: true })
  lastActivityAt: Date;
}
