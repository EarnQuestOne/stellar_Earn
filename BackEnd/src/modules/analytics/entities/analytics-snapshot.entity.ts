import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SnapshotType {
  PLATFORM = 'platform',
  QUEST = 'quest',
  USER = 'user',
}

/**
 * Analytics snapshot entity for storing pre-computed daily statistics
 * Used to improve query performance for historical data and trending analysis
 */
@Entity('analytics_snapshots')
export class AnalyticsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({
    type: 'enum',
    enum: SnapshotType,
  })
  @Index()
  type: SnapshotType;

  @Column({ nullable: true })
  @Index()
  referenceId: string;

  @Column({ type: 'jsonb' })
  metrics: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
