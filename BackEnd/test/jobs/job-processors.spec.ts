import { Test, TestingModule } from '@nestjs/testing';
import { PayoutProcessor } from '../processors/payout.processor';
import { EmailProcessor } from '../processors/email.processor';
import { DataExportProcessor } from '../processors/export.processor';
import { CleanupProcessor } from '../processors/cleanup.processor';
import { WebhookProcessor } from '../processors/webhook.processor';
import { AnalyticsProcessor } from '../processors/analytics.processor';
import { QuestProcessor } from '../processors/quest.processor';
import { JobLogService } from '../services/job-log.service';
import { PayoutProcessPayload, EmailSendPayload, JobStatus } from '../job.types';
import { Job } from 'bullmq';

describe('Job Processors', () => {
  let module: TestingModule;
  let jobLogService: JobLogService;
  let payoutProcessor: PayoutProcessor;
  let emailProcessor: EmailProcessor;
  let exportProcessor: DataExportProcessor;
  let cleanupProcessor: CleanupProcessor;
  let webhookProcessor: WebhookProcessor;
  let analyticsProcessor: AnalyticsProcessor;
  let questProcessor: QuestProcessor;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: JobLogService,
          useValue: {
            createJobLog: jest.fn(),
            updateJobLog: jest.fn(),
            updateJobProgress: jest.fn(),
            recordJobStart: jest.fn(),
            recordJobCompletion: jest.fn(),
            recordJobFailure: jest.fn(),
          },
        },
        PayoutProcessor,
        EmailProcessor,
        DataExportProcessor,
        CleanupProcessor,
        WebhookProcessor,
        AnalyticsProcessor,
        QuestProcessor,
      ],
    }).compile();

    jobLogService = module.get<JobLogService>(JobLogService);
    payoutProcessor = module.get<PayoutProcessor>(PayoutProcessor);
    emailProcessor = module.get<EmailProcessor>(EmailProcessor);
    exportProcessor = module.get<DataExportProcessor>(DataExportProcessor);
    cleanupProcessor = module.get<CleanupProcessor>(CleanupProcessor);
    webhookProcessor = module.get<WebhookProcessor>(WebhookProcessor);
    analyticsProcessor = module.get<AnalyticsProcessor>(AnalyticsProcessor);
    questProcessor = module.get<QuestProcessor>(QuestProcessor);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('PayoutProcessor', () => {
    it('should process valid payout successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          payoutId: 'payout-123',
          organizationId: 'org-456',
          amount: 100,
          recipientAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYXM4ZCT5JBHNYX7UHZASDEFDZDCXACHL',
        } as PayoutProcessPayload,
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<PayoutProcessPayload>;

      const result = await payoutProcessor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('transactionHash');
      expect(result.data.amount).toBe(100);
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should reject invalid payout amount', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          payoutId: 'payout-123',
          organizationId: 'org-456',
          amount: -100,
          recipientAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYXM4ZCT5JBHNYX7UHZASDEFDZDCXACHL',
        } as PayoutProcessPayload,
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<PayoutProcessPayload>;

      await expect(payoutProcessor.process(mockJob)).rejects.toThrow(
        'Payout amount must be greater than zero',
      );
    });

    it('should reject invalid Stellar address', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          payoutId: 'payout-123',
          organizationId: 'org-456',
          amount: 100,
          recipientAddress: 'INVALID',
        } as PayoutProcessPayload,
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<PayoutProcessPayload>;

      await expect(payoutProcessor.process(mockJob)).rejects.toThrow(
        'Invalid Stellar recipient address',
      );
    });
  });

  describe('EmailProcessor', () => {
    it('should send email successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          messageId: 'msg-123',
          recipientEmail: 'user@example.com',
          templateId: 'template-456',
          variables: { name: 'John' },
        } as EmailSendPayload,
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<EmailSendPayload>;

      const result = await emailProcessor.processSingle(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sentAt');
      expect(result.data.recipientEmail).toBe('user@example.com');
    });

    it('should reject invalid email address', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          messageId: 'msg-123',
          recipientEmail: 'invalid-email',
          templateId: 'template-456',
        } as EmailSendPayload,
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<EmailSendPayload>;

      await expect(emailProcessor.processSingle(mockJob)).rejects.toThrow(
        'Invalid email address',
      );
    });

    it('should process email digest with multiple recipients', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          organizationId: 'org-123',
          digestType: 'daily',
          recipientEmails: [
            'user1@example.com',
            'user2@example.com',
            'user3@example.com',
          ],
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await emailProcessor.processDigest(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.recipientsCount).toBe(3);
    });
  });

  describe('DataExportProcessor', () => {
    it('should export data successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          organizationId: 'org-123',
          exportType: 'users',
          format: 'csv',
          userId: 'user-456',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await exportProcessor.processExport(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('fileName');
      expect(result.data).toHaveProperty('downloadUrl');
      expect(result.data.fileName).toContain('users');
    });

    it('should reject invalid export format', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          organizationId: 'org-123',
          exportType: 'users',
          format: 'invalid',
          userId: 'user-456',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      await expect(exportProcessor.processExport(mockJob)).rejects.toThrow(
        'Invalid export format',
      );
    });
  });

  describe('CleanupProcessor', () => {
    it('should clean expired sessions successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          olderThanDays: 30,
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await cleanupProcessor.cleanExpiredSessions(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('deletedSessionsCount');
      expect(result.data.deletedSessionsCount).toBeGreaterThan(0);
    });

    it('should clean old logs successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          olderThanDays: 90,
          logTypes: ['error', 'warn'],
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await cleanupProcessor.cleanOldLogs(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('deletedLogsCount');
    });
  });

  describe('WebhookProcessor', () => {
    it('should deliver webhook successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          webhookId: 'webhook-123',
          event: 'payout.completed',
          payload: { id: 'payout-456', amount: 100 },
          url: 'https://example.com/webhook',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await webhookProcessor.processDelivery(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('deliveredAt');
    });

    it('should reject invalid webhook URL', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          webhookId: 'webhook-123',
          event: 'payout.completed',
          payload: { id: 'payout-456' },
          url: 'not-a-valid-url',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      await expect(webhookProcessor.processDelivery(mockJob)).rejects.toThrow(
        'Invalid webhook URL',
      );
    });
  });

  describe('AnalyticsProcessor', () => {
    it('should aggregate analytics successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          organizationId: 'org-123',
          aggregationType: 'daily',
          metricsType: ['response_time', 'error_rate'],
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await analyticsProcessor.processAggregation(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('aggregatedMetrics');
    });

    it('should collect metrics successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          metricsToCollect: ['cpu_usage', 'memory_usage'],
          timeWindow: 'last_hour',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await analyticsProcessor.collectMetrics(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.metricsCount).toBe(2);
    });
  });

  describe('QuestProcessor', () => {
    it('should check quest deadlines successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          questId: 'quest-123',
          organizationId: 'org-456',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await questProcessor.checkDeadlines(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('participantCount');
      expect(result.data).toHaveProperty('submissionCount');
    });

    it('should verify quest completion successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          questId: 'quest-123',
          userId: 'user-456',
          submissionId: 'submission-789',
        },
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any;

      const result = await questProcessor.verifyCompletion(mockJob);

      // Result can be success or failure with rejection reason
      expect(result.data).toHaveProperty('verificationStatus');
      expect(['APPROVED', 'REJECTED']).toContain(result.data.verificationStatus);
    });
  });

  describe('Job Processors - Error Handling', () => {
    it('should handle missing required fields', async () => {
      const mockJob = {
        id: 'job-1',
        data: {},
        updateProgress: jest.fn(),
        timestamp: Date.now(),
      } as any as Job<PayoutProcessPayload>;

      await expect(payoutProcessor.process(mockJob)).rejects.toThrow(
        'Missing required',
      );
    });
  });
});
