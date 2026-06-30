import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobResult } from '../job.types';
import { PoisonMessageService } from '../../../events/services/poison-message.service';
import { DlqAlertService } from '../../../events/services/dlq-alert.service';

export interface DeadLetterJobData {
  /** Reason the job ended up in the DLQ */
  type: 'FAILED_EVENT' | 'FAILED_JOB';
  /** Original event/job name */
  eventName?: string;
  /** Original job name when type === 'FAILED_JOB' */
  jobName?: string;
  /** Original payload / data */
  eventPayload?: any;
  failedJob?: {
    id: string | undefined;
    name: string;
    data: any;
    failedReason: string;
  };
  /** Human-readable error string */
  error: string;
  /** ISO timestamp when the failure occurred */
  failedAt: Date | string;
  /** How many times this has been retried already */
  retryCount?: number;
  /** Arbitrary extra metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DeadLetterProcessor
 *
 * Consumes jobs from the `dead_letter` BullMQ queue.
 * For each job it will:
 *  1. Quarantine the message via PoisonMessageService.
 *  2. Decide whether to re-emit the original event (if retries remain).
 *  3. Fire a DLQ alert via DlqAlertService so operators are notified.
 *  4. Emit an internal `dlq.processed` event for downstream telemetry.
 */
@Injectable()
export class DeadLetterProcessor {
  private readonly logger = new Logger(DeadLetterProcessor.name);
  /** Maximum number of automatic retries before the message is discarded. */
  static readonly MAX_AUTO_RETRIES = 3;

  constructor(
    private readonly poisonMessageService: PoisonMessageService,
    private readonly dlqAlertService: DlqAlertService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main entry-point called by JobsService worker for the dead_letter queue.
   */
  async process(job: Job<DeadLetterJobData>): Promise<JobResult> {
    const data = job.data;
    const eventName =
      data.eventName ?? data.failedJob?.name ?? data.jobName ?? 'unknown';
    const payload = data.eventPayload ?? data.failedJob?.data ?? {};
    const error =
      data.error ?? data.failedJob?.failedReason ?? 'No error message';
    const retryCount = data.retryCount ?? 0;

    this.logger.warn(
      `Processing DLQ job ${job.id} — event: "${eventName}", ` +
        `retry: ${retryCount}/${DeadLetterProcessor.MAX_AUTO_RETRIES}, error: ${error}`,
    );

    await job.updateProgress(10);

    // 1. Quarantine / update poison-message record
    const poisonMessage = await this.poisonMessageService.quarantine(
      eventName,
      payload,
      error,
      { ...data.metadata, dlqJobId: job.id, failedAt: data.failedAt },
      DeadLetterProcessor.MAX_AUTO_RETRIES,
    );

    await job.updateProgress(40);

    // 2. Attempt automatic retry if under the limit
    const shouldRetry = retryCount < DeadLetterProcessor.MAX_AUTO_RETRIES;

    if (shouldRetry) {
      try {
        await this.poisonMessageService.markRetrying(poisonMessage.id);

        this.logger.log(
          `Re-emitting event "${eventName}" (attempt ${retryCount + 1})`,
        );

        await this.eventEmitter.emitAsync(eventName, {
          ...payload,
          _dlq: {
            retryCount: retryCount + 1,
            originalJobId: job.id,
            poisonMessageId: poisonMessage.id,
          },
        });

        await this.poisonMessageService.markResolved(poisonMessage.id);

        this.logger.log(
          `Event "${eventName}" successfully re-processed on retry ${retryCount + 1}`,
        );
      } catch (retryError) {
        const retryErrorMsg =
          retryError instanceof Error ? retryError.message : String(retryError);
        this.logger.error(
          `Retry ${retryCount + 1} for event "${eventName}" failed: ${retryErrorMsg}`,
        );

        // Reset back to quarantined so next DLQ job can try again
        await this.poisonMessageService.resetToQuarantined(poisonMessage.id);

        // Alert on every retry failure; escalate if this is the final attempt
        await this.dlqAlertService.sendAlert({
          eventName,
          error: retryErrorMsg,
          retryCount: retryCount + 1,
          maxRetries: DeadLetterProcessor.MAX_AUTO_RETRIES,
          poisonMessageId: poisonMessage.id,
          payload,
          isFinal: retryCount + 1 >= DeadLetterProcessor.MAX_AUTO_RETRIES,
        });
      }
    } else {
      // Final failure — alert and discard
      this.logger.error(
        `Event "${eventName}" exhausted all ${DeadLetterProcessor.MAX_AUTO_RETRIES} retries. ` +
          `Poison message ${poisonMessage.id} will be discarded.`,
      );

      await this.dlqAlertService.sendAlert({
        eventName,
        error,
        retryCount,
        maxRetries: DeadLetterProcessor.MAX_AUTO_RETRIES,
        poisonMessageId: poisonMessage.id,
        payload,
        isFinal: true,
      });
    }

    await job.updateProgress(80);

    // 3. Emit internal telemetry event
    this.eventEmitter.emit('dlq.processed', {
      jobId: job.id,
      eventName,
      retryCount,
      poisonMessageId: poisonMessage.id,
      status: shouldRetry ? 'retried' : 'discarded',
      processedAt: new Date(),
    });

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        eventName,
        retryCount,
        poisonMessageId: poisonMessage.id,
        status: shouldRetry ? 'retried' : 'discarded',
      },
      duration: Date.now() - job.timestamp,
    };
  }
}
