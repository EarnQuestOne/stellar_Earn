import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';
import { MetricsService } from '../../common/services/metrics.service';
import {
  OUTBOUND_WEBHOOK_DEFAULTS,
  OUTBOUND_WEBHOOK_METRICS,
  readEnvNumber,
} from './webhooks-outbound.constants';
import { OutboundWebhookDeliveryPayload } from './webhooks-outbound.types';

/**
 * Subscribes to the platform's domain event bus and pushes matching events to
 * registered outbound webhook subscriptions.
 *
 * For each matching active subscription it persists a `WebhookDelivery` row
 * and enqueues one BullMQ delivery job (QUEUES.WEBHOOKS_OUTBOUND). The
 * delivery worker performs the signed HTTP POST, retries with exponential
 * backoff + jitter, and dead-letters after the max attempts.
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);
  private readonly maxAttempts = readEnvNumber(
    'WEBHOOK_OUTBOUND_MAX_ATTEMPTS',
    OUTBOUND_WEBHOOK_DEFAULTS.maxAttempts,
  );
  private readonly initialBackoffMs = readEnvNumber(
    'WEBHOOK_OUTBOUND_INITIAL_BACKOFF_MS',
    OUTBOUND_WEBHOOK_DEFAULTS.initialBackoffMs,
  );

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    private readonly jobsService: JobsService,
    private readonly metrics: MetricsService,
  ) {}

  @OnEvent('quest.created', { async: true })
  async onQuestCreated(event: unknown): Promise<void> {
    await this.dispatch('quest.created', event);
  }

  @OnEvent('quest.completed', { async: true })
  async onQuestCompleted(event: unknown): Promise<void> {
    await this.dispatch('quest.completed', event);
  }

  @OnEvent('quest.updated', { async: true })
  async onQuestUpdated(event: unknown): Promise<void> {
    await this.dispatch('quest.updated', event);
  }

  @OnEvent('quest.deleted', { async: true })
  async onQuestDeleted(event: unknown): Promise<void> {
    await this.dispatch('quest.deleted', event);
  }

  @OnEvent('submission.received', { async: true })
  async onSubmissionReceived(event: unknown): Promise<void> {
    await this.dispatch('submission.received', event);
  }

  @OnEvent('submission.approved', { async: true })
  async onSubmissionApproved(event: unknown): Promise<void> {
    await this.dispatch('submission.approved', event);
  }

  @OnEvent('submission.rejected', { async: true })
  async onSubmissionRejected(event: unknown): Promise<void> {
    await this.dispatch('submission.rejected', event);
  }

  @OnEvent('payout.processed', { async: true })
  async onPayoutProcessed(event: unknown): Promise<void> {
    await this.dispatch('payout.processed', event);
  }

  @OnEvent('payout.failed', { async: true })
  async onPayoutFailed(event: unknown): Promise<void> {
    await this.dispatch('payout.failed', event);
  }

  /**
   * Core dispatch: finds matching active subscriptions, persists a delivery
   * row per subscription, and enqueues one delivery job each.
   */
  async dispatch(
    eventType: string,
    event: unknown,
  ): Promise<WebhookDelivery[]> {
    const subscriptions = await this.subscriptions.find({
      where: { eventType, isActive: true },
    });
    if (subscriptions.length === 0) return [];

    const timestamp = new Date().toISOString();
    const envelope = {
      id: this.eventId(eventType, event),
      type: eventType,
      timestamp,
      data: event,
    };

    const deliveries: WebhookDelivery[] = [];
    for (const subscription of subscriptions) {
      try {
        const delivery = await this.deliveries.save(
          this.deliveries.create({
            subscriptionId: subscription.id,
            eventType,
            eventId: envelope.id,
            payload: envelope as unknown as Record<string, unknown>,
            status: WebhookDeliveryStatus.PENDING,
            maxAttempts: this.maxAttempts,
          }),
        );

        const payload: OutboundWebhookDeliveryPayload = {
          deliveryId: delivery.id,
          subscriptionId: subscription.id,
          eventType,
          eventId: envelope.id,
          payload: envelope,
          targetUrl: subscription.targetUrl,
          secretEncrypted: subscription.secretEncrypted,
        };

        await this.jobsService.addJob(QUEUES.WEBHOOKS_OUTBOUND, payload, {
          attempts: this.maxAttempts,
          backoff: {
            type: 'exponential' as const,
            delay: this.initialBackoffMs,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        });

        this.metrics.incrementCounter(OUTBOUND_WEBHOOK_METRICS.enqueuedTotal, {
          eventType,
        });
        deliveries.push(delivery);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to enqueue outbound webhook delivery for subscription ${subscription.id} (${eventType}): ${message}`,
        );
      }
    }

    return deliveries;
  }

  private eventId(eventType: string, event: unknown): string {
    const raw = (event as { timestamp?: Date | string } | null)?.timestamp;
    const time = raw ? new Date(raw).getTime() : Date.now();
    return `${eventType}:${time}`;
  }
}
