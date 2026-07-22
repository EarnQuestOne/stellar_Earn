import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import {
  FailedWebhookEvent,
  FailedWebhookStatus,
} from './entities/failed-webhook-event.entity';
import { WebhooksService } from './webhooks.service';

/**
 * Periodically re-attempts webhook events that previously failed and are
 * due for their next backoff retry, so failures are recovered automatically
 * instead of requiring a manual admin trigger.
 */
@Injectable()
export class FailedWebhookRetryScheduler {
  private readonly logger = new Logger(FailedWebhookRetryScheduler.name);
  private static readonly BATCH_SIZE = 25;

  constructor(
    @InjectRepository(FailedWebhookEvent)
    private readonly failedWebhookRepository: Repository<FailedWebhookEvent>,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueRetries(): Promise<void> {
    const due = await this.failedWebhookRepository.find({
      where: {
        status: FailedWebhookStatus.PENDING,
        nextRetryAt: LessThanOrEqual(new Date()),
      },
      order: { nextRetryAt: 'ASC' },
      take: FailedWebhookRetryScheduler.BATCH_SIZE,
    });

    if (due.length === 0) return;

    this.logger.log(`Found ${due.length} failed webhook(s) due for retry`);

    for (const record of due) {
      try {
        await this.webhooksService.retryFailedWebhook(
          record.eventId,
          record.maxAttempts,
        );
      } catch (error) {
        this.logger.error(
          `Unexpected error retrying webhook ${record.eventId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
