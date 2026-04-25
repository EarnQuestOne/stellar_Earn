import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SignerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REMOVED = 'REMOVED',
}

export enum SignerRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  VIEWER = 'VIEWER',
}

@Entity('multisig_signers')
@Index(['multiSigWalletId', 'signerAddress'], { unique: true })
@Index(['multiSigWalletId', 'status'])
export class MultiSigSigner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  multiSigWalletId: string;

  @Column()
  signerAddress: string;

  @Column({ nullable: true })
  signerName: string;

  @Column({
    type: 'varchar',
    enum: SignerRole,
    default: SignerRole.APPROVER,
  })
  role: SignerRole;

  @Column({
    type: 'varchar',
    enum: SignerStatus,
    default: SignerStatus.ACTIVE,
  })
  status: SignerStatus;

  @Column({ type: 'int', default: 0 })
  approvalCount: number;

  @Column({ type: 'int', default: 0 })
  rejectionCount: number;

  @Column({ nullable: true })
  lastApprovalAt: Date;

  @Column({ nullable: true })
  lastRejectionAt: Date;

  @Column({ nullable: true })
  addedBy: string;

  @CreateDateColumn()
  addedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  removedBy: string;

  @Column({ nullable: true })
  removedAt: Date;
}
