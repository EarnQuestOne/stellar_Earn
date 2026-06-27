import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { QUEUES, DEFAULT_JOB_OPTIONS } from './jobs.constants';
import { DataExportProcessor } from './processors/export.processor';

export interface QueueMetrics {
  queue: string;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  waiting: number;
}

const redisConnection = () => {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  return { connection: { url } };
};

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queues: Record<string, Queue> = {};
  private workers: Worker[] = [];
  private emailProcessor:
    | ((messageId: string, dto: any) => Promise<void>)
    | null = null;

  constructor(private readonly dataExportProcessor?: DataExportProcessor) {}

  registerEmailProcessor(
    processor: (messageId: string, dto: any) => Promise<void>,
  ) {
    this.emailProcessor = processor;
  }

  onModuleInit() {
    this.queues[QUEUES.NOTIFICATIONS] = new Queue(
      QUEUES.NOTIFICATIONS,
      redisConnection(),
    );
    this.queues[QUEUES.ANALYTICS] = new Queue(
      QUEUES.ANALYTICS,
      redisConnection(),
    );
    this.queues[QUEUES.CLEANUP] = new Queue(QUEUES.CLEANUP, redisConnection());
    this.queues[QUEUES.SCHEDULED] = new Queue(
      QUEUES.SCHEDULED,
      redisConnection(),
    );
    this.queues[QUEUES.DEAD_LETTER] = new Queue(
      QUEUES.DEAD_LETTER,
      redisConnection(),
    );
    this.queues[QUEUES.EMAIL] = new Queue(QUEUES.EMAIL, redisConnection());
    this.queues[QUEUES.EXPORTS] = new Queue(QUEUES.EXPORTS, redisConnection());

    this.createWorker(QUEUES.NOTIFICATIONS, this.handleNotification.bind(this));
    this.createWorker(QUEUES.ANALYTICS, this.handleAnalytics.bind(this));
    this.createWorker(QUEUES.CLEANUP, this.handleCleanup.bind(this));
    this.createWorker(QUEUES.SCHEDULED, this.handleScheduled.bind(this));
    this.createWorker(QUEUES.EMAIL, this.handleEmail.bind(this));
    if (
      this.dataExportProcessor &&
      typeof this.dataExportProcessor.processExport === 'function'
    ) {
      this.createWorker(
        QUEUES.EXPORTS,
        this.dataExportProcessor.processExport.bind(this.dataExportProcessor),
      );
    }
  }

  async onModuleDestroy() {
    this.logger.log(
      'Initiating graceful shutdown of background workers and queues...',
    );

    const timeoutMs = parseInt(
      process.env.WORKER_SHUTDOWN_TIMEOUT_MS || '10000',
      10,
    );

    if (this.workers.length > 0) {
      this.logger.log(`Pausing ${this.workers.length} workers...`);
      await Promise.all(
        this.workers.map(async (worker) => {
          try {
            await worker.pause(true);
            this.logger.log(`Worker for queue ${worker.name} paused.`);
          } catch (error) {
            this.logger.error(
              `Error pausing worker for queue ${worker.name}: ${error.message}`,
            );
          }
        }),
      );

      this.logger.log(
        `Closing and draining workers (timeout: ${timeoutMs}ms)...`,
      );
      await Promise.all(
        this.workers.map(async (worker) => {
          try {
            const closePromise = worker.close();
            const timeoutPromise = new Promise<void>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`Drain timeout of ${timeoutMs}ms exceeded`)),
                timeoutMs,
              ),
            );
            await Promise.race([closePromise, timeoutPromise]);
            this.logger.log(
              `Worker for queue ${worker.name} closed successfully.`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to drain worker for queue ${worker.name} gracefully: ${error.message}. Force closing...`,
            );
            try {
              await worker.close(true);
              this.logger.log(`Worker for queue ${worker.name} force closed.`);
            } catch (forceError) {
              this.logger.error(
                `Error force closing worker for queue ${worker.name}: ${forceError.message}`,
              );
            }
          }
        }),
      );
    }

    const queueNames = Object.keys(this.queues);
    if (queueNames.length > 0) {
      this.logger.log(`Closing ${queueNames.length} queues...`);
      await Promise.all(
        Object.entries(this.queues).map(async ([name, queue]) => {
          try {
            await queue.close();
            this.logger.log(`Queue ${name} closed successfully.`);
          } catch (error) {
            this.logger.error(`Error closing queue ${name}: ${error.message}`);
          }
        }),
      );
    }

    this.logger.log('Graceful shutdown completed.');
  }

  getQueue(name: string) {
    return this.queues[name];
  }

  async addJob(name: string, data: any, opts: any = {}) {
    const queue = this.getQueue(name);
    if (!queue) throw new Error(`Queue ${name} not found`);
    const jobOpts = { ...DEFAULT_JOB_OPTIONS, ...opts };
    return queue.add(`${name}-job`, data, jobOpts);
  }

  /** Returns active, delayed, failed, and completed counts for every queue. */
  async getQueueMetrics(): Promise<QueueMetrics[]> {
    return Promise.all(
      Object.entries(this.queues).map(async ([name, queue]) => {
        const [active, delayed, failed, completed, waiting] = await Promise.all(
          [
            queue.getActiveCount(),
            queue.getDelayedCount(),
            queue.getFailedCount(),
            queue.getCompletedCount(),
            queue.getWaitingCount(),
          ],
        );
        return { queue: name, active, delayed, failed, completed, waiting };
      }),
    );
  }

  /** Returns metrics for a single named queue, or null if not found. */
  async getQueueMetricsByName(name: string): Promise<QueueMetrics | null> {
    const queue = this.queues[name];
    if (!queue) return null;
    const [active, delayed, failed, completed, waiting] = await Promise.all([
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
      queue.getCompletedCount(),
      queue.getWaitingCount(),
    ]);
    return { queue: name, active, delayed, failed, completed, waiting };
  }

  private createWorker(name: string, processor: (job: Job) => Promise<any>) {
    const worker = new Worker(
      name,
      async (job: Job) => {
        return await processor(job);
      },
      redisConnection(),
    );

    worker.on('failed', (job, err) => {
      void (async () => {
        if (!job) return;
        const attempts = job.attemptsMade ?? 0;
        const maxAttempts =
          (job.opts && (job.opts as any).attempts) ||
          DEFAULT_JOB_OPTIONS.attempts;
        if (attempts >= maxAttempts) {
          await this.queues[QUEUES.DEAD_LETTER].add(`${name}-dlq`, {
            failedJob: {
              id: job.id,
              name: job.name,
              data: job.data,
              failedReason: err?.message ?? String(err),
            },
          } as any);
        }
      })();
    });

    this.workers.push(worker);
  }

  private async handleNotification(job: Job) {
    await job.updateProgress(20);
    console.log('Processing notification job', job.id, job.data);
    await job.updateProgress(100);
    return { ok: true };
  }

  private async handleAnalytics(job: Job) {
    await job.updateProgress(10);
    console.log('Processing analytics job', job.id, job.data);
    await job.updateProgress(100);
    return { ok: true };
  }

  private async handleCleanup(job: Job) {
    await Promise.resolve();
    console.log('Processing cleanup job', job.id, job.data);
    return { cleaned: true };
  }

  private async handleScheduled(job: Job) {
    await Promise.resolve();
    console.log('Processing scheduled job', job.id, job.data);
    return { ran: true };
  }

  private async handleEmail(job: Job) {
    const { messageId, dto } = job.data;
    await job.updateProgress(10);
    if (this.emailProcessor) {
      await this.emailProcessor(messageId, dto);
    } else {
      this.logger.warn(
        `No email processor registered, skipping email job ${job.id}`,
      );
    }
    await job.updateProgress(100);
    return { sent: true, messageId };
  }
}
