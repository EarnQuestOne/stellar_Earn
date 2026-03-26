import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EmailController } from '../../src/modules/email/email.controller';
import { EmailService } from '../../src/modules/email/email.service';
import { EmailStatus, SendEmailDto } from '../../src/modules/email/dto/email.dto';

describe('EmailController', () => {
  let controller: EmailController;
  let emailService: Partial<EmailService>;

  beforeEach(async () => {
    emailService = {
      queueEmail: jest.fn().mockResolvedValue({
        messageId: 'se_123_abc',
        status: EmailStatus.QUEUED,
      }),
      getDeliveryStatus: jest.fn(),
      getDeliveryStats: jest.fn().mockReturnValue({
        total: 10,
        byStatus: { queued: 5, sent: 3, delivered: 2 },
        bounceRate: 0,
        deliveryRate: 40,
      }),
      getAllDeliveryStatuses: jest.fn().mockReturnValue([]),
      handleWebhookEvent: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      processUnsubscribeToken: jest.fn(),
      removeFromUnsubscribeList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [{ provide: EmailService, useValue: emailService }],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  describe('sendEmail', () => {
    it('should queue email and return success response', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        text: 'Hello',
      };

      const result = await controller.sendEmail(dto);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('se_123_abc');
      expect(result.status).toBe(EmailStatus.QUEUED);
      expect(emailService.queueEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for a valid message ID', () => {
      (emailService.getDeliveryStatus as jest.Mock).mockReturnValue({
        messageId: 'se_123',
        status: EmailStatus.SENT,
        to: 'user@example.com',
        timestamp: new Date(),
      });

      const result = controller.getDeliveryStatus('se_123');

      expect(result.messageId).toBe('se_123');
      expect(result.status).toBe(EmailStatus.SENT);
    });

    it('should throw BadRequestException for unknown message ID', () => {
      (emailService.getDeliveryStatus as jest.Mock).mockReturnValue(undefined);

      expect(() => controller.getDeliveryStatus('unknown')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', () => {
      const result = controller.getDeliveryStats();

      expect(result.total).toBe(10);
      expect(result.deliveryRate).toBe(40);
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return delivery history with default limit', () => {
      controller.getDeliveryHistory();

      expect(emailService.getAllDeliveryStatuses).toHaveBeenCalledWith(100);
    });

    it('should parse and pass limit parameter', () => {
      controller.getDeliveryHistory('50');

      expect(emailService.getAllDeliveryStatuses).toHaveBeenCalledWith(50);
    });
  });

  describe('handleSendGridWebhook', () => {
    it('should process webhook events', () => {
      const events = [
        { event: 'delivered', email: 'user@example.com' },
      ];

      const result = controller.handleSendGridWebhook(events);

      expect(result).toEqual({ received: true });
      expect(emailService.handleWebhookEvent).toHaveBeenCalledWith(events);
    });

    it('should verify signature when provided', () => {
      const events = [{ event: 'delivered', email: 'user@example.com' }];

      controller.handleSendGridWebhook(
        events,
        'valid-signature',
        '1234567890',
      );

      expect(emailService.verifyWebhookSignature).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid signature', () => {
      (emailService.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const events = [{ event: 'delivered', email: 'user@example.com' }];

      expect(() =>
        controller.handleSendGridWebhook(events, 'bad-sig', '123'),
      ).toThrow(UnauthorizedException);
    });

    it('should skip verification when no signature headers present', () => {
      const events = [{ event: 'delivered', email: 'user@example.com' }];

      const result = controller.handleSendGridWebhook(events);

      expect(result).toEqual({ received: true });
      expect(emailService.verifyWebhookSignature).not.toHaveBeenCalled();
    });
  });

  describe('processUnsubscribe (GET)', () => {
    it('should process valid unsubscribe token', () => {
      (emailService.processUnsubscribeToken as jest.Mock).mockReturnValue({
        success: true,
        email: 'user@example.com',
      });

      const result = controller.processUnsubscribe('valid-token');

      expect(result.success).toBe(true);
      expect(result.message).toContain('unsubscribed');
    });

    it('should throw BadRequestException for missing token', () => {
      expect(() => controller.processUnsubscribe('')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid token', () => {
      (emailService.processUnsubscribeToken as jest.Mock).mockReturnValue({
        success: false,
      });

      expect(() => controller.processUnsubscribe('bad-token')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('unsubscribe (POST)', () => {
    it('should process valid unsubscribe request', () => {
      (emailService.processUnsubscribeToken as jest.Mock).mockReturnValue({
        success: true,
        email: 'user@example.com',
      });

      const result = controller.unsubscribe({ token: 'valid-token' });

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for invalid token', () => {
      (emailService.processUnsubscribeToken as jest.Mock).mockReturnValue({
        success: false,
      });

      expect(() => controller.unsubscribe({ token: 'bad' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('resubscribe', () => {
    it('should resubscribe a valid email', () => {
      (emailService.removeFromUnsubscribeList as jest.Mock).mockReturnValue(true);

      const result = controller.resubscribe('user@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('resubscribed');
    });

    it('should indicate when email was not on unsubscribe list', () => {
      (emailService.removeFromUnsubscribeList as jest.Mock).mockReturnValue(false);

      const result = controller.resubscribe('unknown@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not on the unsubscribe list');
    });

    it('should throw BadRequestException when email is missing', () => {
      expect(() => controller.resubscribe('')).toThrow(BadRequestException);
    });
  });
});
