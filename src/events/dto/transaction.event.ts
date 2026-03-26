import { BaseEvent } from './base.event';

export class TransactionCreatedEvent extends BaseEvent {
  transactionHash: string;
  amount: number;
  currency: string;
  type: string;
}

export class TransactionCompletedEvent extends BaseEvent {
  transactionHash: string;
  completedAt: Date;
  status: string;
}

export class TransactionFailedEvent extends BaseEvent {
  transactionHash: string;
  error: string;
  reason: string;
}