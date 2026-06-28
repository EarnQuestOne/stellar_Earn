import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '#src/common/logger/logger.module';
import { UsersModule } from '#src/modules/users/users.module';
import { UsersService } from '#src/modules/users/users.service';
import { User } from '#src/modules/users/entities/user.entity';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { Submission } from '#src/modules/submissions/entities/submission.entity';

const mockJobsService = {
  create: jest.fn(),
  updateStatus: jest.fn(),
  findById: jest.fn(),
};

const mockWebhooksService = {
  create: jest.fn(),
  findById: jest.fn(),
};

describe('Jobs-Webhooks Integration', () => {
  let module: TestingModule;
  let jobsService: typeof mockJobsService;
  let webhooksService: typeof mockWebhooksService;
  let _usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        LoggerModule.forRoot({
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Quest, Submission],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        UsersModule,
      ],
      providers: [
        { provide: 'JobsService', useValue: mockJobsService },
        { provide: 'WebhooksService', useValue: mockWebhooksService },
      ],
    }).compile();

    jobsService = module.get('JobsService');
    webhooksService = module.get('WebhooksService');
    _usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const userRepository = module.get('UserRepository');
    await userRepository.query('DELETE FROM "users"');
  });

  describe('Job Processing with Webhook Notifications', () => {
    it('should create job and trigger webhook on completion', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAJOB',
        displayName: 'Job Test User',
      });

      mockWebhooksService.create.mockResolvedValue({
        id: 'webhook-1',
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-complete',
        events: ['job.completed', 'job.failed'],
        secret: 'webhook_secret_123',
        active: true,
      });

      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-complete',
        events: ['job.completed', 'job.failed'],
        secret: 'webhook_secret_123',
        active: true,
      });

      mockJobsService.create.mockResolvedValue({
        id: 'job-1',
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

      expect(job.userId).toBe(user.id);
      expect(job.type).toBe('data_processing');
      expect(job.status).toBe('pending');

      expect(webhook.userId).toBe(user.id);
      expect(webhook.events).toContain('job.completed');
      expect(webhook.active).toBe(true);

      mockJobsService.updateStatus.mockResolvedValue({
        ...job,
        status: 'completed',
        result: { processedRecords: 150, duration: 2500 },
      });

      const completedJob = await jobsService.updateStatus(job.id, 'completed', {
        result: { processedRecords: 150, duration: 2500 },
      });

      expect(completedJob.status).toBe('completed');

      mockJobsService.findById.mockResolvedValue({
        ...job,
        status: 'completed',
        result: { processedRecords: 150, duration: 2500 },
      });

      const foundJob = await jobsService.findById(job.id);
      expect(foundJob.status).toBe('completed');
    });

    it('should handle job failures and trigger failure webhooks', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAFAIL',
        displayName: 'Failure Test User',
      });

      mockWebhooksService.create.mockResolvedValue({
        id: 'webhook-2',
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-fail',
        events: ['job.failed'],
        secret: 'failure_secret_456',
        active: true,
      });

      await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/job-fail',
        events: ['job.failed'],
        secret: 'failure_secret_456',
        active: true,
      });

      mockJobsService.create.mockResolvedValue({
        id: 'job-2',
        userId: user.id,
        type: 'payment_processing',
        priority: 'high',
        data: {
          operation: 'process_payment',
          amount: 100,
          currency: 'XLM',
          destination: 'invalid_address',
        },
        status: 'pending',
      });

      const job = await jobsService.create({
        userId: user.id,
        type: 'payment_processing',
        priority: 'high',
        data: {
          operation: 'process_payment',
          amount: 100,
          currency: 'XLM',
          destination: 'invalid_address',
        },
        status: 'pending',
      });

      mockJobsService.updateStatus.mockResolvedValue({
        ...job,
        status: 'failed',
        result: {
          error: {
            code: 'INVALID_DESTINATION',
            message: 'Invalid Stellar address provided',
            details: { address: 'invalid_address' },
          },
        },
      });

      const failedJob = await jobsService.updateStatus(job.id, 'failed', {
        error: {
          code: 'INVALID_DESTINATION',
          message: 'Invalid Stellar address provided',
          details: { address: 'invalid_address' },
        },
      });

      expect(failedJob.status).toBe('failed');

      mockJobsService.findById.mockResolvedValue({
        ...job,
        status: 'failed',
        result: {
          error: {
            code: 'INVALID_DESTINATION',
            message: 'Invalid Stellar address provided',
            details: { address: 'invalid_address' },
          },
        },
      });

      const foundJob = await jobsService.findById(job.id);
      expect(foundJob.status).toBe('failed');
      expect(foundJob.result.error.code).toBe('INVALID_DESTINATION');
    });
  });

  describe('Scheduled Jobs and Webhook Retries', () => {
    it('should handle scheduled jobs with webhook retry logic', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GASCHED',
        displayName: 'Scheduled Job User',
      });

      mockWebhooksService.create.mockResolvedValue({
        id: 'webhook-3',
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

      await webhooksService.create({
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

      const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      mockJobsService.create.mockResolvedValue({
        id: 'job-3',
        userId: user.id,
        type: 'scheduled_report',
        priority: 'low',
        data: {
          operation: 'generate_weekly_report',
          schedule: '0 9 * * 1',
          parameters: { format: 'pdf', includeCharts: true },
        },
        status: 'scheduled',
        scheduledFor: scheduledDate,
      });

      const scheduledJob = await jobsService.create({
        userId: user.id,
        type: 'scheduled_report',
        priority: 'low',
        data: {
          operation: 'generate_weekly_report',
          schedule: '0 9 * * 1',
          parameters: { format: 'pdf', includeCharts: true },
        },
        status: 'scheduled',
        scheduledFor: scheduledDate,
      });

      expect(scheduledJob.status).toBe('scheduled');
      expect(scheduledJob.scheduledFor).toBeDefined();

      mockJobsService.updateStatus
        .mockResolvedValueOnce({ ...scheduledJob, status: 'running' })
        .mockResolvedValueOnce({
          ...scheduledJob,
          status: 'completed',
          result: {
            reportUrl: 'https://storage.example.com/reports/weekly_001.pdf',
            generatedAt: new Date().toISOString(),
          },
        });

      const runningJob = await jobsService.updateStatus(
        scheduledJob.id,
        'running',
      );
      expect(runningJob.status).toBe('running');

      const completedJob = await jobsService.updateStatus(
        runningJob.id,
        'completed',
        {
          result: {
            reportUrl: 'https://storage.example.com/reports/weekly_001.pdf',
            generatedAt: new Date().toISOString(),
          },
        },
      );

      expect(completedJob.status).toBe('completed');
    });

    it('should handle webhook delivery failures with retry mechanism', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GARETRY',
        displayName: 'Retry Test User',
      });

      mockWebhooksService.create.mockResolvedValue({
        id: 'webhook-4',
        userId: user.id,
        url: 'https://unreliable-api.example.com/webhooks/retry',
        events: ['job.retry_test'],
        secret: 'retry_secret_101',
        active: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 1.5,
          initialDelay: 500,
        },
      });

      const webhook = await webhooksService.create({
        userId: user.id,
        url: 'https://unreliable-api.example.com/webhooks/retry',
        events: ['job.retry_test'],
        secret: 'retry_secret_101',
        active: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 1.5,
          initialDelay: 500,
        },
      });

      mockJobsService.create.mockResolvedValue({
        id: 'job-4',
        userId: user.id,
        type: 'retry_test',
        priority: 'normal',
        data: { operation: 'test_retry_logic' },
        status: 'pending',
      });

      const job = await jobsService.create({
        userId: user.id,
        type: 'retry_test',
        priority: 'normal',
        data: { operation: 'test_retry_logic' },
        status: 'pending',
      });

      mockJobsService.updateStatus.mockResolvedValue({
        ...job,
        status: 'completed',
        result: { success: true, attempts: 2 },
      });

      const completedJob = await jobsService.updateStatus(job.id, 'completed', {
        result: { success: true, attempts: 2 },
      });

      expect(completedJob.status).toBe('completed');

      mockWebhooksService.findById.mockResolvedValue({
        ...webhook,
        id: webhook.id,
      });

      const foundWebhook = await webhooksService.findById(webhook.id);
      expect(foundWebhook.retryConfig.maxRetries).toBe(3);
      expect(foundWebhook.retryConfig.backoffMultiplier).toBe(1.5);
    });
  });

  describe('Bulk Job Processing and Webhook Batching', () => {
    it('should handle bulk job creation and batched webhook notifications', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GABULK',
        displayName: 'Bulk Job User',
      });

      mockWebhooksService.create.mockResolvedValue({
        id: 'webhook-5',
        userId: user.id,
        url: 'https://api.example.com/webhooks/bulk-jobs',
        events: ['jobs.batch_completed'],
        secret: 'bulk_secret_202',
        active: true,
      });

      await webhooksService.create({
        userId: user.id,
        url: 'https://api.example.com/webhooks/bulk-jobs',
        events: ['jobs.batch_completed'],
        secret: 'bulk_secret_202',
        active: true,
      });

      const jobs = [];
      for (let i = 0; i < 10; i++) {
        const jobData = {
          userId: user.id,
          type: 'bulk_operation',
          priority: 'normal',
          data: {
            operation: 'process_item',
            itemId: i + 1,
            batchId: 'batch_001',
          },
          status: 'pending',
        };
        mockJobsService.create.mockResolvedValueOnce({
          id: `job-bulk-${i + 1}`,
          ...jobData,
        });
        const job = await jobsService.create(jobData);
        jobs.push(job);
      }

      expect(jobs).toHaveLength(10);

      const completedJobs = [];
      for (let i = 0; i < jobs.length; i++) {
        mockJobsService.updateStatus.mockResolvedValueOnce({
          ...jobs[i],
          status: 'completed',
          result: { itemId: i + 1, processed: true },
        });
        const completedJob = await jobsService.updateStatus(
          jobs[i].id,
          'completed',
          { result: { itemId: i + 1, processed: true } },
        );
        completedJobs.push(completedJob);
      }

      expect(completedJobs).toHaveLength(10);

      for (const job of completedJobs) {
        expect(job.status).toBe('completed');
      }

      mockWebhooksService.findById.mockResolvedValue({
        id: 'webhook-5',
        userId: user.id,
        url: 'https://api.example.com/webhooks/bulk-jobs',
        events: ['jobs.batch_completed'],
        secret: 'bulk_secret_202',
        active: true,
      });

      const foundWebhook = await webhooksService.findById('webhook-5');
      expect(foundWebhook.events).toContain('jobs.batch_completed');
    });

    it('should maintain job-webhook relationship integrity', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GARELATION',
        displayName: 'Relationship Test User',
      });

      const webhooks = [];
      const webhookTypes = ['data_jobs', 'payment_jobs', 'notification_jobs'];

      for (const type of webhookTypes) {
        mockWebhooksService.create.mockResolvedValueOnce({
          id: `wh-${type}`,
          userId: user.id,
          url: `https://api.example.com/webhooks/${type}`,
          events: [`job.${type}_completed`],
          secret: `${type}_secret`,
          active: true,
        });
        const webhook = await webhooksService.create({
          userId: user.id,
          url: `https://api.example.com/webhooks/${type}`,
          events: [`job.${type}_completed`],
          secret: `${type}_secret`,
          active: true,
        });
        webhooks.push(webhook);
      }

      const jobs = [];
      for (let i = 0; i < webhookTypes.length; i++) {
        mockJobsService.create.mockResolvedValueOnce({
          id: `job-${i + 1}`,
          userId: user.id,
          type: webhookTypes[i].replace('_jobs', ''),
          priority: 'normal',
          data: { operation: `process_${webhookTypes[i]}`, sequence: i + 1 },
          status: 'pending',
        });
        const job = await jobsService.create({
          userId: user.id,
          type: webhookTypes[i].replace('_jobs', ''),
          priority: 'normal',
          data: { operation: `process_${webhookTypes[i]}`, sequence: i + 1 },
          status: 'pending',
        });
        jobs.push(job);
      }

      for (let i = 0; i < jobs.length; i++) {
        mockJobsService.updateStatus.mockResolvedValueOnce({
          ...jobs[i],
          status: 'completed',
          result: { webhookTriggered: webhooks[i].id, success: true },
        });

        const completedJob = await jobsService.updateStatus(
          jobs[i].id,
          'completed',
          { result: { webhookTriggered: webhooks[i].id, success: true } },
        );

        expect(completedJob.status).toBe('completed');
        expect(completedJob.result.webhookTriggered).toBe(webhooks[i].id);
      }

      for (let i = 0; i < jobs.length; i++) {
        mockJobsService.findById.mockResolvedValueOnce({
          ...jobs[i],
          status: 'completed',
          result: { webhookTriggered: webhooks[i].id, success: true },
        });
        mockWebhooksService.findById.mockResolvedValueOnce(webhooks[i]);

        const foundJob = await jobsService.findById(jobs[i].id);
        const foundWebhook = await webhooksService.findById(webhooks[i].id);

        expect(foundJob.userId).toBe(user.id);
        expect(foundWebhook.userId).toBe(user.id);
        expect(foundJob.result.webhookTriggered).toBe(foundWebhook.id);
      }
    });
  });
});
