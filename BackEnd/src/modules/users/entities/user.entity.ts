import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Payout } from '../../payouts/entities/payout.entity';

@Entity('User')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  stellarAddress: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'USER' })
  role: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  @OneToMany(() => Notification, (notification) => notification.userId)
  notifications: Notification[];

  @OneToMany(() => Payout, (payout) => payout.stellarAddress)
  payouts: Payout[];
}
