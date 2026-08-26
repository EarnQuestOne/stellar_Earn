import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

/**
 * Drives the outbound delivery retry loop (#2306): every minute, deliveries
 * whose backoff has elapsed (plus fresh rows the dispatcher could not enqueue,
 * e.g. during a Redis blip) are re-enqueued. Mirrors the inbound module's
 * `FailedWebhookRetryScheduler` cadence.
 */
@Injectable()
export class OutboundWebhookScheduler {
  private readonly logger = new Logger(OutboundWebhookScheduler.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueDeliveries(): Promise<void> {
    try {
      const due = await this.dispatcher.claimDueDeliveries();
      if (due.length > 0) {
        this.logger.log(`Re-enqueued ${due.length} due webhook delivery(ies)`);
      }
    } catch (error: any) {
      this.logger.error(
        `Outbound webhook scheduler tick failed: ${error?.message}`,
      );
    }
  }
}
