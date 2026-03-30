import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobsService } from '../../modules/jobs/jobs.service';
import { QUEUES } from '../../modules/jobs/jobs.constants';

@Injectable()
export class DeadLetterQueueListener {
  private readonly logger = new Logger(DeadLetterQueueListener.name);

  constructor(private readonly jobsService: JobsService) {}

  @OnEvent('event.failed', { async: true })
  async handleEventFailed(payload: { eventName: string; payload: any; error: string }) {
    this.logger.warn(`Event ${payload.eventName} failed. Moving to DLQ.`);
    
    try {
      await this.jobsService.addJob(QUEUES.DEAD_LETTER, {
        type: 'FAILED_EVENT',
        eventName: payload.eventName,
        eventPayload: payload.payload,
        error: payload.error,
        failedAt: new Date(),
      });
      this.logger.log(`Event ${payload.eventName} successfully moved to DLQ.`);
    } catch (error) {
      this.logger.error(`Failed to move event ${payload.eventName} to DLQ: ${error.message}`);
    }
  }
}
