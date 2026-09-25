import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobResult } from '../job.types';
import { ErasureService } from '../../privacy/erasure.service';

export interface AccountErasurePayload {
  requestId: string;
  subjectId: string;
}

/**
 * Account Erasure Processor
 *
 * Executes a right-to-erasure request once its grace period has elapsed.
 * Delegates to {@link ErasureService.executeErasure}, which performs the
 * cross-module anonymization inside a single transaction and is idempotent
 * (safe to re-run, no-ops on completed/cancelled requests).
 */
@Injectable()
export class AccountErasureProcessor {
  private readonly logger = new Logger(AccountErasureProcessor.name);

  constructor(private readonly erasureService: ErasureService) {}

  async process(job: Job<AccountErasurePayload>): Promise<JobResult> {
    const { requestId, subjectId } = job.data;

    this.logger.log(
      `Processing account erasure job ${job.id}: request=${requestId}, subject=${subjectId}`,
    );

    try {
      const result = await this.erasureService.executeErasure(requestId);
      return {
        success: true,
        data: {
          requestId,
          subjectId,
          status: result.status,
          skipped: result.skipped ?? false,
          alreadyExecuted: result.alreadyExecuted ?? false,
        },
        duration: Date.now() - job.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error processing account erasure for request ${requestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
