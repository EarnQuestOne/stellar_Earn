import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { SubmissionRejectedEvent } from '../dto/submission-rejected.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class SubmissionListener {
    private readonly logger = new Logger(SubmissionListener.name);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    @OnEvent('submission.rejected', { async: true })
    @Retry(3, 1000)
    async handleSubmissionRejectedEvent(event: SubmissionRejectedEvent) {
        this.logger.log(`Handling submission.rejected for submission: ${event.submissionId}`);
        try {
          // Process rejection
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'submission.rejected', payload: event, error: error.message });
            throw error;
        }
    }
}
