import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  PayoutProcessPayload,
  JobResult,
  JobMetadata,
  JobType,
} from '../job.types';
import { JobLogService } from '../services/job-log.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { JobIdempotencyService } from '../services/job-idempotency.service';
import { StellarPaymentService } from '../../stellar/stellar-payment.service';
import { Payout, PayoutStatus } from '../../payouts/entities/payout.entity';
import {
  PayoutOutbox,
  PayoutOutboxStatus,
} from '../../payouts/entities/payout-outbox.entity';

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

  /** Max relay attempts before a row is parked as FAILED for reconciliation. */
  private readonly maxOutboxAttempts = 5;

  constructor(
    private readonly jobLogService: JobLogService,
    private readonly jobIdempotencyService: JobIdempotencyService,
    private readonly stellarPaymentService: StellarPaymentService,
    @InjectRepository(PayoutOutbox)
    private readonly outboxRepository: Repository<PayoutOutbox>,
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
  ) {}

  /**
   * Transactional-outbox relay (#2158).
   *
   * Drains PENDING outbox rows and submits each on-chain exactly once:
   * a row is claimed with an atomic `PENDING → PROCESSING` update, so only the
   * worker that flips it (`affected === 1`) submits the payment. On success the
   * row is marked DONE and the payout records the transaction hash; on failure
   * the attempt count is bumped and the row is either retried (left PENDING) or
   * parked as FAILED for the reconciliation job to pick up.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async relayPayoutOutbox(): Promise<void> {
    const pending = await this.outboxRepository.find({
      where: { status: PayoutOutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    for (const entry of pending) {
      const claim = await this.outboxRepository.update(
        { id: entry.id, status: PayoutOutboxStatus.PENDING },
        { status: PayoutOutboxStatus.PROCESSING },
      );
      // Another worker claimed it first — never submit the same row twice.
      if (claim.affected !== 1) {
        continue;
      }

      try {
        const { transactionHash } =
          await this.stellarPaymentService.sendPayment(
            entry.recipientAddress,
            Number(entry.amount),
          );

        await this.outboxRepository.update(
          { id: entry.id },
          {
            status: PayoutOutboxStatus.DONE,
            transactionHash,
            processedAt: new Date(),
            lastError: null,
          },
        );

        await this.payoutRepository.update(
          { id: entry.payoutId },
          { status: PayoutStatus.PROCESSING, transactionHash },
        );

        this.logger.log(
          `Relayed payout outbox ${entry.id} (payoutId=${entry.payoutId}) → ${transactionHash}`,
        );
      } catch (error) {
        const attempts = entry.attempts + 1;
        const parked = attempts >= this.maxOutboxAttempts;
        await this.outboxRepository.update(
          { id: entry.id },
          {
            status: parked
              ? PayoutOutboxStatus.FAILED
              : PayoutOutboxStatus.PENDING,
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
          },
        );
        this.logger.error(
          `Relay failed for payout outbox ${entry.id} (attempt ${attempts})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Process a payout job.
   *
   * Returns immediately with the cached result if the same payoutId has
   * already been processed successfully.  Skips gracefully if another worker
   * currently holds the lock (in-flight duplicate).
   */
  async process(job: Job<PayoutProcessPayload & JobMetadata>): Promise<JobResult> {
    const { payoutId, organizationId, amount, recipientAddress, __correlationId } = job.data;

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
      // Restore correlation ID in logger context if present in job data
      if (__correlationId) {
        AppLoggerService.setRequestContext({ correlationId: __correlationId });
      }
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

      // Execute the Stellar payment transaction
      const stellarResult = await this.stellarPaymentService.sendPayment(
        recipientAddress,
        amount,
      );
      const transactionHash = stellarResult.transactionHash;

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