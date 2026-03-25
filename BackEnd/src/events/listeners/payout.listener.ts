import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PayoutProcessedEvent } from '../dto/payout-processed.event';
import { PayoutFailedEvent } from '../dto/payout-failed.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class PayoutListener {
    private readonly logger = new Logger(PayoutListener.name);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    @OnEvent('payout.processed', { async: true })
    @Retry(3, 1000)
    async handlePayoutProcessedEvent(event: PayoutProcessedEvent) {
        this.logger.log(`Handling payout.processed for payout: ${event.payoutId}`);
        try {
          // Process payout
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'payout.processed', payload: event, error: error.message });
            throw error;
        }
    }

    @OnEvent('payout.failed', { async: true })
    @Retry(3, 1000)
    async handlePayoutFailedEvent(event: PayoutFailedEvent) {
        this.logger.error(`Handling payout.failed for payout: ${event.payoutId}. Reason: ${event.reason}`);
        try {
          // Handle failed payout
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'payout.failed', payload: event, error: error.message });
            throw error;
        }
    }
}
