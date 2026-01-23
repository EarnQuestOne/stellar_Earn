import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Submission } from './submission.entity';
import { Quest } from './quest.entity';

/**
 * User entity for analytics tracking
 * Note: This entity is separate from authentication, which uses in-memory users.
 * Used exclusively for tracking user metrics, submissions, and engagement.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  stellarAddress: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'int', default: 0 })
  totalXp: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  questsCompleted: number;

  @Column({ type: 'simple-array', nullable: true })
  badges: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  @OneToMany(() => Quest, (quest) => quest.creator)
  createdQuests: Quest[];
}
