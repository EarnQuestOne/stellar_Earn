import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SignatureStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('multisig_signatures')
@Index(['multiSigTransactionId', 'signerAddress'], { unique: true })
@Index(['multiSigTransactionId', 'status'])
export class MultiSigSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  multiSigTransactionId: string;

  @Column()
  signerAddress: string;

  @Column({ nullable: true })
  signerName: string;

  @Column({
    type: 'varchar',
    enum: SignatureStatus,
    default: SignatureStatus.PENDING,
  })
  status: SignatureStatus;

  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ nullable: true })
  signedAt: Date;

  @Column({ nullable: true })
  signatureExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  rejectedAt: Date;
}
