import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PayoutProcessPayload, JobResult, JobType } from '../job.types';
import { JobLogService } from '../services/job-log.service';
import { JobIdempotencyService } from '../services/job-idempotency.service';

/**
 * Payout Processor
 *
 * Handles payout processing jobs — validates and executes Stellar payment
 * transactions.
 *
 * Idempotency
 * ───────────
 * Each payout job is guarded by a deterministic idempotency key of the form:
 *   `payout-job:{payoutId}:payout:process`
 *
 * This guarantees that even if BullMQ retries the same job (or the scheduler
 * enqueues it more than once), the actual Stellar payment is submitted only
 * once and subsequent executions return the cached result immediately.
 *
 * Lifecycle:
 *   1. `checkAndLock`  — acquire idempotency lock or detect a duplicate.
 *   2. Process         — perform validation + Stellar transaction.
 *   3. `complete`      — persist the result and unlock.
 *   4. `release`       — on unrecoverable failure, remove the lock so the
 *                        next genuine BullMQ retry can re-acquire it.
 */
@Injectable()
export class PayoutProcessor {
  private readonly logger = new Logger(PayoutProcessor.name);

  constructor(
    private readonly jobLogService: JobLogService,
    private readonly jobIdempotencyService: JobIdempotencyService,
  ) {}

  /**
   * Process a payout job.
   *
   * Returns immediately with the cached result if the same payoutId has
   * already been processed successfully.  Skips gracefully if another worker
   * currently holds the lock (in-flight duplicate).
   */
  async process(job: Job<PayoutProcessPayload>): Promise<JobResult> {
    const { payoutId, organizationId, amount, recipientAddress } = job.data;

    // ── 1. Idempotency check ────────────────────────────────────────────────
    const idempotencyKey = this.jobIdempotencyService.buildPayoutJobKey(
      payoutId,
      JobType.PAYOUT_PROCESS,
    );

    const idempotencyCheck =
      await this.jobIdempotencyService.checkAndLock(idempotencyKey);

    if (idempotencyCheck.alreadyProcessed) {
      this.logger.log(
        `Payout job ${job.id} (payoutId=${payoutId}) already processed — ` +
          `returning cached result`,
      );
      // Return the previously recorded result directly.
      return (
        (idempotencyCheck.result as unknown as JobResult) ?? {
          success: true,
          data: { payoutId, cachedAt: new Date(), alreadyProcessed: true },
          duration: 0,
        }
      );
    }

    if (idempotencyCheck.locked) {
      this.logger.warn(
        `Payout job ${job.id} (payoutId=${payoutId}) is already in-flight — ` +
          `skipping duplicate execution`,
      );
      return {
        success: true,
        data: { payoutId, skippedAt: new Date(), inFlight: true },
        duration: 0,
      };
    }

    // ── 2. Process the payout ───────────────────────────────────────────────
    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing payout job ${job.id}: payoutId=${payoutId}, amount=${amount}`,
      );

      // Validation
      if (!payoutId || !organizationId || !amount || !recipientAddress) {
        // Release the lock so a corrected re-submission can proceed.
        await this.jobIdempotencyService.release(idempotencyKey);
        throw new Error('Missing required payout fields');
      }

      if (amount <= 0) {
        await this.jobIdempotencyService.release(idempotencyKey);
        throw new Error('Payout amount must be greater than zero');
      }

      await job.updateProgress(25);

      // Validate Stellar address format (simplified check)
      if (!recipientAddress.startsWith('G') || recipientAddress.length !== 56) {
        await this.jobIdempotencyService.release(idempotencyKey);
        throw new Error('Invalid Stellar recipient address');
      }

      await job.updateProgress(50);

      // TODO: Integrate with Stellar SDK to execute transaction
      // This would involve:
      // 1. Load sender account from Stellar network
      // 2. Create payment transaction
      // 3. Sign transaction
      // 4. Submit to network
      // 5. Wait for confirmation

      // Simulate payout processing (replace with real Stellar SDK call)
      const transactionHash = `tx_${payoutId.substring(0, 8)}_${organizationId.substring(0, 4)}`;

      await job.updateProgress(75);

      // Update payout record in database
      // await this.payoutService.updatePayout(payoutId, {
      //   status: 'PROCESSING',
      //   transactionHash,
      //   processedAt: new Date(),
      // });

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          payoutId,
          transactionHash,
          amount,
          recipientAddress,
          processedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      // ── 3. Persist the result and release the lock ──────────────────────
      await this.jobIdempotencyService.complete(
        idempotencyKey,
        result as unknown as Record<string, unknown>,
      );

      this.logger.log(`Payout processed successfully: ${payoutId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing payout ${payoutId}: ${error.message}`,
        error.stack,
      );

      // ── 4. On unrecoverable error, release the lock ─────────────────────
      // This allows BullMQ's built-in retry logic to re-acquire the lock on
      // the next attempt.  Do not release on validation errors (already done
      // above before throwing), only on unexpected runtime errors.
      try {
        await this.jobIdempotencyService.release(idempotencyKey);
      } catch (releaseError) {
        this.logger.warn(
          `Failed to release idempotency lock for ${payoutId}: ` +
            `${releaseError.message}`,
        );
      }

      throw error;
    }
  }
}
