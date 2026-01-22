import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  stellarAddress: string;

  @Column({ default: 'USER' })
  role: string;

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];
}
