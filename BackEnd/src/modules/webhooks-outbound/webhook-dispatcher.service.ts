import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
} from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';

/**
 * Bridges the internal domain event bus to outbound webhook deliveries.
 *
 * For each supported domain event it finds every active subscription that
 * selected that event type, persists one {@link WebhookDelivery} per match, and
 * hands each delivery to the {@link WebhookDeliveryProcessor}. Persisting first
 * means a delivery is never lost if the process restarts mid-dispatch.
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    private readonly processor: WebhookDeliveryProcessor,
  ) {}

  @OnEvent('quest.created', { async: true })
  async onQuestCreated(payload: unknown): Promise<void> {
    await this.dispatchEvent('quest.created', this.toRecord(payload));
  }

  @OnEvent('submission.approved', { async: true })
  async onSubmissionApproved(payload: unknown): Promise<void> {
    await this.dispatchEvent('submission.approved', this.toRecord(payload));
  }

  @OnEvent('payout.completed', { async: true })
  async onPayoutCompleted(payload: unknown): Promise<void> {
    await this.dispatchEvent('payout.completed', this.toRecord(payload));
  }

  /**
   * Fan-out entrypoint: match active subscriptions for `eventType`, persist a
   * delivery for each, and kick off delivery. Safe to call from anywhere.
   */
  async dispatchEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const matches = await this.subscriptions.find({
      where: { status: WebhookSubscriptionStatus.ACTIVE },
    });
    const interested = matches.filter((s) => s.eventTypes.includes(eventType));
    if (interested.length === 0) {
      return;
    }
    this.logger.log(
      `Dispatching '${eventType}' to ${interested.length} subscription(s)`,
    );
    for (const sub of interested) {
      await this.dispatchToSubscription(sub, eventType, data);
    }
  }

  /** Persists and delivers a single event to one subscription. */
  async dispatchToSubscription(
    subscription: WebhookSubscription,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<WebhookDelivery> {
    const delivery = await this.deliveries.save(
      this.deliveries.create({
        subscriptionId: subscription.id,
        eventType,
        payload: this.buildCanonicalPayload(eventType, data),
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 0,
        deadLettered: false,
      }),
    );
    // Fire-and-forget: the processor owns retry/backoff/dead-letter state.
    void this.processor.deliver(delivery.id).catch((err) => {
      this.logger.error(
        `Unhandled error delivering webhook ${delivery.id}: ${(err as Error).message}`,
      );
    });
    return delivery;
  }

  private buildCanonicalPayload(
    eventType: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      type: eventType,
      createdAt: new Date().toISOString(),
      data,
    };
  }

  private toRecord(payload: unknown): Record<string, unknown> {
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }
    return { value: payload };
  }
}
