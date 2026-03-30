import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DataExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('data_exports')
export class DataExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ default: 'users' })
  exportType: string;

  @Column({ default: 'json' })
  format: string;

  @Column({ type: 'enum', enum: DataExportStatus, default: DataExportStatus.PENDING })
  status: DataExportStatus;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ type: 'int', nullable: true })
  recordCount?: number;

  @Column({ type: 'timestamptz', nullable: true })
  exportedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
