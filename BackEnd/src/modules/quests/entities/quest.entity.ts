import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  contractTaskId: string;

  @Column()
  rewardAmount: number;

  @Column()
  rewardAsset: string;

  @Column()
  createdBy: string;

  @OneToMany(() => Submission, (submission) => submission.quest)
  submissions: Submission[];

  verifiers: any[];
  creator: any;
}
