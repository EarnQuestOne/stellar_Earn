import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailSendPayload, EmailDigestPayload, JobResult } from '../job.types';
import { JobLogService } from './job-log.service';

/**
 * Email Processor
 * Handles email delivery and digest generation
 */
@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly jobLogService: JobLogService) {}

  /**
   * Process single email send job
   */
  async processSingle(job: Job<EmailSendPayload>): Promise<JobResult> {
    const { messageId, recipientEmail, templateId, variables = {} } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing email job ${job.id}: messageId=${messageId}, template=${templateId}`,
      );

      // Validation
      if (!messageId || !recipientEmail || !templateId) {
        throw new Error('Missing required email fields');
      }

      if (!this.isValidEmail(recipientEmail)) {
        throw new Error(`Invalid email address: ${recipientEmail}`);
      }

      await job.updateProgress(30);

      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      // This would involve:
      // 1. Load email template
      // 2. Compile template with variables
      // 3. Send via email service
      // 4. Wait for delivery confirmation

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          messageId,
          recipientEmail,
          templateId,
          sentAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Email sent successfully: ${messageId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error sending email ${messageId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Process email digest job (bulk email)
   */
  async processDigest(job: Job<EmailDigestPayload>): Promise<JobResult> {
    const { organizationId, digestType, recipientEmails } = job.data;

    try {
      await job.updateProgress(5);
      this.logger.log(
        `Processing email digest job ${job.id}: org=${organizationId}, type=${digestType}, recipients=${recipientEmails.length}`,
      );

      if (!organizationId || !digestType || !recipientEmails || recipientEmails.length === 0) {
        throw new Error('Missing required digest fields');
      }

      // Validate all email addresses
      const invalidEmails = recipientEmails.filter((email) => !this.isValidEmail(email));
      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      }

      await job.updateProgress(20);

      // TODO: Generate digest content based on type
      // This would involve:
      // 1. Fetch data for digest (last 24h/7d/30d depending on digestType)
      // 2. Compile digest HTML/template
      // 3. Send to all recipients
      // 4. Track delivery status

      const recipientCount = recipientEmails.length;
      const progressStep = 60 / recipientCount;

      for (let i = 0; i < recipientEmails.length; i++) {
        // Simulate sending to each recipient
        await new Promise((resolve) => setTimeout(resolve, 100));
        await job.updateProgress(20 + (i + 1) * progressStep);
      }

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          organizationId,
          digestType,
          recipientsCount: recipientEmails.length,
          sentAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Email digest sent to ${recipientEmails.length} recipients`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing email digest for org ${organizationId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  // Helper methods

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
