import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyService } from '../../payouts/services/idempotency.service';

/**
 * Idempotency result returned when checking a job key.
 *
 * - `alreadyProcessed: true`  → a completed record exists; `result` holds the
 *   previously recorded output so the caller can return it directly.
 * - `locked: true`            → another worker is currently processing this
 *   job; the caller should skip/abort this attempt.
 * - both false                → a fresh lock was acquired; the caller may
 *   proceed and should call `complete()` (or `release()` on failure) when done.
 */
export interface JobIdempotencyCheck {
  alreadyProcessed: boolean;
  locked: boolean;
  result?: Record<string, unknown> | null;
}

/**
 * JobIdempotencyService
 *
 * Wraps the existing {@link IdempotencyService} with job-queue–specific
 * semantics so that payout (and other payment-triggering) jobs become
 * idempotent end-to-end, regardless of how many times BullMQ schedules them.
 *
 * Key schema: `payout-job:{payoutId}:{jobType}`
 *
 * Lifecycle
 * ─────────
 * 1. `checkAndLock(key)`  — check for a completed or in-progress record.
 *    • If completed → returns `{ alreadyProcessed: true, result }`.
 *    • If locked    → returns `{ locked: true }`.
 *    • Otherwise    → inserts a locked record and returns `{}` (proceed).
 * 2. `complete(key, result)` — mark as completed; stores the job result so
 *    subsequent duplicates can replay the same output without re-executing.
 * 3. `release(key)`          — on unrecoverable failure, remove the lock so
 *    the next genuine retry can re-acquire it.
 */
@Injectable()
export class JobIdempotencyService {
  private readonly logger = new Logger(JobIdempotencyService.name);

  /**
   * TTL for job idempotency records.
   * 7 days is generous enough to cover all realistic retry windows while
   * still allowing the `cleanupExpired` job to reclaim the rows.
   */
  private readonly JOB_TTL_HOURS = 7 * 24;

  constructor(private readonly idempotencyService: IdempotencyService) {}

  // ── Key Generation ───────────────────────────────────────────────────────

  /**
   * Builds the canonical idempotency key for a payout job.
   *
   * @param payoutId  The internal payout record UUID.
   * @param jobType   e.g. `'payout:process'` or `'payout:settle'`.
   */
  buildPayoutJobKey(payoutId: string, jobType: string): string {
    return `payout-job:${payoutId}:${jobType}`;
  }

  // ── Core Operations ──────────────────────────────────────────────────────

  /**
   * Check whether a job was already processed (or is currently in flight)
   * and, if neither, atomically acquire the processing lock.
   *
   * @param idempotencyKey  The unique key for this job execution attempt.
   * @returns               {@link JobIdempotencyCheck} — see interface docs.
   */
  async checkAndLock(idempotencyKey: string): Promise<JobIdempotencyCheck> {
    this.logger.debug(`Checking job idempotency key: ${idempotencyKey}`);

    // ── 1. Look for an existing (non-expired) record ─────────────────────
    const existing = await this.idempotencyService.findByKey(idempotencyKey);

    if (existing) {
      if (existing.completedAt) {
        // Already ran successfully — return the cached result.
        this.logger.log(
          `Job idempotency key already completed: ${idempotencyKey}`,
        );
        return {
          alreadyProcessed: true,
          locked: false,
          result: existing.responseBody,
        };
      }

      if (existing.locked) {
        // Another worker holds the lock — signal the caller to skip.
        this.logger.warn(
          `Job idempotency key is locked (in-flight): ${idempotencyKey}`,
        );
        return { alreadyProcessed: false, locked: true };
      }
    }

    // ── 2. Try to acquire the lock ────────────────────────────────────────
    const fingerprint = this.idempotencyService.computeFingerprint(
      'JOB',
      idempotencyKey,
      {},
    );

    const acquireResult = await this.idempotencyService.tryAcquire(
      idempotencyKey,
      fingerprint,
      'JOB', // requestMethod — repurposed as "origin" discriminator
      idempotencyKey, // requestPath  — stores the key itself for traceability
      '', // bodyHash       — no HTTP body for job payloads
    );

    if (!acquireResult.acquired) {
      // Race condition: another instance inserted between our read and write.
      const rec = acquireResult.existing;
      if (rec?.completedAt) {
        this.logger.log(
          `Job idempotency key already completed (race): ${idempotencyKey}`,
        );
        return {
          alreadyProcessed: true,
          locked: false,
          result: rec.responseBody,
        };
      }
      this.logger.warn(
        `Job idempotency key locked after race: ${idempotencyKey}`,
      );
      return { alreadyProcessed: false, locked: true };
    }

    this.logger.debug(`Job idempotency lock acquired: ${idempotencyKey}`);
    return { alreadyProcessed: false, locked: false };
  }

  /**
   * Mark the job as successfully completed and persist the result so that
   * future duplicate executions can return the same output without re-running.
   *
   * @param idempotencyKey  Key that was previously acquired via `checkAndLock`.
   * @param result          The serialisable job result to cache.
   */
  async complete(
    idempotencyKey: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    // HTTP status code 200 is used as a sentinel for "success" in the
    // existing IdempotencyService schema.
    await this.idempotencyService.complete(idempotencyKey, 200, result);
    this.logger.debug(`Job idempotency key marked complete: ${idempotencyKey}`);
  }

  /**
   * Release (delete) the idempotency lock on a permanent failure so that
   * the next genuine retry can re-acquire it.  This should **not** be called
   * for transient errors that BullMQ will retry automatically.
   *
   * @param idempotencyKey  Key that was previously acquired via `checkAndLock`.
   */
  async release(idempotencyKey: string): Promise<void> {
    await this.idempotencyService.remove(idempotencyKey);
    this.logger.debug(
      `Job idempotency key released (lock removed): ${idempotencyKey}`,
    );
  }
}
