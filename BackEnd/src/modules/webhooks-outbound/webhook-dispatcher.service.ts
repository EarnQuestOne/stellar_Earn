import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, UpdateResult } from 'typeorm';
import * as crypto from 'crypto';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatusEnum,
} from './entities/webhook-delivery.entity';
import { JobsService } from '../jobs/jobs.service';
import {
  WEBHOOK_OUTBOUND_EVENT_CATALOG_SET,
  WEBHOOK_OUTBOUND_METRICS,
  WEBHOOK_OUTBOUND_QUEUE,
  WEBHOOK_OUTBOUND_RETRY,
  outboundWebhookJobId,
  subscriptionMatchesEvent,
} from './webhooks-outbound.constants';
import { MetricsService } from '../../common/services/metrics.service';
import { outboundBackoffDelayMs } from './utils/backoff.util';

/**
 * Dispatches platform domain events to matching webhook subscriptions (#2306).
 *
 * Listens on the global EventEmitter2 bus (wildcard mode), filters to the
 * public event catalog, creates one `WebhookDelivery` row per matching
 * subscription, and enqueues a single-attempt BullMQ job per row. Retry
 * orchestration (backoff + jitter, dead-lettering) lives in the delivery
 * table and is driven by `claimDueDeliveries`, so retry state is observable
 * in Postgres rather than hidden in Redis.
 */
@Injectable()
export class WebhookDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookDispatcherService.name);
  private readonly handler: (
    eventName: string | string[],
    payload: any,
  ) => void;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepository: Repository<WebhookDelivery>,
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    private readonly jobsService: JobsService,
    private readonly metrics: MetricsService,
  ) {
    this.handler = (eventName, payload) => {
      const name = Array.isArray(eventName) ? eventName.join('.') : eventName;
      void this.dispatchDomainEvent(name, payload).catch((err) =>
        this.logger.error(`Dispatch of ${name} failed: ${err.message}`),
      );
    };
  }

  onModuleInit(): void {
    this.metrics.registerCounter(
      WEBHOOK_OUTBOUND_METRICS.dispatched,
      'Outbound webhook deliveries created',
    );
    this.metrics.registerCounter(
      WEBHOOK_OUTBOUND_METRICS.delivered,
      'Outbound webhook deliveries acknowledged (2xx)',
    );
    this.metrics.registerCounter(
      WEBHOOK_OUTBOUND_METRICS.retryScheduled,
      'Outbound webhook delivery retries scheduled',
    );
    this.metrics.registerCounter(
      WEBHOOK_OUTBOUND_METRICS.deadLetter,
      'Outbound webhook deliveries dead-lettered',
    );
    this.metrics.registerCounter(
      WEBHOOK_OUTBOUND_METRICS.skipped,
      'Outbound webhook deliveries skipped (paused/deleted subscription)',
    );
    this.metrics.registerHistogram(
      WEBHOOK_OUTBOUND_METRICS.duration,
      'Outbound webhook delivery HTTP round-trip duration (ms)',
    );

    const queue = this.jobsService.getQueue(WEBHOOK_OUTBOUND_QUEUE);
    if (!queue) {
      this.logger.warn(
        `Queue ${WEBHOOK_OUTBOUND_QUEUE} is not registered — deliveries stay pending until the scheduler enqueues them`,
      );
    }
    this.eventEmitter.onAny(this.handler);
    this.logger.log('Outbound webhook dispatcher listening on the event bus');
  }

  onModuleDestroy(): void {
    this.eventEmitter.offAny(this.handler);
  }

  /** True for events third parties may subscribe to. */
  isPublicEvent(eventName: string): boolean {
    return WEBHOOK_OUTBOUND_EVENT_CATALOG_SET.has(eventName);
  }

  /** Event-bus entry point: catalog filter → match → persist → enqueue. */
  async dispatchDomainEvent(
    eventName: string,
    payload: any,
  ): Promise<{ deliveryIds: string[] }> {
    if (!this.isPublicEvent(eventName)) return { deliveryIds: [] };

    const subscriptions = await this.subscriptionRepository.find({
      where: { state: WebhookSubscriptionState.ACTIVE },
    });
    const matching = subscriptions.filter(
      (s) =>
        // Guard in code as well as in the query: a subscription paused between
        // the read and the match must never receive new deliveries.
        s.state === WebhookSubscriptionState.ACTIVE &&
        subscriptionMatchesEvent(s.eventTypes, eventName),
    );
    if (matching.length === 0) return { deliveryIds: [] };

    const canonicalPayload = this.buildCanonicalPayload(eventName, payload);

    const deliveryIds: string[] = [];
    for (const subscription of matching) {
      const delivery = await this.deliveryRepository.save({
        subscriptionId: subscription.id,
        eventType: eventName,
        payload: canonicalPayload,
        status: WebhookDeliveryStatusEnum.PENDING,
        attempts: 0,
        maxAttempts: WEBHOOK_OUTBOUND_RETRY.maxAttempts,
      });
      deliveryIds.push(delivery.id);
      await this.enqueueDelivery(delivery.id, 1);
      this.metrics.incrementCounter(WEBHOOK_OUTBOUND_METRICS.dispatched, {
        event: eventName,
      });
    }

    this.logger.debug(
      `Dispatched ${eventName} to ${matching.length} subscription(s)`,
    );
    return { deliveryIds };
  }

  /** Canonical envelope every consumer receives. */
  private buildCanonicalPayload(
    eventName: string,
    payload: any,
  ): Record<string, any> {
    let body: Record<string, any>;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      body = { ...payload };
    } else {
      body = { value: payload };
    }
    return {
      id: crypto.randomUUID(),
      eventType: eventName,
      createdAt: new Date().toISOString(),
      data: body,
    };
  }

  /**
   * Enqueues (or re-enqueues after backoff) one delivery attempt via the
   * shared JobsService. Deterministic jobId suppresses duplicate enqueues for
   * the same (delivery, attempt) pair.
   */
  async enqueueDelivery(deliveryId: string, attempt: number): Promise<void> {
    try {
      await this.jobsService.addJob(
        WEBHOOK_OUTBOUND_QUEUE,
        { deliveryId },
        {
          jobId: outboundWebhookJobId(deliveryId, attempt),
          attempts: 1,
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      );
    } catch (err: any) {
      // A missing queue or a Redis hiccup must not lose the delivery: the row
      // stays pending/retrying and the scheduler re-enqueues it next tick.
      this.logger.warn(
        `Could not enqueue delivery ${deliveryId} (attempt ${attempt}): ${err?.message} — scheduler will retry`,
      );
    }
  }

  /**
   * Claims deliveries that are due: fresh `pending` rows, `retrying` rows
   * whose backoff has elapsed, and `delivering` rows stuck longer than the
   * crash-recovery window. Called by the scheduler every minute and after
   * each worker outcome.
   */
  async claimDueDeliveries(limit = 50): Promise<WebhookDelivery[]> {
    const now = new Date();

    // Crash recovery: requeue rows stuck mid-attempt.
    const stuckCutoff = new Date(
      now.getTime() - WEBHOOK_OUTBOUND_RETRY.stuckDeliveringMs,
    );
    await this.deliveryRepository
      .createQueryBuilder()
      .update(WebhookDelivery)
      .set({ status: WebhookDeliveryStatusEnum.PENDING })
      .where('status = :delivering AND updatedAt <= :cutoff', {
        delivering: WebhookDeliveryStatusEnum.DELIVERING,
        cutoff: stuckCutoff,
      })
      .execute();

    const due = await this.deliveryRepository.find({
      where: [
        { status: WebhookDeliveryStatusEnum.PENDING },
        {
          status: WebhookDeliveryStatusEnum.RETRYING,
          nextRetryAt: LessThanOrEqual(now),
        },
      ],
      order: { createdAt: 'ASC' },
      take: limit,
    });

    for (const delivery of due) {
      await this.enqueueDelivery(delivery.id, delivery.attempts + 1);
    }
    return due;
  }

  /**
   * Called by the delivery worker after a failed HTTP attempt: schedule the
   * retry (backoff + jitter) or dead-letter the delivery.
   */
  async scheduleRetry(
    delivery: WebhookDelivery,
    responseStatusCode: number | null,
    errorText: string,
  ): Promise<'retrying' | 'dead_lettered'> {
    const attempts = delivery.attempts + 1;
    const truncatedError = errorText.slice(0, 512);

    if (attempts >= delivery.maxAttempts) {
      await this.deliveryRepository.update(delivery.id, {
        status: WebhookDeliveryStatusEnum.DEAD_LETTERED,
        attempts,
        responseStatusCode,
        lastError: truncatedError,
        deadLetteredAt: new Date(),
        nextRetryAt: null,
      });
      this.metrics.incrementCounter(WEBHOOK_OUTBOUND_METRICS.deadLetter, {
        event: delivery.eventType,
      });
      this.logger.warn(
        `Delivery ${delivery.id} dead-lettered after ${attempts} attempts`,
      );
      return 'dead_lettered';
    }

    const delayMs = outboundBackoffDelayMs(attempts, {
      baseDelayMs: WEBHOOK_OUTBOUND_RETRY.baseDelayMs,
      factor: WEBHOOK_OUTBOUND_RETRY.factor,
      maxDelayMs: WEBHOOK_OUTBOUND_RETRY.maxDelayMs,
      jitterRatio: WEBHOOK_OUTBOUND_RETRY.jitterRatio,
    });
    await this.deliveryRepository.update(delivery.id, {
      status: WebhookDeliveryStatusEnum.RETRYING,
      attempts,
      responseStatusCode,
      lastError: truncatedError,
      nextRetryAt: new Date(Date.now() + delayMs),
    });
    this.metrics.incrementCounter(WEBHOOK_OUTBOUND_METRICS.retryScheduled, {
      event: delivery.eventType,
    });
    return 'retrying';
  }

  /** Skips pending deliveries for paused/deleted subscriptions. */
  async skipDeliveriesForSubscription(
    subscriptionId: string,
  ): Promise<UpdateResult> {
    const result = await this.deliveryRepository.update(
      {
        subscriptionId,
        status: In([
          WebhookDeliveryStatusEnum.PENDING,
          WebhookDeliveryStatusEnum.RETRYING,
        ]),
      },
      {
        status: WebhookDeliveryStatusEnum.SKIPPED,
        lastError: 'subscription paused or deleted',
        nextRetryAt: null,
      },
    );
    this.metrics.incrementCounter(
      WEBHOOK_OUTBOUND_METRICS.skipped,
      {},
      result.affected ?? 0,
    );
    return result;
  }
}
