import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateEngine } from '#src/modules/email/templates/template.engine';
import { renderQuestUpdateTemplate } from '#src/modules/notifications/template/quest-update.template';
import { renderSubmissionStatusTemplate } from '#src/modules/notifications/template/submission-status.template';
import { renderSystemAnnouncementTemplate } from '#src/modules/notifications/template/system.template';
import {
  type QuestUpdateTemplateData,
  type SubmissionApprovedTemplateData,
  type SubmissionRejectedTemplateData,
  type SystemAnnouncementTemplateData,
} from '#src/modules/notifications/template/notification.interface';

describe('Notification templates (typed + engine rendering)', () => {
  let engine: EmailTemplateEngine;

  beforeEach(async () => {
    const configService: Partial<ConfigService> = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          'email.appUrl': 'http://localhost:3000',
          'email.from.name': 'Stellar Earn',
        };
        return values[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateEngine,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    engine = module.get<EmailTemplateEngine>(EmailTemplateEngine);
  });

  describe('quest update template', () => {
    it('renders approved quest update html/text with correct substitution', () => {
      const data: QuestUpdateTemplateData = {
        username: 'Alice',
        questTitle: 'Stellar Basics',
        status: 'approved',
      };

      const result = renderQuestUpdateTemplate(engine, data);

      expect(result.subject).toContain('Quest approved');
      expect(result.html).toContain('Alice');
      expect(result.html).toContain('Stellar Basics');
      expect(result.html).toContain('approved');
      expect(result.text).toContain('Alice');
      expect(result.text).toContain('Stellar Basics');
    });

    it('throws when questTitle is missing', () => {
      const data: any = {
        username: 'Alice',
        status: 'approved',
      };

      expect(() => renderQuestUpdateTemplate(engine, data)).toThrow(
        'Missing required field: questTitle',
      );
    });
  });

  describe('submission status template', () => {
    it('renders approved submission html/text with correct substitution', () => {
      const approved: SubmissionApprovedTemplateData = {
        username: 'Dave',
        questTitle: 'DeFi Challenge',
        rewardAmount: 200,
      };

      const data = {
        status: 'approved' as const,
        data: approved,
      };

      const result = renderSubmissionStatusTemplate(engine, data);

      expect(result.subject).toContain('DeFi Challenge');
      expect(result.html).toContain('Dave');
      expect(result.html).toContain('200');
      expect(result.text).toContain('200');
    });

    it('renders rejected submission html/text with correct substitution', () => {
      const rejected: SubmissionRejectedTemplateData = {
        username: 'Eve',
        questTitle: 'NFT Challenge',
        reason: 'Incomplete submission',
      };

      const data = {
        status: 'rejected' as const,
        data: rejected,
      };

      const result = renderSubmissionStatusTemplate(engine, data);

      expect(result.subject).toContain('NFT Challenge');
      expect(result.html).toContain('Eve');
      expect(result.html).toContain('Incomplete submission');
      expect(result.text).toContain('Incomplete submission');
    });

    it('throws when rejected reason is missing', () => {
      const rejected: any = {
        username: 'Eve',
        questTitle: 'NFT Challenge',
      };

      const data = {
        status: 'rejected' as const,
        data: rejected,
      };

      expect(() => renderSubmissionStatusTemplate(engine, data)).toThrow(
        'Missing required field: reason',
      );
    });
  });

  describe('system announcement template', () => {
    it('renders system announcement html/text with correct substitution', () => {
      const data: SystemAnnouncementTemplateData = {
        username: 'Ivan',
        title: 'Platform Update',
        message: 'We have exciting new features!',
        ctaText: 'Check it out',
        ctaUrl: 'http://localhost:3000/updates',
      };

      const result = renderSystemAnnouncementTemplate(engine, data);

      expect(result.subject).toBe('Platform Update');
      expect(result.html).toContain('Ivan');
      expect(result.html).toContain('exciting new features');
      expect(result.html).toContain('Check it out');
      expect(result.text).toContain('exciting new features');
    });

    it('throws when message is missing', () => {
      const data: any = {
        username: 'Ivan',
        title: 'Platform Update',
      };

      expect(() => renderSystemAnnouncementTemplate(engine, data)).toThrow(
        'Missing required field: message',
      );
    });
  });

  describe('html validity smoke test', () => {
    it('returns wrapped HTML document', () => {
      const data: QuestUpdateTemplateData = {
        username: 'Test',
        questTitle: 'Quest',
        status: 'expired',
      };

      const result = renderQuestUpdateTemplate(engine, data);
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('</html>');
    });
  });
});
