import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WsChannel {
  QUEST_NEW = 'quest:new',
  QUEST_UPDATED = 'quest:updated',
  QUEST_DEADLINE = 'quest:deadline',
  SUBMISSION_STATUS = 'submission:status',
  PAYOUT_CONFIRMATION = 'payout:confirmation',
  CHAT_SUPPORT = 'chat:support',
  ANALYTICS_REALTIME = 'analytics:realtime',
  REPUTATION_CHANGE = 'reputation:change',
  BROADCAST = 'broadcast',
}

@Entity('ws_subscriptions')
export class WsSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: WsChannel,
  })
  @Index()
  channel: WsChannel;

  @Column({ type: 'varchar', nullable: true })
  resourceId: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
