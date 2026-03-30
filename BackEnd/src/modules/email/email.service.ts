import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import {
  SendEmailDto,
  EmailStatus,
  EmailTemplate,
  EmailPriority,
  EmailRecipientDto,
} from './dto/email.dto';
import { EmailTemplateEngine } from './templates/template.engine';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';

interface DeliveryRecord {
  messageId: string;
  to: string;
  subject: string;
  status: EmailStatus;
  timestamp: Date;
  attempts: number;
  lastError?: string;
  template?: EmailTemplate;
}

interface UnsubscribeRecord {
  email: string;
  token: string;
  unsubscribedAt: Date;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private sgMail: any;
  private readonly deliveryLog = new Map<string, DeliveryRecord>();
  private readonly unsubscribeList = new Map<string, UnsubscribeRecord>();
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly replyTo: string;
  private readonly webhookVerificationKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateEngine: EmailTemplateEngine,
    private readonly jobsService: JobsService,
  ) {
    this.apiKey = this.configService.get<string>('email.sendgrid.apiKey', '');
    this.fromEmail = this.configService.get<string>('email.from.email', 'noreply@stellarearn.com');
    this.fromName = this.configService.get<string>('email.from.name', 'Stellar Earn');
    this.replyTo = this.configService.get<string>('email.replyTo', 'support@stellarearn.com');
    this.webhookVerificationKey = this.configService.get<string>(
      'email.sendgrid.webhookVerificationKey',
      '',
    );
  }

  async onModuleInit() {
    this.jobsService.registerEmailProcessor(this.processEmailJob.bind(this));

    if (!this.apiKey) {
      this.logger.warn(
        'SENDGRID_API_KEY is not set. Email sending is disabled. Set the key in environment variables to enable.',
      );
      return;
    }

    try {
      const sgMailModule = await import('@sendgrid/mail');
      this.sgMail = sgMailModule.default || sgMailModule;
      this.sgMail.setApiKey(this.apiKey);
      this.logger.log('SendGrid email service initialized');
    } catch (error) {
      this.logger.warn(
        'SendGrid SDK not available. Install @sendgrid/mail to enable email sending.',
      );
    }
  }

  async sendEmail(dto: SendEmailDto): Promise<{ messageId: string; status: EmailStatus }> {
    const filteredRecipients = this.filterUnsubscribed(dto.to);

    if (filteredRecipients.length === 0) {
      this.logger.log('All recipients are unsubscribed, skipping email');
      return { messageId: '', status: EmailStatus.DROPPED };
    }

    const messageId = this.generateMessageId();

    this.deliveryLog.set(messageId, {
      messageId,
      to: filteredRecipients.map((r) => r.email).join(', '),
      subject: dto.subject,
      status: EmailStatus.QUEUED,
      timestamp: new Date(),
      attempts: 0,
      template: dto.template,
    });

    return { messageId, status: EmailStatus.QUEUED };
  }

  async queueEmail(dto: SendEmailDto): Promise<{ messageId: string; status: EmailStatus }> {
    const result = await this.sendEmail(dto);

    if (result.status === EmailStatus.DROPPED) {
      return result;
    }

    const priority = dto.priority || EmailPriority.NORMAL;
    const jobPriority = this.mapPriorityToJobPriority(priority);

    try {
      await this.jobsService.addJob(QUEUES.EMAIL, {
        messageId: result.messageId,
        dto: {
          ...dto,
          to: this.filterUnsubscribed(dto.to),
        },
      }, { priority: jobPriority });

      this.logger.log(`Email queued: ${result.messageId} to ${dto.to.map((r) => r.email).join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to queue email ${result.messageId}: ${error.message}`);
      this.updateDeliveryStatus(result.messageId, EmailStatus.FAILED, error.message);
      return { messageId: result.messageId, status: EmailStatus.FAILED };
    }

    return result;
  }

  async processEmailJob(messageId: string, dto: SendEmailDto): Promise<void> {
    this.updateDeliveryStatus(messageId, EmailStatus.SENDING);

    let subject = dto.subject;
    let htmlContent = dto.html || '';
    let textContent = dto.text || '';

    if (dto.template) {
      const rendered = this.templateEngine.render(dto.template, dto.templateData || {});
      subject = rendered.subject;
      htmlContent = rendered.html;
      textContent = rendered.text;
    }

    if (!this.sgMail) {
      this.logger.warn(`Email not sent (SendGrid not configured): ${messageId}`);
      this.logger.debug(`Would send to: ${dto.to.map((r) => r.email).join(', ')}, subject: "${subject}"`);
      this.updateDeliveryStatus(messageId, EmailStatus.DROPPED, 'SendGrid not configured');
      return;
    }

    const msg = {
      to: dto.to.map((r) => ({
        email: r.email,
        name: r.name,
      })),
      from: { email: this.fromEmail, name: this.fromName },
      replyTo: this.replyTo,
      subject,
      text: textContent,
      html: htmlContent,
      customArgs: { messageId },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    try {
      const record = this.deliveryLog.get(messageId);
      if (record) {
        record.attempts += 1;
      }

      const [response] = await this.sgMail.send(msg);
      const sgMessageId = response?.headers?.['x-message-id'] || messageId;

      this.updateDeliveryStatus(messageId, EmailStatus.SENT);
      this.logger.log(`Email sent: ${messageId} (sg: ${sgMessageId})`);
    } catch (error) {
      const errorMessage = error?.response?.body?.errors?.[0]?.message || error.message;
      this.updateDeliveryStatus(messageId, EmailStatus.FAILED, errorMessage);
      this.logger.error(`Email send failed: ${messageId} - ${errorMessage}`);
      throw error;
    }
  }

  async sendTemplateEmail(
    template: EmailTemplate,
    recipients: EmailRecipientDto[],
    templateData: Record<string, any>,
    priority: EmailPriority = EmailPriority.NORMAL,
  ): Promise<{ messageId: string; status: EmailStatus }> {
    const rendered = this.templateEngine.render(template, templateData);
    return this.queueEmail({
      to: recipients,
      subject: rendered.subject,
      template,
      templateData,
      priority,
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.WELCOME,
      [{ email }],
      { username, unsubscribeToken: this.generateUnsubscribeToken(email) },
    );
  }

  async sendPasswordResetEmail(email: string, username: string, resetLink: string): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.PASSWORD_RESET,
      [{ email }],
      { username, resetLink, expiresIn: '1 hour' },
      EmailPriority.HIGH,
    );
  }

  async sendSubmissionApprovedEmail(
    email: string,
    username: string,
    questTitle: string,
    rewardAmount?: number,
  ): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.SUBMISSION_APPROVED,
      [{ email }],
      {
        username,
        questTitle,
        rewardAmount,
        unsubscribeToken: this.generateUnsubscribeToken(email),
      },
    );
  }

  async sendSubmissionRejectedEmail(
    email: string,
    username: string,
    questTitle: string,
    reason?: string,
  ): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.SUBMISSION_REJECTED,
      [{ email }],
      {
        username,
        questTitle,
        reason,
        unsubscribeToken: this.generateUnsubscribeToken(email),
      },
    );
  }

  async sendPayoutProcessedEmail(
    email: string,
    username: string,
    amount: string,
    transactionHash: string,
    stellarAddress: string,
  ): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.PAYOUT_PROCESSED,
      [{ email }],
      {
        username,
        amount,
        transactionHash,
        stellarAddress,
        unsubscribeToken: this.generateUnsubscribeToken(email),
      },
    );
  }

  async sendPayoutFailedEmail(
    email: string,
    username: string,
    amount: string,
    reason?: string,
  ): Promise<void> {
    await this.sendTemplateEmail(
      EmailTemplate.PAYOUT_FAILED,
      [{ email }],
      {
        username,
        amount,
        reason,
        unsubscribeToken: this.generateUnsubscribeToken(email),
      },
      EmailPriority.HIGH,
    );
  }

  handleWebhookEvent(events: Array<Record<string, any>>): void {
    for (const event of events) {
      const { event: eventType, email, sg_message_id, reason, bounce_classification } = event;

      this.logger.log(`Webhook event: ${eventType} for ${email} (${sg_message_id || 'unknown'})`);

      const status = this.mapWebhookEventToStatus(eventType);
      if (!status) {
        this.logger.debug(`Unhandled webhook event type: ${eventType}`);
        continue;
      }

      if (sg_message_id) {
        this.updateDeliveryStatus(sg_message_id, status, reason);
      }

      if (status === EmailStatus.BOUNCED) {
        this.handleBounce(email, reason || '', bounce_classification || '');
      }

      if (status === EmailStatus.SPAM_REPORT) {
        this.handleSpamReport(email);
      }

      if (status === EmailStatus.UNSUBSCRIBED) {
        this.addToUnsubscribeList(email);
      }
    }
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.webhookVerificationKey) {
      this.logger.warn('Webhook verification key not configured, skipping verification');
      return true;
    }

    try {
      const timestampPayload = timestamp + payload;
      const expectedSignature = createHmac('sha256', this.webhookVerificationKey)
        .update(timestampPayload)
        .digest('base64');
      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  private handleBounce(email: string, reason: string, classification: string): void {
    this.logger.warn(`Bounce detected for ${email}: ${classification} - ${reason}`);

    const hardBounceTypes = ['hard', 'permanent', 'invalid'];
    if (hardBounceTypes.some((t) => classification.toLowerCase().includes(t))) {
      this.addToUnsubscribeList(email);
      this.logger.warn(`Hard bounce: ${email} added to unsubscribe list`);
    }
  }

  private handleSpamReport(email: string): void {
    this.logger.warn(`Spam report from ${email}, adding to unsubscribe list`);
    this.addToUnsubscribeList(email);
  }

  addToUnsubscribeList(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    if (!this.unsubscribeList.has(normalizedEmail)) {
      this.unsubscribeList.set(normalizedEmail, {
        email: normalizedEmail,
        token: this.generateUnsubscribeToken(normalizedEmail),
        unsubscribedAt: new Date(),
      });
      this.logger.log(`${normalizedEmail} added to unsubscribe list`);
    }
  }

  removeFromUnsubscribeList(email: string): boolean {
    return this.unsubscribeList.delete(email.toLowerCase().trim());
  }

  isUnsubscribed(email: string): boolean {
    return this.unsubscribeList.has(email.toLowerCase().trim());
  }

  processUnsubscribeToken(token: string): { success: boolean; email?: string } {
    for (const [email, record] of this.unsubscribeList.entries()) {
      if (record.token === token) {
        return { success: true, email };
      }
    }

    const email = this.decodeUnsubscribeToken(token);
    if (email) {
      this.addToUnsubscribeList(email);
      return { success: true, email };
    }

    return { success: false };
  }

  getDeliveryStatus(messageId: string): DeliveryRecord | undefined {
    return this.deliveryLog.get(messageId);
  }

  getAllDeliveryStatuses(limit = 100): DeliveryRecord[] {
    const records = Array.from(this.deliveryLog.values());
    return records
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getDeliveryStats(): {
    total: number;
    byStatus: Record<string, number>;
    bounceRate: number;
    deliveryRate: number;
  } {
    const records = Array.from(this.deliveryLog.values());
    const total = records.length;
    const byStatus: Record<string, number> = {};

    for (const record of records) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
    }

    const delivered = byStatus[EmailStatus.DELIVERED] || 0;
    const bounced = byStatus[EmailStatus.BOUNCED] || 0;
    const sent = total - (byStatus[EmailStatus.QUEUED] || 0) - (byStatus[EmailStatus.DROPPED] || 0);

    return {
      total,
      byStatus,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
    };
  }

  private updateDeliveryStatus(messageId: string, status: EmailStatus, reason?: string): void {
    const record = this.deliveryLog.get(messageId);
    if (record) {
      record.status = status;
      record.timestamp = new Date();
      if (reason) {
        record.lastError = reason;
      }
    }
  }

  private filterUnsubscribed(recipients: EmailRecipientDto[]): EmailRecipientDto[] {
    return recipients.filter((r) => !this.isUnsubscribed(r.email));
  }

  private mapPriorityToJobPriority(priority: EmailPriority): number {
    switch (priority) {
      case EmailPriority.HIGH:
        return 1;
      case EmailPriority.NORMAL:
        return 5;
      case EmailPriority.LOW:
        return 10;
      default:
        return 5;
    }
  }

  private mapWebhookEventToStatus(eventType: string): EmailStatus | null {
    const mapping: Record<string, EmailStatus> = {
      processed: EmailStatus.SENT,
      delivered: EmailStatus.DELIVERED,
      bounce: EmailStatus.BOUNCED,
      dropped: EmailStatus.DROPPED,
      deferred: EmailStatus.DEFERRED,
      open: EmailStatus.OPENED,
      click: EmailStatus.CLICKED,
      spamreport: EmailStatus.SPAM_REPORT,
      unsubscribe: EmailStatus.UNSUBSCRIBED,
    };
    return mapping[eventType] || null;
  }

  private generateMessageId(): string {
    return `se_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateUnsubscribeToken(email: string): string {
    const secret = this.configService.get<string>('JWT_SECRET', 'fallback-secret');
    return createHmac('sha256', secret)
      .update(email.toLowerCase().trim())
      .digest('hex');
  }

  private decodeUnsubscribeToken(token: string): string | null {
    for (const [, record] of this.deliveryLog.entries()) {
      const recipientEmails = record.to.split(', ');
      for (const email of recipientEmails) {
        const expectedToken = this.generateUnsubscribeToken(email);
        if (expectedToken === token) {
          return email;
        }
      }
    }
    return null;
  }
}
