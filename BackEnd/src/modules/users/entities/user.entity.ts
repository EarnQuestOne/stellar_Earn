import { Quest } from 'src/modules/quests/entities/quest.entity';
import { Submission } from 'src/modules/submissions/entities/submission.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  VERIFIER = 'VERIFIER',
}

export enum PrivacyLevel {
  PUBLIC = 'PUBLIC',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
  PRIVATE = 'PRIVATE',
}

/**
 * Main User entity for the application
 * Used for authentication, analytics, and user management
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 56,
    nullable: true,
    unique: true,
  })
  @Index()
  stellarAddress: string | null;

  @Column({ nullable: true })
  @Index()
  username: string;

  @Column({ nullable: true, unique: true })
  @Index()
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  questsCompleted: number;

  @Column({ type: 'simple-array', nullable: true })
  badges: string[];

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
  };

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.PUBLIC,
  })
  privacyLevel: PrivacyLevel;

  @Column({ type: 'int', default: 0 })
  failedQuests: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number;

  @Column({ type: 'bigint', default: '0' })
  totalEarned: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ default: 0 })
  completedQuests: number;

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

  // Helper methods
  calculateLevel(): number {
    return Math.max(1, Math.floor(Math.sqrt(this.xp / 100)));
  }

  calculateSuccessRate(): number {
    const total = this.questsCompleted + this.failedQuests;
    return total > 0 ? (this.questsCompleted / total) * 100 : 0;
  }

  updateStatistics() {
    this.level = this.calculateLevel();
    this.successRate = this.calculateSuccessRate();
    this.lastActiveAt = new Date();
  }
}
