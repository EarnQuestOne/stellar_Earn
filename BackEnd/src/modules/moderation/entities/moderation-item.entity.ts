import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ModerationTargetType {
  QUEST = 'QUEST',
  SUBMISSION = 'SUBMISSION',
  STANDALONE = 'STANDALONE',
}

export enum ModerationItemStatus {
  PENDING = 'PENDING',
  AUTO_APPROVED = 'AUTO_APPROVED',
  AUTO_FLAGGED = 'AUTO_FLAGGED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ModerationAction {
  NONE = 'NONE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ESCALATE = 'ESCALATE',
}

@Entity('moderation_items')
export class ModerationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  @Index()
  targetType: ModerationTargetType;

  @Column()
  @Index()
  targetId: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'text', nullable: true })
  textSnapshot: string | null;

  @Column({ type: 'jsonb', nullable: true })
  imageUrls: string[] | null;

  @Column({ type: 'float', default: 0 })
  automatedScore: number;

  @Column({ type: 'jsonb', nullable: true })
  automatedLabels: Record<string, number> | null;

  @Column({ type: 'jsonb', nullable: true })
  keywordHits: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  imageFlags: { url: string; reason: string }[] | null;

  @Column({ type: 'varchar', length: 32, default: ModerationItemStatus.PENDING })
  @Index()
  status: ModerationItemStatus;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 32, default: ModerationAction.NONE })
  lastAction: ModerationAction;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
