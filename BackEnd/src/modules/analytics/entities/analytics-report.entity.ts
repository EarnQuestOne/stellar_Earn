import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User as AnalyticsUser } from './user.entity';

export enum ReportType {
  QUEST_PERFORMANCE = 'quest_performance',
  USER_ENGAGEMENT = 'user_engagement',
  PAYOUT_ANALYTICS = 'payout_analytics',
  REVENUE_TRACKING = 'revenue_tracking',
  RETENTION_ANALYSIS = 'retention_analysis',
  GEOGRAPHIC_DISTRIBUTION = 'geographic_distribution',
  TIME_TO_COMPLETION = 'time_to_completion',
  PLATFORM_OVERVIEW = 'platform_overview',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Analytics report entity for storing generated reports and their metadata
 */
@Entity('analytics_reports')
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  @Index()
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportFormat,
  })
  format: ReportFormat;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  @Index()
  status: ReportStatus;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'date' })
  @Index()
  startDate: Date;

  @Column({ type: 'date' })
  @Index()
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ type: 'int', default: 0 })
  generationTimeMs: number;

  @Column({ nullable: true })
  errorMessage: string;

  @ManyToOne(() => AnalyticsUser)
  @JoinColumn({ name: 'generatedById' })
  generatedBy: AnalyticsUser;

  @Column()
  @Index()
  generatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}