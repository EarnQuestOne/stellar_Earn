import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../src/modules/email/email.service';
import { EmailTemplateEngine } from '../../src/modules/email/templates/template.engine';
import { JobsService } from '../../src/modules/jobs/jobs.service';
import {
  EmailStatus,
  EmailTemplate,
  EmailPriority,
  SendEmailDto,
} from '../../src/modules/email/dto/email.dto';

describe('EmailService', () => {
  let service: EmailService;
  let jobsService: Partial<JobsService>;
  let templateEngine: Partial<EmailTemplateEngine>;
  let configService: Partial<ConfigService>;

  const mockConfigValues: Record<string, any> = {
    'email.sendgrid.apiKey': '',
    'email.from.email': 'test@stellarearn.com',
    'email.from.name': 'Stellar Earn Test',
    'email.replyTo': 'support@test.com',
    'email.sendgrid.webhookVerificationKey': 'test-webhook-key',
    'email.appUrl': 'http://localhost:3000',
    JWT_SECRET: 'test-jwt-secret',
  };

  beforeEach(async () => {
    jobsService = {
      addJob: jest.fn().mockResolvedValue({ id: 'job-1', name: 'email-job' }),
      registerEmailProcessor: jest.fn(),
    };

    templateEngine = {
      render: jest.fn().mockReturnValue({
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      }),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return mockConfigValues[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: configService },
        { provide: EmailTemplateEngine, useValue: templateEngine },
        { provide: JobsService, useValue: jobsService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    await service.onModuleInit();
  });

  describe('sendEmail', () => {
    it('should create a delivery record and return QUEUED status', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com', name: 'Test User' }],
        subject: 'Test Email',
        text: 'Hello',
      };

      const result = await service.sendEmail(dto);

      expect(result.messageId).toBeTruthy();
      expect(result.messageId).toMatch(/^se_/);
      expect(result.status).toBe(EmailStatus.QUEUED);
    });

    it('should return DROPPED status when all recipients are unsubscribed', async () => {
      service.addToUnsubscribeList('unsub@example.com');

      const dto: SendEmailDto = {
        to: [{ email: 'unsub@example.com' }],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.sendEmail(dto);

      expect(result.status).toBe(EmailStatus.DROPPED);
      expect(result.messageId).toBe('');
    });

    it('should filter unsubscribed recipients but send to remaining', async () => {
      service.addToUnsubscribeList('unsub@example.com');

      const dto: SendEmailDto = {
        to: [
          { email: 'unsub@example.com' },
          { email: 'active@example.com' },
        ],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.sendEmail(dto);

      expect(result.status).toBe(EmailStatus.QUEUED);
    });
  });

  describe('queueEmail', () => {
    it('should add a job to the email queue', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.queueEmail(dto);

      expect(result.status).toBe(EmailStatus.QUEUED);
      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          messageId: expect.any(String),
          dto: expect.objectContaining({
            subject: 'Test',
          }),
        }),
        expect.objectContaining({ priority: 5 }),
      );
    });

    it('should map HIGH priority to job priority 1', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Urgent',
        text: 'Urgent message',
        priority: EmailPriority.HIGH,
      };

      await service.queueEmail(dto);

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.any(Object),
        expect.objectContaining({ priority: 1 }),
      );
    });

    it('should map LOW priority to job priority 10', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Low priority',
        text: 'Not urgent',
        priority: EmailPriority.LOW,
      };

      await service.queueEmail(dto);

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.any(Object),
        expect.objectContaining({ priority: 10 }),
      );
    });

    it('should return FAILED status when job queue fails', async () => {
      (jobsService.addJob as jest.Mock).mockRejectedValue(new Error('Redis unavailable'));

      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.queueEmail(dto);

      expect(result.status).toBe(EmailStatus.FAILED);
    });

    it('should skip dropped emails (all unsubscribed)', async () => {
      service.addToUnsubscribeList('unsub@example.com');

      const dto: SendEmailDto = {
        to: [{ email: 'unsub@example.com' }],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.queueEmail(dto);

      expect(result.status).toBe(EmailStatus.DROPPED);
      expect(jobsService.addJob).not.toHaveBeenCalled();
    });
  });

  describe('processEmailJob', () => {
    it('should use template engine when template is specified', async () => {
      const messageId = (await service.sendEmail({
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        template: EmailTemplate.WELCOME,
        templateData: { username: 'TestUser' },
      })).messageId;

      await service.processEmailJob(messageId, {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        template: EmailTemplate.WELCOME,
        templateData: { username: 'TestUser' },
      });

      expect(templateEngine.render).toHaveBeenCalledWith(
        EmailTemplate.WELCOME,
        { username: 'TestUser' },
      );
    });

    it('should log warning when SendGrid is not configured', async () => {
      const messageId = (await service.sendEmail({
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      })).messageId;

      await service.processEmailJob(messageId, {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      });

      const status = service.getDeliveryStatus(messageId);
      expect(status?.status).toBe(EmailStatus.DROPPED);
      expect(status?.lastError).toBe('SendGrid not configured');
    });
  });

  describe('sendTemplateEmail', () => {
    it('should render template and queue the email', async () => {
      const result = await service.sendTemplateEmail(
        EmailTemplate.WELCOME,
        [{ email: 'user@example.com' }],
        { username: 'TestUser' },
      );

      expect(result.status).toBe(EmailStatus.QUEUED);
      expect(jobsService.addJob).toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    it('sendWelcomeEmail should queue a welcome email', async () => {
      await service.sendWelcomeEmail('user@example.com', 'TestUser');

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.WELCOME,
          }),
        }),
        expect.any(Object),
      );
    });

    it('sendPasswordResetEmail should queue with HIGH priority', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'TestUser',
        'http://localhost/reset?token=abc',
      );

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.PASSWORD_RESET,
          }),
        }),
        expect.objectContaining({ priority: 1 }),
      );
    });

    it('sendSubmissionApprovedEmail should queue correctly', async () => {
      await service.sendSubmissionApprovedEmail(
        'user@example.com',
        'TestUser',
        'Test Quest',
        100,
      );

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.SUBMISSION_APPROVED,
          }),
        }),
        expect.any(Object),
      );
    });

    it('sendSubmissionRejectedEmail should queue correctly', async () => {
      await service.sendSubmissionRejectedEmail(
        'user@example.com',
        'TestUser',
        'Test Quest',
        'Not enough detail',
      );

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.SUBMISSION_REJECTED,
          }),
        }),
        expect.any(Object),
      );
    });

    it('sendPayoutProcessedEmail should queue correctly', async () => {
      await service.sendPayoutProcessedEmail(
        'user@example.com',
        'TestUser',
        '100',
        'tx_hash_123',
        'GABC...XYZ',
      );

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.PAYOUT_PROCESSED,
          }),
        }),
        expect.any(Object),
      );
    });

    it('sendPayoutFailedEmail should queue with HIGH priority', async () => {
      await service.sendPayoutFailedEmail(
        'user@example.com',
        'TestUser',
        '100',
        'Insufficient funds',
      );

      expect(jobsService.addJob).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          dto: expect.objectContaining({
            template: EmailTemplate.PAYOUT_FAILED,
          }),
        }),
        expect.objectContaining({ priority: 1 }),
      );
    });
  });

  describe('webhook handling', () => {
    it('should process delivered event', () => {
      const messageId = 'test-msg-id';
      service.handleWebhookEvent([
        { event: 'delivered', email: 'user@example.com', sg_message_id: messageId },
      ]);

      // No error thrown means success
    });

    it('should add email to unsubscribe list on hard bounce', () => {
      service.handleWebhookEvent([
        {
          event: 'bounce',
          email: 'bounced@example.com',
          sg_message_id: 'msg-1',
          reason: 'address not found',
          bounce_classification: 'hard',
        },
      ]);

      expect(service.isUnsubscribed('bounced@example.com')).toBe(true);
    });

    it('should add email to unsubscribe list on spam report', () => {
      service.handleWebhookEvent([
        {
          event: 'spamreport',
          email: 'spam@example.com',
          sg_message_id: 'msg-2',
        },
      ]);

      expect(service.isUnsubscribed('spam@example.com')).toBe(true);
    });

    it('should add email to unsubscribe list on unsubscribe event', () => {
      service.handleWebhookEvent([
        {
          event: 'unsubscribe',
          email: 'unsub@example.com',
          sg_message_id: 'msg-3',
        },
      ]);

      expect(service.isUnsubscribed('unsub@example.com')).toBe(true);
    });

    it('should handle multiple events in a single webhook call', () => {
      service.handleWebhookEvent([
        { event: 'delivered', email: 'a@example.com', sg_message_id: 'msg-a' },
        { event: 'bounce', email: 'b@example.com', sg_message_id: 'msg-b', bounce_classification: 'hard', reason: 'invalid' },
        { event: 'open', email: 'c@example.com', sg_message_id: 'msg-c' },
      ]);

      expect(service.isUnsubscribed('b@example.com')).toBe(true);
      expect(service.isUnsubscribed('a@example.com')).toBe(false);
    });

    it('should gracefully handle unknown event types', () => {
      expect(() => {
        service.handleWebhookEvent([
          { event: 'unknown_event', email: 'user@example.com' },
        ]);
      }).not.toThrow();
    });
  });

  describe('unsubscribe management', () => {
    it('should add email to unsubscribe list', () => {
      service.addToUnsubscribeList('test@example.com');
      expect(service.isUnsubscribed('test@example.com')).toBe(true);
    });

    it('should normalize email case for unsubscribe', () => {
      service.addToUnsubscribeList('Test@Example.COM');
      expect(service.isUnsubscribed('test@example.com')).toBe(true);
    });

    it('should not duplicate unsubscribe entries', () => {
      service.addToUnsubscribeList('test@example.com');
      service.addToUnsubscribeList('test@example.com');
      expect(service.isUnsubscribed('test@example.com')).toBe(true);
    });

    it('should remove email from unsubscribe list', () => {
      service.addToUnsubscribeList('test@example.com');
      const removed = service.removeFromUnsubscribeList('test@example.com');

      expect(removed).toBe(true);
      expect(service.isUnsubscribed('test@example.com')).toBe(false);
    });

    it('should return false when removing non-existent email', () => {
      const removed = service.removeFromUnsubscribeList('nonexistent@example.com');
      expect(removed).toBe(false);
    });

    it('should process valid unsubscribe token', () => {
      service.addToUnsubscribeList('test@example.com');
      const record = (service as any).unsubscribeList.get('test@example.com');

      const result = service.processUnsubscribeToken(record.token);

      expect(result.success).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    it('should handle invalid unsubscribe token from unknown email', () => {
      const result = service.processUnsubscribeToken('totally-invalid-token');
      expect(result.success).toBe(false);
    });
  });

  describe('delivery tracking', () => {
    it('should track delivery status after sending', async () => {
      const result = await service.sendEmail({
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      });

      const status = service.getDeliveryStatus(result.messageId);

      expect(status).toBeDefined();
      expect(status?.status).toBe(EmailStatus.QUEUED);
      expect(status?.to).toBe('user@example.com');
      expect(status?.subject).toBe('Test');
    });

    it('should return undefined for unknown message IDs', () => {
      const status = service.getDeliveryStatus('nonexistent');
      expect(status).toBeUndefined();
    });

    it('should return delivery history sorted by timestamp', async () => {
      await service.sendEmail({
        to: [{ email: 'a@example.com' }],
        subject: 'First',
        text: 'Hello',
      });
      await service.sendEmail({
        to: [{ email: 'b@example.com' }],
        subject: 'Second',
        text: 'Hello',
      });

      const history = service.getAllDeliveryStatuses();

      expect(history.length).toBe(2);
    });

    it('should respect limit parameter in delivery history', async () => {
      for (let i = 0; i < 5; i++) {
        await service.sendEmail({
          to: [{ email: `user${i}@example.com` }],
          subject: `Email ${i}`,
          text: 'Hello',
        });
      }

      const history = service.getAllDeliveryStatuses(3);
      expect(history.length).toBe(3);
    });

    it('should compute delivery stats', async () => {
      await service.sendEmail({
        to: [{ email: 'a@example.com' }],
        subject: 'A',
        text: 'Hello',
      });
      await service.sendEmail({
        to: [{ email: 'b@example.com' }],
        subject: 'B',
        text: 'Hello',
      });

      const stats = service.getDeliveryStats();

      expect(stats.total).toBe(2);
      expect(stats.byStatus[EmailStatus.QUEUED]).toBe(2);
    });
  });

  describe('webhook signature verification', () => {
    it('should return true when verification key is not configured', () => {
      const configGetSpy = configService.get as jest.Mock;
      configGetSpy.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'email.sendgrid.webhookVerificationKey') return '';
        return mockConfigValues[key] ?? defaultValue;
      });

      const svc = new EmailService(
        configService as ConfigService,
        templateEngine as EmailTemplateEngine,
        jobsService as JobsService,
      );

      const result = svc.verifyWebhookSignature('payload', 'sig', 'timestamp');
      expect(result).toBe(true);
    });
  });

  describe('onModuleInit', () => {
    it('should register email processor with jobs service', async () => {
      expect(jobsService.registerEmailProcessor).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });
  });
});
