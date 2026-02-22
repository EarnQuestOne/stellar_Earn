import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubmissionRejectedEvent } from '../dto/submission-rejected.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class SubmissionListener {
    private readonly logger = new Logger(SubmissionListener.name);

    @OnEvent('submission.rejected', { async: true })
    @Retry(3, 1000)
    async handleSubmissionRejectedEvent(event: SubmissionRejectedEvent) {
        this.logger.log(`Handling submission.rejected for submission: ${event.submissionId}`);
    }
}
