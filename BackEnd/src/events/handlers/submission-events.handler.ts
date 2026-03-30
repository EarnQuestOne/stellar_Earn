import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ISubmissionReceivedEvent, ISubmissionApprovedEvent, IPayoutProcessedEvent } from '../interfaces/submission-events.interface';
import { EventStoreService } from '../event-store/event-store.service';

@Injectable()
export class SubmissionEventsHandler {
    private readonly logger = new Logger(SubmissionEventsHandler.name);

    constructor(private readonly eventStoreService: EventStoreService) {}

    @OnEvent('submission.received', { async: true })
    async handleSubmissionReceived(event: ISubmissionReceivedEvent) {
        this.logger.log(`Submission received: ${event.submissionId} for quest ${event.questId}`);
        await this.eventStoreService.saveEvent('submission.received', event);
    }

    @OnEvent('submission.approved', { async: true })
    async handleSubmissionApproved(event: ISubmissionApprovedEvent) {
        this.logger.log(`Submission approved: ${event.submissionId}`);
        await this.eventStoreService.saveEvent('submission.approved', event);
    }

    @OnEvent('payout.processed', { async: true })
    async handlePayoutProcessed(event: IPayoutProcessedEvent) {
        this.logger.log(`Payout processed: ${event.payoutId} for user ${event.userId}`);
        await this.eventStoreService.saveEvent('payout.processed', event);
    }
}
