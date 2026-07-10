import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { QUEUES, DEFAULT_JOB_OPTIONS } from './jobs.constants';
import {
  getRetryPolicy,
  policyToBullMQOptions,
  isNonRetryableError,
} from './job-retry-policy';
import { JobType } from './job.types';
import { DataExportProcessor } from './processors/export.processor';
import {
  TracingService,
  TraceContext,
} from '../../common/tracing/tracing.service';

export interface QueueMetrics {
  queue: string;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  waiting: number;
}

interface TraceableJobData {
  __trace?: TraceContext;
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

  constructor(
    private readonly tracing: TracingService,
    private readonly dataExportProcessor?: DataExportProcessor,
  ) {}

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

  /**
   * Add a job to a named queue.
   *
   * When `jobType` is provided, its per-type retry policy is resolved and
   * merged into the options **before** any caller-supplied overrides.  This
   * means callers can still fine-tune individual jobs while benefiting from
   * sensible defaults automatically.
   *
   * Precedence (highest → lowest):
   *   caller opts  >  per-type policy  >  DEFAULT_JOB_OPTIONS
   *
   * Tracing context is automatically attached to job data and a span is
   * created for the enqueue operation.
   */
  async addJob(
    name: string,
    data: any,
    opts: Record<string, any> = {},
    jobType?: JobType,
  ) {
    const queue = this.getQueue(name);
    if (!queue) throw new Error(`Queue ${name} not found`);

    const traceContext = this.tracing.getCurrentContext();
    const tracedData = this.attachTraceContext(
      jobType ? { ...data, __jobType: jobType } : data,
      traceContext,
    );

    const policyOpts = jobType
      ? policyToBullMQOptions(getRetryPolicy(jobType))
      : DEFAULT_JOB_OPTIONS;

    const jobOpts = { ...DEFAULT_JOB_OPTIONS, ...policyOpts, ...opts };

    return this.tracing.trace(
      'jobs.queue.enqueue',
      async (span) => {
        span.attributes['queue.name'] = name;
        span.attributes['job.name'] = `${name}-job`;
        if (jobType) {
          span.attributes['job.type'] = jobType;
        }
        if (traceContext) {
          span.attributes['trace.id'] = traceContext.traceId;
          span.attributes['trace.parent_span_id'] = traceContext.spanId;
        }

        return queue.add(`${name}-job`, tracedData, jobOpts);
      },
      {
        'queue.name': name,
        'job.name': `${name}-job`,
      },
    );
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

  /**
   * Creates a BullMQ Worker for the given queue.
   *
   * The worker's `failed` handler checks whether the error is classified as
   * non-retryable for the job type stored in `job.data.__jobType`.  When it
   * is, OR when `attemptsMade` has reached the configured maximum, the job is
   * forwarded to the dead-letter queue immediately.
   */
  private createWorker(name: string, processor: (job: Job) => Promise<any>) {
    const worker = new Worker(
      name,
      async (job: Job) => {
        const traceContext = this.extractTraceContext(
          job.data as TraceableJobData,
        );

        const processJob = () =>
          this.tracing.trace(
            'jobs.queue.process',
            async (span) => {
              span.attributes['queue.name'] = name;
              span.attributes['job.id'] = String(job.id ?? 'unknown');
              span.attributes['job.name'] = job.name;
              span.attributes['job.attempt'] = job.attemptsMade ?? 0;
              return await processor(job);
            },
            {
              'queue.name': name,
              'job.id': String(job.id ?? 'unknown'),
              'job.name': job.name,
              'job.attempt': job.attemptsMade ?? 0,
            },
          );

        if (traceContext) {
          return this.tracing.runInContext(traceContext, processJob);
        }

        return processJob();
      },
      redisConnection(),
    );

    worker.on('failed', (job, err) => {
      void (async () => {
        if (!job) return;

        const jobType: JobType | undefined = job.data?.__jobType as
          | JobType
          | undefined;

        // Determine max attempts: prefer per-type policy, fall back to job opts
        const maxAttempts: number = jobType
          ? getRetryPolicy(jobType).attempts
          : ((job.opts as any)?.attempts ?? DEFAULT_JOB_OPTIONS.attempts);

        const attemptsExhausted = (job.attemptsMade ?? 0) >= maxAttempts;
        const notRetryable =
          jobType && err?.message
            ? isNonRetryableError(jobType, err.message)
            : false;

        if (attemptsExhausted || notRetryable) {
          const reason = notRetryable
            ? 'non-retryable error'
            : 'attempts exhausted';

          this.logger.warn(
            `Job ${job.id} (${name}) forwarded to DLQ: ${reason} – ${err?.message}`,
          );

          await this.queues[QUEUES.DEAD_LETTER].add(`${name}-dlq`, {
            failedJob: {
              id: job.id,
              name: job.name,
              data: job.data,
              failedReason: err?.message ?? String(err),
              reason,
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
    console.log('Processing cleanup job', job.id, job.data);
    return { cleaned: true };
  }

  private async handleScheduled(job: Job) {
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

  private attachTraceContext(data: any, traceContext?: TraceContext): any {
    if (!traceContext) return data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { ...data, __trace: traceContext };
    }
    return data;
  }

  private extractTraceContext(
    data?: TraceableJobData,
  ): TraceContext | undefined {
    if (!data?.__trace) return undefined;

    const { traceId, spanId } = data.__trace;
    if (
      typeof traceId === 'string' &&
      traceId.length === 32 &&
      typeof spanId === 'string' &&
      spanId.length === 16
    ) {
      return { traceId, spanId };
    }

    return undefined;
  }
}
