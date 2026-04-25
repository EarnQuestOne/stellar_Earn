import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventStoreService } from '../event-store/event-store.service';

@Injectable()
export class DeadLetterHandler {
    private readonly logger = new Logger(DeadLetterHandler.name);

    constructor(private readonly eventStoreService: EventStoreService) {}

    @OnEvent('event.failed')
    async handleFailedEvent(payload: { eventId: string; error: string; type: string; data: any }) {
        this.logger.error(`Event failed: ${payload.type} (ID: ${payload.eventId}). Error: ${payload.error}`);
        
        await this.eventStoreService.markAsFailed(payload.eventId, payload.error);
        
        // Additional logic like sending an alert to Slack/Discord could go here
    }

    async retryFailedEvents() {
        const failedEvents = await this.eventStoreService.getFailedEvents();
        this.logger.log(`Retrying ${failedEvents.length} failed events...`);
        
        for (const event of failedEvents) {
            try {
                // Re-emit the event
                // Note: This might cause an infinite loop if not handled carefully
                // We should probably have a max retry limit
                if (event.retryCount < 5) {
                    await this.eventStoreService.saveEvent(event.type, event.payload, { ...event.metadata, retriedFrom: event.id });
                }
            } catch (error) {
                this.logger.error(`Failed to retry event ${event.id}: ${error.message}`);
            }
        }
    }
}
