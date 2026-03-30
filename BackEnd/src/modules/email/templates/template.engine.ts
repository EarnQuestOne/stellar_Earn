import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplate } from '../dto/email.dto';

interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplateEngine {
  private readonly logger = new Logger(EmailTemplateEngine.name);
  private readonly appUrl: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.appUrl = this.configService.get<string>('email.appUrl', 'http://localhost:3000');
    this.appName = this.configService.get<string>('email.from.name', 'Stellar Earn');
  }

  render(template: EmailTemplate, data: Record<string, any>): TemplateResult {
    const renderer = this.templateMap[template];
    if (!renderer) {
      this.logger.warn(`No template found for "${template}", using fallback`);
      return this.renderFallback(data);
    }
    return renderer(data);
  }

  private get templateMap(): Record<EmailTemplate, (data: Record<string, any>) => TemplateResult> {
    return {
      [EmailTemplate.WELCOME]: (data) => this.renderWelcome(data),
      [EmailTemplate.PASSWORD_RESET]: (data) => this.renderPasswordReset(data),
      [EmailTemplate.QUEST_COMPLETED]: (data) => this.renderQuestCompleted(data),
      [EmailTemplate.SUBMISSION_APPROVED]: (data) => this.renderSubmissionApproved(data),
      [EmailTemplate.SUBMISSION_REJECTED]: (data) => this.renderSubmissionRejected(data),
      [EmailTemplate.PAYOUT_PROCESSED]: (data) => this.renderPayoutProcessed(data),
      [EmailTemplate.PAYOUT_FAILED]: (data) => this.renderPayoutFailed(data),
      [EmailTemplate.ACCOUNT_UPDATE]: (data) => this.renderAccountUpdate(data),
      [EmailTemplate.GENERAL_NOTIFICATION]: (data) => this.renderGeneralNotification(data),
    };
  }

  private renderWelcome(data: Record<string, any>): TemplateResult {
    const { username } = data;
    return {
      subject: `Welcome to ${this.appName}!`,
      html: this.wrapHtml(`
        <h1>Welcome to ${this.appName}!</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>We're excited to have you on board. Start exploring quests, completing challenges, and earning rewards on the Stellar network.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/quests" style="${this.buttonStyle()}">Explore Quests</a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `, data),
      text: `Welcome to ${this.appName}!\n\nHi ${username || 'there'},\n\nWe're excited to have you on board. Start exploring quests, completing challenges, and earning rewards on the Stellar network.\n\nExplore Quests: ${this.appUrl}/quests`,
    };
  }

  private renderPasswordReset(data: Record<string, any>): TemplateResult {
    const { username, resetLink, expiresIn } = data;
    return {
      subject: `${this.appName} - Password Reset Request`,
      html: this.wrapHtml(`
        <h1>Password Reset</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.escape(resetLink)}" style="${this.buttonStyle()}">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in ${expiresIn || '1 hour'}. If you didn't request this reset, you can safely ignore this email.</p>
      `, data),
      text: `Password Reset\n\nHi ${username || 'there'},\n\nWe received a request to reset your password. Visit the link below:\n\n${resetLink}\n\nThis link expires in ${expiresIn || '1 hour'}.`,
    };
  }

  private renderQuestCompleted(data: Record<string, any>): TemplateResult {
    const { username, questTitle, xpEarned } = data;
    return {
      subject: `Quest Completed: ${questTitle}`,
      html: this.wrapHtml(`
        <h1>Quest Completed!</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>Congratulations! You've completed the quest <strong>"${this.escape(questTitle)}"</strong>.</p>
        ${xpEarned ? `<p>You earned <strong>${xpEarned} XP</strong> for this quest.</p>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/quests" style="${this.buttonStyle()}">Find More Quests</a>
        </div>
      `, data),
      text: `Quest Completed!\n\nHi ${username || 'there'},\n\nCongratulations! You've completed "${questTitle}".${xpEarned ? ` You earned ${xpEarned} XP.` : ''}\n\nFind more quests: ${this.appUrl}/quests`,
    };
  }

  private renderSubmissionApproved(data: Record<string, any>): TemplateResult {
    const { username, questTitle, rewardAmount } = data;
    return {
      subject: `Submission Approved: ${questTitle}`,
      html: this.wrapHtml(`
        <h1>Submission Approved!</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>Your submission for <strong>"${this.escape(questTitle)}"</strong> has been approved.</p>
        ${rewardAmount ? `<p>You will receive <strong>${rewardAmount} tokens</strong> as a reward.</p>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/dashboard" style="${this.buttonStyle()}">View Dashboard</a>
        </div>
      `, data),
      text: `Submission Approved!\n\nHi ${username || 'there'},\n\nYour submission for "${questTitle}" has been approved.${rewardAmount ? ` You will receive ${rewardAmount} tokens.` : ''}\n\nView dashboard: ${this.appUrl}/dashboard`,
    };
  }

  private renderSubmissionRejected(data: Record<string, any>): TemplateResult {
    const { username, questTitle, reason } = data;
    return {
      subject: `Submission Update: ${questTitle}`,
      html: this.wrapHtml(`
        <h1>Submission Update</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>Your submission for <strong>"${this.escape(questTitle)}"</strong> was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${this.escape(reason)}</p>` : ''}
        <p>Don't worry! You can review the feedback and submit again.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/quests" style="${this.buttonStyle()}">Try Again</a>
        </div>
      `, data),
      text: `Submission Update\n\nHi ${username || 'there'},\n\nYour submission for "${questTitle}" was not approved.${reason ? ` Reason: ${reason}` : ''}\n\nYou can review the feedback and submit again at ${this.appUrl}/quests`,
    };
  }

  private renderPayoutProcessed(data: Record<string, any>): TemplateResult {
    const { username, amount, transactionHash, stellarAddress } = data;
    return {
      subject: `Payout Processed: ${amount} tokens`,
      html: this.wrapHtml(`
        <h1>Payout Processed</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>Your payout of <strong>${amount} tokens</strong> has been sent to your Stellar address.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all;">
          <p style="margin: 5px 0;"><strong>Address:</strong> ${this.escape(stellarAddress || '')}</p>
          <p style="margin: 5px 0;"><strong>Transaction:</strong> ${this.escape(transactionHash || '')}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/dashboard" style="${this.buttonStyle()}">View Dashboard</a>
        </div>
      `, data),
      text: `Payout Processed\n\nHi ${username || 'there'},\n\nYour payout of ${amount} tokens has been sent.\n\nAddress: ${stellarAddress || ''}\nTransaction: ${transactionHash || ''}\n\nView dashboard: ${this.appUrl}/dashboard`,
    };
  }

  private renderPayoutFailed(data: Record<string, any>): TemplateResult {
    const { username, amount, reason } = data;
    return {
      subject: `Payout Issue: Action Required`,
      html: this.wrapHtml(`
        <h1>Payout Issue</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>We encountered an issue processing your payout of <strong>${amount} tokens</strong>.</p>
        ${reason ? `<p><strong>Details:</strong> ${this.escape(reason)}</p>` : ''}
        <p>Our team is looking into this. If the issue persists, please contact support.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/support" style="${this.buttonStyle()}">Contact Support</a>
        </div>
      `, data),
      text: `Payout Issue\n\nHi ${username || 'there'},\n\nWe encountered an issue processing your payout of ${amount} tokens.${reason ? ` Details: ${reason}` : ''}\n\nContact support: ${this.appUrl}/support`,
    };
  }

  private renderAccountUpdate(data: Record<string, any>): TemplateResult {
    const { username, updateType, details } = data;
    return {
      subject: `Account Update: ${updateType || 'Important Notice'}`,
      html: this.wrapHtml(`
        <h1>Account Update</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>${this.escape(details || 'There has been an update to your account.')}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.appUrl}/settings" style="${this.buttonStyle()}">View Settings</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't make this change, please contact support immediately.</p>
      `, data),
      text: `Account Update\n\nHi ${username || 'there'},\n\n${details || 'There has been an update to your account.'}\n\nView settings: ${this.appUrl}/settings`,
    };
  }

  private renderGeneralNotification(data: Record<string, any>): TemplateResult {
    const { username, title, message, ctaText, ctaUrl } = data;
    return {
      subject: title || `${this.appName} Notification`,
      html: this.wrapHtml(`
        <h1>${this.escape(title || 'Notification')}</h1>
        <p>Hi ${this.escape(username || 'there')},</p>
        <p>${this.escape(message || '')}</p>
        ${ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.escape(ctaUrl)}" style="${this.buttonStyle()}">${this.escape(ctaText || 'Learn More')}</a>
        </div>` : ''}
      `, data),
      text: `${title || 'Notification'}\n\nHi ${username || 'there'},\n\n${message || ''}${ctaUrl ? `\n\n${ctaText || 'Learn More'}: ${ctaUrl}` : ''}`,
    };
  }

  private renderFallback(data: Record<string, any>): TemplateResult {
    return this.renderGeneralNotification(data);
  }

  private wrapHtml(body: string, data: Record<string, any> = {}): string {
    const unsubscribeToken = data.unsubscribeToken || '';
    const unsubscribeUrl = unsubscribeToken
      ? `${this.appUrl}/api/v1/email/unsubscribe?token=${unsubscribeToken}`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 40px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${this.appName}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
              ${unsubscribeUrl ? `<p style="margin: 0;"><a href="${unsubscribeUrl}" style="color: #999; font-size: 12px; text-decoration: underline;">Unsubscribe</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buttonStyle(): string {
    return 'display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;';
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
