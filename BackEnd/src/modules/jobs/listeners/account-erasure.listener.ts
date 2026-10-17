import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobsService } from '../jobs.service';
import { QUEUES } from '../jobs.constants';
import { JobType } from '../job.types';

export interface ErasureRequestedEvent {
  requestId: string;
  subjectId: string;
  /** ISO timestamp at which the grace period ends and erasure may run. */
  scheduledFor: string;
}

/**
 * Account Erasure Listener
 *
 * Listens for `privacy.erasure.requested` events and enqueues the
 * account-erasure job on the ERASURE queue, delayed until the end of the
 * grace period. The worker re-checks the request status before executing, so
 * a cancellation inside the grace window makes the job a no-op.
 */
@Injectable()
export class AccountErasureListener {
  private readonly logger = new Logger(AccountErasureListener.name);

  constructor(private readonly jobsService: JobsService) {}

  @OnEvent('privacy.erasure.requested', { async: true })
  async handleErasureRequested(event: ErasureRequestedEvent) {
    this.logger.log(
      `[JobsModule] Erasure requested for user ${event.subjectId}, requestId: ${event.requestId}`,
    );

    try {
      const scheduledFor = new Date(event.scheduledFor).getTime();
      const delay = Math.max(0, scheduledFor - Date.now());

      await this.jobsService.addJob(
        QUEUES.ERASURE,
        {
          requestId: event.requestId,
          subjectId: event.subjectId,
        },
        { delay, jobId: `erasure-${event.requestId}` },
        JobType.ACCOUNT_ERASURE,
      );

      this.logger.log(
        `Successfully queued account erasure job for requestId: ${event.requestId} (delay ${delay}ms)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue account erasure job for requestId ${event.requestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
