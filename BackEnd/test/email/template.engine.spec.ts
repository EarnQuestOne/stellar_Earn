import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateEngine } from '../../src/modules/email/templates/template.engine';
import { EmailTemplate } from '../../src/modules/email/dto/email.dto';

describe('EmailTemplateEngine', () => {
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

  describe('render', () => {
    it('should render welcome template with username', () => {
      const result = engine.render(EmailTemplate.WELCOME, { username: 'Alice' });

      expect(result.subject).toContain('Welcome');
      expect(result.html).toContain('Alice');
      expect(result.html).toContain('Stellar Earn');
      expect(result.text).toContain('Alice');
      expect(result.text).toContain('Welcome');
    });

    it('should render password reset template with reset link', () => {
      const result = engine.render(EmailTemplate.PASSWORD_RESET, {
        username: 'Bob',
        resetLink: 'http://localhost/reset?token=xyz',
        expiresIn: '2 hours',
      });

      expect(result.subject).toContain('Password Reset');
      expect(result.html).toContain('http://localhost/reset?token=xyz');
      expect(result.html).toContain('2 hours');
      expect(result.text).toContain('http://localhost/reset?token=xyz');
    });

    it('should render quest completed template', () => {
      const result = engine.render(EmailTemplate.QUEST_COMPLETED, {
        username: 'Charlie',
        questTitle: 'Stellar Basics',
        xpEarned: 50,
      });

      expect(result.subject).toContain('Stellar Basics');
      expect(result.html).toContain('Charlie');
      expect(result.html).toContain('50 XP');
      expect(result.text).toContain('50 XP');
    });

    it('should render submission approved template', () => {
      const result = engine.render(EmailTemplate.SUBMISSION_APPROVED, {
        username: 'Dave',
        questTitle: 'DeFi Challenge',
        rewardAmount: 200,
      });

      expect(result.subject).toContain('Approved');
      expect(result.html).toContain('Dave');
      expect(result.html).toContain('200 tokens');
    });

    it('should render submission rejected template', () => {
      const result = engine.render(EmailTemplate.SUBMISSION_REJECTED, {
        username: 'Eve',
        questTitle: 'NFT Challenge',
        reason: 'Incomplete submission',
      });

      expect(result.subject).toContain('NFT Challenge');
      expect(result.html).toContain('Eve');
      expect(result.html).toContain('Incomplete submission');
    });

    it('should render payout processed template', () => {
      const result = engine.render(EmailTemplate.PAYOUT_PROCESSED, {
        username: 'Frank',
        amount: '500',
        transactionHash: 'abc123hash',
        stellarAddress: 'GABC...XYZ',
      });

      expect(result.subject).toContain('500 tokens');
      expect(result.html).toContain('Frank');
      expect(result.html).toContain('abc123hash');
      expect(result.html).toContain('GABC...XYZ');
    });

    it('should render payout failed template', () => {
      const result = engine.render(EmailTemplate.PAYOUT_FAILED, {
        username: 'Grace',
        amount: '100',
        reason: 'Network congestion',
      });

      expect(result.subject).toContain('Payout Issue');
      expect(result.html).toContain('Grace');
      expect(result.html).toContain('Network congestion');
    });

    it('should render account update template', () => {
      const result = engine.render(EmailTemplate.ACCOUNT_UPDATE, {
        username: 'Heidi',
        updateType: 'Email Changed',
        details: 'Your email address has been updated.',
      });

      expect(result.subject).toContain('Email Changed');
      expect(result.html).toContain('Heidi');
      expect(result.html).toContain('email address has been updated');
    });

    it('should render general notification template', () => {
      const result = engine.render(EmailTemplate.GENERAL_NOTIFICATION, {
        username: 'Ivan',
        title: 'Platform Update',
        message: 'We have exciting new features!',
        ctaText: 'Check it out',
        ctaUrl: 'http://localhost:3000/updates',
      });

      expect(result.subject).toBe('Platform Update');
      expect(result.html).toContain('Ivan');
      expect(result.html).toContain('exciting new features');
      expect(result.html).toContain('Check it out');
    });
  });

  describe('HTML output', () => {
    it('should include proper HTML structure', () => {
      const result = engine.render(EmailTemplate.WELCOME, { username: 'Test' });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('charset="UTF-8"');
      expect(result.html).toContain('viewport');
    });

    it('should include app name in header', () => {
      const result = engine.render(EmailTemplate.WELCOME, { username: 'Test' });

      expect(result.html).toContain('Stellar Earn');
    });

    it('should include footer with copyright', () => {
      const result = engine.render(EmailTemplate.WELCOME, { username: 'Test' });
      const currentYear = new Date().getFullYear().toString();

      expect(result.html).toContain(currentYear);
      expect(result.html).toContain('All rights reserved');
    });

    it('should include unsubscribe link when token is provided', () => {
      const result = engine.render(EmailTemplate.WELCOME, {
        username: 'Test',
        unsubscribeToken: 'abc123',
      });

      expect(result.html).toContain('unsubscribe');
      expect(result.html).toContain('abc123');
    });
  });

  describe('plain text output', () => {
    it('should produce plain text without HTML tags', () => {
      const result = engine.render(EmailTemplate.WELCOME, { username: 'Test' });

      expect(result.text).not.toContain('<');
      expect(result.text).not.toContain('>');
    });

    it('should include relevant content in plain text', () => {
      const result = engine.render(EmailTemplate.PAYOUT_PROCESSED, {
        username: 'User',
        amount: '100',
        transactionHash: 'hash123',
        stellarAddress: 'GADDR',
      });

      expect(result.text).toContain('100 tokens');
      expect(result.text).toContain('hash123');
    });
  });

  describe('XSS prevention', () => {
    it('should escape HTML characters in user-provided data', () => {
      const result = engine.render(EmailTemplate.WELCOME, {
        username: '<script>alert("xss")</script>',
      });

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should escape quotes in user-provided data', () => {
      const result = engine.render(EmailTemplate.SUBMISSION_REJECTED, {
        username: 'Test',
        questTitle: 'Quest "with" quotes',
        reason: "It's <not> valid",
      });

      expect(result.html).not.toContain('"with"');
      expect(result.html).toContain('&quot;with&quot;');
    });
  });

  describe('fallback handling', () => {
    it('should handle missing optional template data gracefully', () => {
      const result = engine.render(EmailTemplate.QUEST_COMPLETED, {
        username: 'Test',
        questTitle: 'My Quest',
      });

      expect(result.html).toContain('Test');
      expect(result.html).toContain('My Quest');
    });

    it('should use "there" as default when username is missing', () => {
      const result = engine.render(EmailTemplate.WELCOME, {});

      expect(result.html).toContain('there');
      expect(result.text).toContain('there');
    });
  });
});
