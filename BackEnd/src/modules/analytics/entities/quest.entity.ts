import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Submission } from './submission.entity';

export enum QuestStatus {
  ACTIVE = 'Active',
  PAUSED = 'Paused',
  COMPLETED = 'Completed',
  EXPIRED = 'Expired',
}

/**
 * Quest entity for tracking quest metadata and performance metrics
 * Mirrors on-chain quest data for efficient analytics queries
 */
@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  contractQuestId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, (user) => user.createdQuests)
  creator: User;

  @Column()
  rewardAsset: string;

  @Column({ type: 'bigint' })
  rewardAmount: string;

  @Column()
  verifierAddress: string;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: QuestStatus,
    default: QuestStatus.ACTIVE,
  })
  @Index()
  status: QuestStatus;

  @Column({ type: 'int', default: 0 })
  totalClaims: number;

  @Column({ type: 'int', default: 0 })
  totalSubmissions: number;

  @Column({ type: 'int', default: 0 })
  approvedSubmissions: number;

  @Column({ type: 'int', default: 0 })
  rejectedSubmissions: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @OneToMany(() => Submission, (submission) => submission.quest)
  submissions: Submission[];
}
