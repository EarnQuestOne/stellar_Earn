import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * User entity for analytics tracking
 * Note: This entity is separate from authentication, which uses in-memory users.
 * Used exclusively for tracking user metrics, submissions, and engagement.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column({ unique: true })
  // @Index()
  // stellarAddress: string;
  @Column({
    type: 'varchar',
    length: 56,
    nullable: true,
    unique: true,
  })
  stellarAddress: string | null;

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

  @OneToMany('Submission', 'user')
  submissions: any[];

  @OneToMany('Quest', 'creator')
  createdQuests: any[];
}
