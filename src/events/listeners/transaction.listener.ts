import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionCreatedEvent, TransactionCompletedEvent, TransactionFailedEvent } from '../dto/transaction.event';
import { eventConfig } from '../../config/events.config';

@Injectable()
export class TransactionListener {
  @OnEvent(eventConfig.events.transaction.created)
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    console.log(`[EVENT] Transaction created: ${event.transactionHash}`);
  }

  @OnEvent(eventConfig.events.transaction.completed)
  async handleTransactionCompleted(event: TransactionCompletedEvent): Promise<void> {
    console.log(`[EVENT] Transaction completed: ${event.transactionHash}`);
  }

  @OnEvent(eventConfig.events.transaction.failed)
  async handleTransactionFailed(event: TransactionFailedEvent): Promise<void> {
    console.log(`[EVENT] Transaction failed: ${event.transactionHash}`);
  }
}