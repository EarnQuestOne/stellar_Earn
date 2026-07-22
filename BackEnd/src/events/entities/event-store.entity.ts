import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('event_store')
@Index('IDX_EVENT_STORE_SOURCE_ID', ['sourceId'], { unique: true })
@Index('IDX_EVENT_STORE_SOURCE_CONTRACT_LEDGER', [
  'source',
  'contractId',
  'ledger',
])
export class EventStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  eventName: string;

  @Column({ default: 'application' })
  @Index()
  source: string;

  @Column({ nullable: true, type: 'varchar', length: 128 })
  sourceId: string | null;

  @Column({ nullable: true, type: 'varchar', length: 128 })
  contractId: string | null;

  @Column({ nullable: true, type: 'varchar', length: 128 })
  transactionHash: string | null;

  @Column({ nullable: true, type: 'int' })
  ledger: number | null;

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
