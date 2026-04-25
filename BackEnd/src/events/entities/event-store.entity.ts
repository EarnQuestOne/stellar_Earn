import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('event_store')
export class EventStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  eventName: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
