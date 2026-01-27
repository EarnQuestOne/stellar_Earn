import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Quest } from '../../quests/entities/quest.entity';
import { User } from '../../users/entities/user.entity';

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PAID = 'PAID',
}

@Entity('Submission')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questId: string;

  @Column()
  userId: string;

  @Column({ type: 'json' })
  proof: any;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  rejectedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  verifierNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @ManyToOne(() => Quest, (quest) => quest.submissions)
  @JoinColumn({ name: 'questId', referencedColumnName: 'id' })
  quest: Quest;
}
