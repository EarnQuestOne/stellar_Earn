import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('Quest')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  contractTaskId: string;

  @Column()
  rewardAsset: string;

  @Column()
  rewardAmount: number;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column()
  verifierType: string;

  @Column({ type: 'json' })
  verifierConfig: any;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Fields for compatibility
  @Column({ nullable: true })
  creatorAddress: string;

  @Column({ default: 0 })
  currentCompletions: number;

  @Column({ nullable: true })
  maxCompletions: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @OneToMany(() => Submission, (submission) => submission.quest)
  submissions: Submission[];

  // For compatibility with verification system
  verifiers: { id: string }[];
  creator: { id: string } | null;
}
