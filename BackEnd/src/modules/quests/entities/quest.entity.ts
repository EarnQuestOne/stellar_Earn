import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('quests')
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

  @DeleteDateColumn()
  deletedAt: Date;

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

  @OneToMany('Submission', 'quest')
  submissions: any[];

  // For compatibility with verification system
  verifiers: { id: string }[];
  creator: { id: string } | null;
  category: any;
}
