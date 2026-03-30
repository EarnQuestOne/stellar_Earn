import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { WsChannel } from './ws-subscription.entity';

@Entity('ws_messages')
export class WsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: WsChannel,
  })
  @Index()
  channel: WsChannel;

  @Column()
  event: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  targetUserId: string;

  @Column({ default: false })
  isBroadcast: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
