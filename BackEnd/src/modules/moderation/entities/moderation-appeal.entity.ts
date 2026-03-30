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
import { ModerationItem } from './moderation-item.entity';

export enum AppealStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('moderation_appeals')
export class ModerationAppeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  moderationItemId: string;

  @ManyToOne(() => ModerationItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moderationItemId' })
  moderationItem: ModerationItem;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 32, default: AppealStatus.PENDING })
  @Index()
  status: AppealStatus;

  @Column({ nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
