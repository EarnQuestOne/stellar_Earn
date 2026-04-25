import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { QUEUES, DEFAULT_JOB_OPTIONS } from './jobs.constants';
import { DataExportProcessor } from './processors/export.processor';

const redisConnection = () => {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  return { connection: { url } };
};

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queues: Record<string, Queue> = {};
  private workers: Worker[] = [];
  private emailProcessor: ((messageId: string, dto: any) => Promise<void>) | null = null;

  constructor(private readonly dataExportProcessor?: DataExportProcessor) {}

  registerEmailProcessor(processor: (messageId: string, dto: any) => Promise<void>) {
    this.emailProcessor = processor;
  }

  onModuleInit() {
    this.queues[QUEUES.NOTIFICATIONS] = new Queue(QUEUES.NOTIFICATIONS, redisConnection() as any);
    this.queues[QUEUES.ANALYTICS] = new Queue(QUEUES.ANALYTICS, redisConnection() as any);
    this.queues[QUEUES.CLEANUP] = new Queue(QUEUES.CLEANUP, redisConnection() as any);
    this.queues[QUEUES.SCHEDULED] = new Queue(QUEUES.SCHEDULED, redisConnection() as any);
    this.queues[QUEUES.DEAD_LETTER] = new Queue(QUEUES.DEAD_LETTER, redisConnection() as any);
    this.queues[QUEUES.EMAIL] = new Queue(QUEUES.EMAIL, redisConnection() as any);
    this.queues[QUEUES.EXPORTS] = new Queue(QUEUES.EXPORTS, redisConnection() as any);

    this.createWorker(QUEUES.NOTIFICATIONS, this.handleNotification.bind(this));
    this.createWorker(QUEUES.ANALYTICS, this.handleAnalytics.bind(this));
    this.createWorker(QUEUES.CLEANUP, this.handleCleanup.bind(this));
    this.createWorker(QUEUES.SCHEDULED, this.handleScheduled.bind(this));
    this.createWorker(QUEUES.EMAIL, this.handleEmail.bind(this));
    // register exports worker if processor available
    if (this.dataExportProcessor && typeof this.dataExportProcessor.processExport === 'function') {
      this.createWorker(QUEUES.EXPORTS, this.dataExportProcessor.processExport.bind(this.dataExportProcessor));
    }
  }

  async onModuleDestroy() {
    await Promise.all(Object.values(this.queues).map((q) => q.close()));
    await Promise.all(this.workers.map((w) => w.close()));
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

  private createWorker(name: string, processor: (job: Job) => Promise<any>) {
    const worker = new Worker(name, async (job: Job) => {
      try {
        return await processor(job);
      } catch (err) {
        // rethrow so BullMQ handles attempts/backoff
        throw err;
      }
    }, redisConnection() as any);

    worker.on('failed', async (job, err) => {
      if (!job) return;
      const attempts = job.attemptsMade ?? 0;
      const maxAttempts = (job.opts && (job.opts as any).attempts) || DEFAULT_JOB_OPTIONS.attempts;
      if (attempts >= maxAttempts) {
        // move to dead-letter queue for inspection
        await this.queues[QUEUES.DEAD_LETTER].add(`${name}-dlq`, { failedJob: { id: job.id, name: job.name, data: job.data, failedReason: err?.message ?? String(err) } } as any);
      }
    });

    this.workers.push(worker);
  }

  // processors
  private async handleNotification(job: Job) {
    // placeholder: integrate notifications module (non-blocking)
    // simulate progress
    await job.updateProgress(20);
    // perform work
    // eslint-disable-next-line no-console
    console.log('Processing notification job', job.id, job.data);
    await job.updateProgress(100);
    return { ok: true };
  }

  private async handleAnalytics(job: Job) {
    await job.updateProgress(10);
    // perform aggregation
    // eslint-disable-next-line no-console
    console.log('Processing analytics job', job.id, job.data);
    await job.updateProgress(100);
    return { ok: true };
  }

  private async handleCleanup(job: Job) {
    // cleanup tasks
    // eslint-disable-next-line no-console
    console.log('Processing cleanup job', job.id, job.data);
    return { cleaned: true };
  }

  private async handleScheduled(job: Job) {
    // eslint-disable-next-line no-console
    console.log('Processing scheduled job', job.id, job.data);
    return { ran: true };
  }

  private async handleEmail(job: Job) {
    const { messageId, dto } = job.data;
    await job.updateProgress(10);

    if (this.emailProcessor) {
      await this.emailProcessor(messageId, dto);
    } else {
      this.logger.warn(`No email processor registered, skipping email job ${job.id}`);
    }

    await job.updateProgress(100);
    return { sent: true, messageId };
  }
}
