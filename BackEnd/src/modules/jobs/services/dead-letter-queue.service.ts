import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { QUEUES } from '../jobs.constants';

export interface DeadLetterJob {
  id: string | undefined;
  name: string | undefined;
  data: any;
  failedReason: string;
  reason: string;
  timestamp: number;
  sourceQueue: string;
}

export interface DeadLetterMetrics {
  total: number;
  bySourceQueue: Record<string, number>;
  oldestJobAge: number | null;
}

/**
 * Dead-Letter Queue Service
 *
 * Provides inspection, metrics, and replay capabilities for jobs that
 * exhausted retries or hit non-retryable errors.  Integrates with the
 * existing bounded retry infrastructure in `jobs.service.ts`.
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private dlqQueue: Queue | null = null;

  private readonly maxReplayAttempts = parseInt(
    process.env.DLQ_MAX_REPLAY_ATTEMPTS || '3',
    10,
  );

  constructor() {}

  /** Lazily resolve the DLQ queue from BullMQ. */
  private getDlqQueue(): Queue | null {
    if (this.dlqQueue) return this.dlqQueue;
    try {
      const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      this.dlqQueue = new Queue(QUEUES.DEAD_LETTER, {
        connection: { url },
      });
      return this.dlqQueue;
    } catch (err) {
      this.logger.error(
        'Failed to connect to DLQ queue',
        (err as Error).message,
      );
      return null;
    }
  }

  /**
   * List all jobs currently in the dead-letter queue.
   *
   * @param start - offset for pagination (default 0)
   * @param end   - exclusive end index (default 50)
   */
  async listDeadJobs(
    start = 0,
    end = 50,
  ): Promise<{ jobs: DeadLetterJob[]; total: number }> {
    const queue = this.getDlqQueue();
    if (!queue) return { jobs: [], total: 0 };

    const [waitingJobs, count] = await Promise.all([
      queue.getJobs(['waiting', 'active', 'completed', 'failed'], start, end),
      queue.getWaitingCount(),
    ]);

    const jobs: DeadLetterJob[] = waitingJobs.map((job) =>
      this.mapToDeadLetterJob(job),
    );

    return { jobs, total: count };
  }

  /**
   * Get metrics about the dead-letter queue.
   */
  async getMetrics(): Promise<DeadLetterMetrics> {
    const queue = this.getDlqQueue();
    if (!queue) return { total: 0, bySourceQueue: {}, oldestJobAge: null };

    const [waitingCount, failedCount] = await Promise.all([
      queue.getWaitingCount(),
      queue.getFailedCount(),
    ]);

    const total = waitingCount + failedCount;

    // Sample recent jobs to determine source queue distribution
    const sampleJobs = await queue.getJobs(['waiting', 'failed'], 0, 99);
    const bySourceQueue: Record<string, number> = {};
    let oldestTimestamp = Infinity;

    for (const job of sampleJobs) {
      const sourceQueue = job.data?.failedJob?.data?.__sourceQueue ?? 'unknown';
      bySourceQueue[sourceQueue] = (bySourceQueue[sourceQueue] || 0) + 1;

      if (job.timestamp && job.timestamp < oldestTimestamp) {
        oldestTimestamp = job.timestamp;
      }
    }

    return {
      total,
      bySourceQueue,
      oldestJobAge:
        oldestTimestamp < Infinity ? Date.now() - oldestTimestamp : null,
    };
  }

  /**
   * Replay a single DLQ job back to its original source queue.
   *
   * The job is re-enqueued with a fresh retry budget.  A replay counter
   * is attached to prevent infinite replay loops.
   */
  async replayJob(dlqJobId: string): Promise<{
    success: boolean;
    message: string;
    targetQueue?: string;
  }> {
    const queue = this.getDlqQueue();
    if (!queue) {
      return { success: false, message: 'DLQ queue unavailable' };
    }

    const job = await queue.getJob(dlqJobId);
    if (!job) {
      return { success: false, message: `DLQ job ${dlqJobId} not found` };
    }

    const failedJob = job.data?.failedJob;
    if (!failedJob?.data) {
      return {
        success: false,
        message: 'DLQ job is missing original job data',
      };
    }

    // Check replay loop protection
    const replayCount: number =
      (failedJob.data.__dlqReplayCount as number) ?? 0;
    if (replayCount >= this.maxReplayAttempts) {
      return {
        success: false,
        message: `Replay limit (${this.maxReplayAttempts}) reached for this job`,
      };
    }

    const originalData = { ...failedJob.data };
    delete originalData.__trace;
    const sourceQueue: string =
      originalData.__sourceQueue ?? QUEUES.NOTIFICATIONS;
    delete originalData.__sourceQueue;

    // Increment replay counter
    originalData.__dlqReplayCount = replayCount + 1;
    originalData.__dlqReplayedAt = new Date().toISOString();

    try {
      const replayQueue = new Queue(sourceQueue, {
        connection: {
          url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        },
      });

      await replayQueue.add(`${sourceQueue}-replay-job`, originalData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      });

      // Remove from DLQ
      await job.remove();
      await replayQueue.close();

      this.logger.log(
        `Replayed DLQ job ${dlqJobId} (source: ${sourceQueue}, attempt ${replayCount + 1}/${this.maxReplayAttempts})`,
      );

      return {
        success: true,
        message: `Job replayed to ${sourceQueue}`,
        targetQueue: sourceQueue,
      };
    } catch (err) {
      this.logger.error(
        `Failed to replay DLQ job ${dlqJobId}: ${(err as Error).message}`,
      );
      return {
        success: false,
        message: `Replay failed: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Replay all DLQ jobs matching an optional source queue filter.
   */
  async replayAll(
    sourceQueueFilter?: string,
  ): Promise<{ replayed: number; failed: number; skipped: number }> {
    const queue = this.getDlqQueue();
    if (!queue) return { replayed: 0, failed: 0, skipped: 0 };

    const jobs = await queue.getJobs(['waiting', 'failed'], 0, 1000);
    let replayed = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      const sourceQueue = job.data?.failedJob?.data?.__sourceQueue ?? 'unknown';

      if (sourceQueueFilter && sourceQueue !== sourceQueueFilter) {
        skipped++;
        continue;
      }

      const result = await this.replayJob(job.id!);
      if (result.success) {
        replayed++;
      } else {
        failed++;
      }
    }

    this.logger.log(
      `Bulk replay complete: ${replayed} replayed, ${failed} failed, ${skipped} skipped`,
    );

    return { replayed, failed, skipped };
  }

  /**
   * Purge (delete) all jobs from the DLQ.
   */
  async purge(): Promise<{ purged: number }> {
    const queue = this.getDlqQueue();
    if (!queue) return { purged: 0 };

    const jobs = await queue.getJobs(
      ['waiting', 'active', 'completed', 'failed'],
      0,
      10000,
    );

    for (const job of jobs) {
      await job.remove();
    }

    this.logger.log(`Purged ${jobs.length} jobs from DLQ`);
    return { purged: jobs.length };
  }

  private mapToDeadLetterJob(job: Job): DeadLetterJob {
    const failedJob = job.data?.failedJob ?? {};
    return {
      id: job.id,
      name: failedJob.name ?? job.name,
      data: failedJob.data,
      failedReason: failedJob.failedReason ?? 'unknown',
      reason: failedJob.reason ?? 'unknown',
      timestamp: job.timestamp,
      sourceQueue: failedJob.data?.__sourceQueue ?? 'unknown',
    };
  }
}
