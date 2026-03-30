import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebhookDeliverPayload, WebhookRetryPayload, JobResult } from '../job.types';
import { JobLogService } from './job-log.service';
import * as crypto from 'crypto';

/**
 * Webhook Processor
 * Handles webhook delivery and retries
 */
@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);
  private readonly requestTimeout = 30000; // 30 seconds

  constructor(private readonly jobLogService: JobLogService) {}

  /**
   * Process webhook delivery job
   */
  async processDelivery(job: Job<WebhookDeliverPayload>): Promise<JobResult> {
    const { webhookId, event, payload, url, secret } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing webhook delivery job ${job.id}: webhookId=${webhookId}, event=${event}`,
      );

      // Validation
      if (!webhookId || !event || !payload || !url) {
        throw new Error('Missing required webhook fields');
      }

      if (!this.isValidUrl(url)) {
        throw new Error(`Invalid webhook URL: ${url}`);
      }

      await job.updateProgress(20);

      // Create signature for webhook request
      const signature = secret ? this.createSignature(payload, secret) : null;

      await job.updateProgress(30);

      // TODO: Send HTTP POST request to webhook URL
      // This would involve:
      // 1. Serialize payload
      // 2. Add signature header if secret provided
      // 3. Send POST request with timeout
      // 4. Handle response (2xx = success, others = retry)
      // 5. Log request/response for audit

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-ID': webhookId,
        'X-Timestamp': new Date().toISOString(),
      };

      if (signature) {
        headers['X-Signature'] = signature;
      }

      // Simulate webhook delivery
      const success = Math.random() > 0.1; // 90% success rate
      if (!success) {
        throw new Error('Webhook endpoint returned non-2xx status');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          webhookId,
          event,
          url,
          statusCode: 200,
          deliveredAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Webhook delivered successfully: ${webhookId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error delivering webhook ${webhookId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Process webhook retry job
   */
  async processRetry(job: Job<WebhookRetryPayload>): Promise<JobResult> {
    const { webhookLogId, attemptNumber } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing webhook retry job ${job.id}: webhookLogId=${webhookLogId}, attempt=${attemptNumber}`,
      );

      if (!webhookLogId || !attemptNumber) {
        throw new Error('Missing required retry fields');
      }

      // TODO: Load webhook log entry and re-attempt delivery
      // This would involve:
      // 1. Query webhook_logs table for webhookLogId
      // 2. Extract original payload and URL
      // 3. Increment attempt counter
      // 4. Retry delivery
      // 5. Update log with new attempt status

      await job.updateProgress(50);

      // Simulate retry
      const success = Math.random() > 0.2; // 80% success rate on retry
      if (!success) {
        throw new Error(`Retry attempt ${attemptNumber} failed`);
      }

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          webhookLogId,
          attemptNumber,
          statusCode: 200,
          retriedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(
        `Webhook retry successful: ${webhookLogId}, attempt ${attemptNumber}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error retrying webhook ${webhookLogId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  // Helper methods

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private createSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }
}
