import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum PostmortemStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  CLOSED = 'closed',
}

@Entity('postmortems')
@Index(['status', 'createdAt'])
@Index(['severity', 'createdAt'])
@Index(['incidentDate'])
export class PostmortemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Incident Identification
  @Column({ type: 'varchar', unique: true })
  incidentId: string; // Format: YYYY-MM-DD-HHMM

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  // Timeline & Duration
  @Column({ type: 'timestamp' })
  incidentDate: Date;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({
    type: 'integer',
    comment: 'Duration in minutes',
  })
  durationMinutes: number;

  // Severity & Impact
  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity: IncidentSeverity;

  @Column({ type: 'text', nullable: true })
  servicesAffected: string; // JSON array of service names

  @Column({ type: 'integer', default: 0 })
  usersAffected: number;

  @Column({ type: 'integer', default: 0 })
  failedTransactions: number;

  @Column({ type: 'boolean', default: false })
  slaBreached: boolean;

  @Column({ type: 'boolean', default: false })
  dataLoss: boolean;

  // Root Cause
  @Column({ type: 'text', nullable: true })
  rootCause: string;

  @Column({ type: 'text', nullable: true })
  contributingFactors: string; // JSON array

  @Column({ type: 'text', nullable: true })
  technicalExplanation: string;

  // Response Metrics
  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Time to Detection in minutes',
  })
  ttd: number;

  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Time to Mitigation in minutes',
  })
  ttm: number;

  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Time to Resolution in minutes',
  })
  ttr: number;

  // Content
  @Column({ type: 'text', nullable: true })
  timelineData: string; // JSON object

  @Column({ type: 'text', nullable: true })
  whatWentWell: string; // JSON array

  @Column({ type: 'text', nullable: true })
  whatWentWrong: string; // JSON array

  @Column({ type: 'text', nullable: true })
  lessonsLearned: string; // JSON object

  // Action Items
  @Column({ type: 'text', nullable: true })
  actionItems: string; // JSON array

  @Column({ type: 'integer', default: 0 })
  completedActionItems: number;

  @Column({ type: 'integer', default: 0 })
  totalActionItems: number;

  // Status & Metadata
  @Column({
    type: 'enum',
    enum: PostmortemStatus,
    default: PostmortemStatus.DRAFT,
  })
  status: PostmortemStatus;

  @Column({ type: 'varchar', nullable: true })
  incidentCommander: string; // Name or user ID

  @Column({ type: 'varchar', nullable: true })
  author: string; // User ID or email

  @Column({ type: 'varchar', nullable: true })
  facilitator: string; // User ID or email

  @Column({ type: 'text', nullable: true })
  attendees: string; // JSON array of names/IDs

  @Column({ type: 'timestamp', nullable: true })
  postmortemDate: Date;

  @Column({ type: 'text', nullable: true })
  references: string; // JSON object with links to docs/tickets

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'text', nullable: true })
  tags: string; // JSON array of tags for categorization

  @Column({ type: 'text', nullable: true })
  relatedIncidents: string; // JSON array of incident IDs

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;
}
