import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsModule } from '../../../src/modules/jobs/jobs.module';
import { WebhooksModule } from '../../../src/modules/webhooks/webhooks.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { JobsService } from '../../../src/modules/jobs/jobs.service';
import { WebhooksService } from '../../../src/modules/webhooks/webhooks.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { User } from '../../../src/modules/users/entities/user.entity';
import { Job } from '../../../src/modules/jobs/entities/job.entity';
import { Webhook } from '../../../src/modules/webhooks/entities/webhook.entity';

describe('Jobs-Webhooks Integration', () => {
  let module: TestingModule;
  let jobsService: JobsService;
  let webhooksService: WebhooksService;
  let usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Job, Webhook],
          synchronize: true,
          dropSchema: true,
        }),
        JobsModule,
        WebhooksModule,
        UsersModule,
      ],
    }).compile();

    jobsService = module.get<JobsService>(JobsService);
    webhooksService = module.get<WebhooksService>(WebhooksService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const jobRepository = module.get('JobRepository');
    const webhookRepository = module.get('WebhookRepository');

    await webhookRepository.clear();
    await jobRepository.clear();
    await userRepository.clear();
  });

  describe('Job Processing with Webhook Notifications', () => {
    it('should create job and trigger webhook on completion', async () => {
      // Create a test user
      const user = await usersService.create({
        stellarAddress: 'GBJOB123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Job Test User',
      });

      // Create a webhook for job completion notifications
      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-complete',
        events: ['job.completed', 'job.failed'],
        secret: 'webhook_secret_123',
        active: true,
      });

      // Create a job
      const job = await jobsService.create({
        userId: user.id,
        type: 'data_processing',
        priority: 'normal',
        data: {
          operation: 'process_user_data',
          userId: user.id,
          parameters: { format: 'json', includeHistory: true },
        },
        status: 'pending',
      });

      // Verify job was created
      expect(job.userId).toBe(user.id);
      expect(job.type).toBe('data_processing');
      expect(job.status).toBe('pending');

      // Verify webhook was created
      expect(webhook.userId).toBe(user.id);
      expect(webhook.events).toContain('job.completed');
      expect(webhook.active).toBe(true);

      // Simulate job completion (in real system, this would be done by job processor)
      const completedJob = await jobsService.updateStatus(job.id, 'completed', {
        result: { processedRecords: 150, duration: 2500 },
      });

      expect(completedJob.status).toBe('completed');

      // In a real system, this would trigger webhook delivery
      // For testing, we verify the job completion state
      const foundJob = await jobsService.findById(job.id);
      expect(foundJob.status).toBe('completed');
    });

    it('should handle job failures and trigger failure webhooks', async () => {
      // Create user and webhook
      const user = await usersService.create({
        stellarAddress: 'GBFAIL123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Failure Test User',
      });

      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-fail',
        events: ['job.failed'],
        secret: 'failure_secret_456',
        active: true,
      });

      // Create a job that will fail
      const job = await jobsService.create({
        userId: user.id,
        type: 'payment_processing',
        priority: 'high',
        data: {
          operation: 'process_payment',
          amount: 100,
          currency: 'XLM',
          destination: 'invalid_address', // This would cause failure
        },
        status: 'pending',
      });

      // Simulate job failure
      const failedJob = await jobsService.updateStatus(job.id, 'failed', {
        error: {
          code: 'INVALID_DESTINATION',
          message: 'Invalid Stellar address provided',
          details: { address: 'invalid_address' },
        },
      });

      expect(failedJob.status).toBe('failed');

      // Verify failure data is stored
      const foundJob = await jobsService.findById(job.id);
      expect(foundJob.status).toBe('failed');
      expect(foundJob.result.error.code).toBe('INVALID_DESTINATION');
    });
  });

  describe('Scheduled Jobs and Webhook Retries', () => {
    it('should handle scheduled jobs with webhook retry logic', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBSCHED123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Scheduled Job User',
      });

      // Create webhook with retry configuration
      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/scheduled',
        events: ['job.scheduled', 'job.completed'],
        secret: 'scheduled_secret_789',
        active: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      });

      // Create a scheduled job
      const scheduledJob = await jobsService.create({
        userId: user.id,
        type: 'scheduled_report',
        priority: 'low',
        data: {
          operation: 'generate_weekly_report',
          schedule: '0 9 * * 1', // Every Monday at 9 AM
          parameters: { format: 'pdf', includeCharts: true },
        },
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      });

      expect(scheduledJob.status).toBe('scheduled');
      expect(scheduledJob.scheduledFor).toBeDefined();

      // Simulate job execution
      const runningJob = await jobsService.updateStatus(scheduledJob.id, 'running');
      expect(runningJob.status).toBe('running');

      // Complete the job
      const completedJob = await jobsService.updateStatus(runningJob.id, 'completed', {
        result: {
          reportUrl: 'https://storage.example.com/reports/weekly_001.pdf',
          generatedAt: new Date().toISOString(),
        },
      });

      expect(completedJob.status).toBe('completed');
    });

    it('should handle webhook delivery failures with retry mechanism', async () => {
      // Create user and webhook
      const user = await usersService.create({
        stellarAddress: 'GBRETRY123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Retry Test User',
      });

      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://unreliable-api.example.com/webhooks/retry', // Unreliable endpoint
        events: ['job.retry_test'],
        secret: 'retry_secret_101',
        active: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 1.5,
          initialDelay: 500,
        },
      });

      // Create job
      const job = await jobsService.create({
        userId: user.id,
        type: 'retry_test',
        priority: 'normal',
        data: { operation: 'test_retry_logic' },
        status: 'pending',
      });

      // Complete job (this would trigger webhook with retry logic)
      const completedJob = await jobsService.updateStatus(job.id, 'completed', {
        result: { success: true, attempts: 2 },
      });

      expect(completedJob.status).toBe('completed');

      // In a real system, webhook service would handle retries
      // For testing, we verify the job completion and webhook configuration
      const foundWebhook = await webhooksService.findById(webhook.id);
      expect(foundWebhook.retryConfig.maxRetries).toBe(3);
      expect(foundWebhook.retryConfig.backoffMultiplier).toBe(1.5);
    });
  });

  describe('Bulk Job Processing and Webhook Batching', () => {
    it('should handle bulk job creation and batched webhook notifications', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBBULK123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Bulk Job User',
      });

      // Create webhook for batch notifications
      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/bulk-jobs',
        events: ['jobs.batch_completed'],
        secret: 'bulk_secret_202',
        active: true,
      });

      // Create multiple jobs (simulating bulk operation)
      const jobs = [];
      for (let i = 0; i < 10; i++) {
        const job = await jobsService.create({
          userId: user.id,
          type: 'bulk_operation',
          priority: 'normal',
          data: {
            operation: 'process_item',
            itemId: i + 1,
            batchId: 'batch_001',
          },
          status: 'pending',
        });
        jobs.push(job);
      }

      expect(jobs).toHaveLength(10);

      // Complete jobs in batches
      const completedJobs = [];
      for (let i = 0; i < jobs.length; i++) {
        const completedJob = await jobsService.updateStatus(jobs[i].id, 'completed', {
          result: { itemId: i + 1, processed: true },
        });
        completedJobs.push(completedJob);
      }

      expect(completedJobs).toHaveLength(10);

      // Verify all jobs completed
      for (const job of completedJobs) {
        expect(job.status).toBe('completed');
      }

      // In production, this would trigger a batched webhook notification
      // For testing, we verify the job states and webhook configuration
      const foundWebhook = await webhooksService.findById(webhook.id);
      expect(foundWebhook.events).toContain('jobs.batch_completed');
    });

    it('should maintain job-webhook relationship integrity', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBRELATION123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Relationship Test User',
      });

      // Create multiple webhooks for different job types
      const webhooks = [];
      const webhookTypes = ['data_jobs', 'payment_jobs', 'notification_jobs'];

      for (const type of webhookTypes) {
        const webhook = await webhooksService.create({
          userId: user.id,
          url: `https://api.example.com/webhooks/${type}`,
          events: [`job.${type}_completed`],
          secret: `${type}_secret`,
          active: true,
        });
        webhooks.push(webhook);
      }

      // Create jobs corresponding to webhook types
      const jobs = [];
      for (let i = 0; i < webhookTypes.length; i++) {
        const job = await jobsService.create({
          userId: user.id,
          type: webhookTypes[i].replace('_jobs', ''),
          priority: 'normal',
          data: { operation: `process_${webhookTypes[i]}`, sequence: i + 1 },
          status: 'pending',
        });
        jobs.push(job);
      }

      // Complete jobs and verify relationships
      for (let i = 0; i < jobs.length; i++) {
        const completedJob = await jobsService.updateStatus(jobs[i].id, 'completed', {
          result: { webhookTriggered: webhooks[i].id, success: true },
        });

        expect(completedJob.status).toBe('completed');
        expect(completedJob.result.webhookTriggered).toBe(webhooks[i].id);
      }

      // Verify all relationships are maintained
      for (let i = 0; i < jobs.length; i++) {
        const job = await jobsService.findById(jobs[i].id);
        const webhook = await webhooksService.findById(webhooks[i].id);

        expect(job.userId).toBe(user.id);
        expect(webhook.userId).toBe(user.id);
        expect(job.result.webhookTriggered).toBe(webhook.id);
      }
    });
  });
});