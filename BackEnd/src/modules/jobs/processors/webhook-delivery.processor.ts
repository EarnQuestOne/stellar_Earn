import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { AxiosInstance } from 'axios';
import { Repository } from 'typeorm';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from '../../webhooks-outbound/entities/webhook-delivery.entity';
import { WebhookSubscription } from '../../webhooks-outbound/entities/webhook-subscription.entity';
import { OutboundWebhookDeliveryPayload } from '../../webhooks-outbound/webhooks-outbound.types';
import {
  OUTBOUND_WEBHOOK_DEFAULTS,
  OUTBOUND_WEBHOOK_METRICS,
  readEnvNumber,
} from '../../webhooks-outbound/webhooks-outbound.constants';
import { decryptSecret } from '../../webhooks-outbound/utils/secret-encryption';
import { signWebhookPayload } from '../../webhooks-outbound/utils/signature';
import { MetricsService } from '../../../common/services/metrics.service';
import { PooledHttpClientService } from '../../../common/http-client/http-client.service';
import { JobResult } from '../job.types';

/**
 * Delivers outbound webhook events to third-party consumers.
 *
 * Responsibilities:
 *  - Short-circuits when the subscription was paused or deleted meanwhile.
 *  - Signs the payload (HMAC-SHA256 over `<timestamp>.<body>`) so consumers
 *    can authenticate deliveries and reject replays.
 *  - Records per-attempt outcome on the `WebhookDelivery` row.
 *  - Relies on BullMQ's exponential backoff for retries; once the job's
 *    attempts are exhausted the delivery is marked dead-lettered and the
 *    job is allowed to fail into the dead-letter queue.
 */
@Injectable()
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);
  private readonly http: AxiosInstance;
  private readonly maxAttempts = readEnvNumber(
    'WEBHOOK_OUTBOUND_MAX_ATTEMPTS',
    OUTBOUND_WEBHOOK_DEFAULTS.maxAttempts,
  );

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    private readonly metrics: MetricsService,
    httpClient: PooledHttpClientService,
  ) {
    this.http = httpClient.create(
      OUTBOUND_WEBHOOK_DEFAULTS.requestTimeoutBudget,
    );
  }

  async process(job: Job<OutboundWebhookDeliveryPayload>): Promise<JobResult> {
    const data = job.data;
    const startedAt = Date.now();
    const started = new Date();

    try {
      const delivery = await this.deliveries.findOne({
        where: { id: data.deliveryId },
      });
      if (!delivery) {
        this.logger.warn(
          `Outbound webhook delivery ${data.deliveryId} no longer exists; skipping`,
        );
        return { success: true };
      }

      // Short-circuit: paused/deleted subscriptions stop generating and
      // cancel pending deliveries.
      const subscription = await this.subscriptions.findOne({
        where: { id: data.subscriptionId },
      });
      if (!subscription || !subscription.isActive) {
        delivery.status = WebhookDeliveryStatus.CANCELLED;
        await this.deliveries.save(delivery);
        this.logger.log(
          `Cancelled outbound webhook delivery ${delivery.id}: subscription inactive`,
        );
        return { success: true };
      }

      const secret = subscription.secretEncrypted
        ? decryptSecret(subscription.secretEncrypted)
        : null;
      const timestamp = new Date().toISOString();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': data.eventType,
        'X-Webhook-Delivery-Id': delivery.id,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': signWebhookPayload(
          data.payload,
          secret ?? '',
          timestamp,
        ),
      };

      const response = await this.http.post(data.targetUrl, data.payload, {
        headers,
        timeout: 8_000,
      });

      delivery.attemptCount = job.attemptsMade + 1;
      delivery.status = WebhookDeliveryStatus.DELIVERED;
      delivery.responseCode = response.status;
      delivery.responseBody = this.truncate(
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data),
      );
      delivery.errorMessage = null;
      delivery.nextRetryAt = null;
      delivery.lastAttemptAt = new Date();
      await this.deliveries.save(delivery);

      this.metrics.incrementCounter(OUTBOUND_WEBHOOK_METRICS.deliveriesTotal, {
        eventType: data.eventType,
        status: 'delivered',
      });
      this.metrics.observeHistogram(
        OUTBOUND_WEBHOOK_METRICS.latencyMs,
        Date.now() - startedAt,
        { eventType: data.eventType },
      );

      return {
        success: true,
        startedAt: started,
        completedAt: new Date(),
        duration: Date.now() - startedAt,
        data: { deliveryId: delivery.id, status: delivery.status },
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.recordFailure(data, job, err);
      throw err;
    }
  }

  private async recordFailure(
    data: OutboundWebhookDeliveryPayload,
    job: Job<OutboundWebhookDeliveryPayload>,
    error: Error,
  ): Promise<void> {
    const attemptCount = job.attemptsMade + 1;
    const delivery = await this.deliveries.findOne({
      where: { id: data.deliveryId },
    });
    if (!delivery) return;

    // maxAttempts is stored on the delivery row at dispatch time; fall back
    // to the configured default only if it was never persisted.
    const maxAttempts = delivery.maxAttempts ?? this.maxAttempts;
    const exhausted = attemptCount >= maxAttempts;
    delivery.attemptCount = attemptCount;
    delivery.status = exhausted
      ? WebhookDeliveryStatus.DEAD_LETTERED
      : WebhookDeliveryStatus.FAILED;
    delivery.errorMessage = this.truncate(error.message || 'Delivery failed');
    delivery.lastAttemptAt = new Date();
    if (exhausted) {
      delivery.deadLetteredAt = new Date();
      delivery.nextRetryAt = null;
    } else {
      delivery.nextRetryAt = this.nextRetryAt(attemptCount);
    }
    await this.deliveries.save(delivery);

    this.metrics.incrementCounter(OUTBOUND_WEBHOOK_METRICS.deliveriesTotal, {
      eventType: data.eventType,
      status: exhausted ? 'dead_lettered' : 'failed',
    });
    if (!exhausted) {
      this.metrics.incrementCounter(OUTBOUND_WEBHOOK_METRICS.retriesTotal, {
        eventType: data.eventType,
      });
    } else {
      this.metrics.incrementCounter(
        OUTBOUND_WEBHOOK_METRICS.deadLetteredTotal,
        {
          eventType: data.eventType,
        },
      );
    }

    this.logger.warn(
      `Outbound webhook delivery ${data.deliveryId} attempt ${attemptCount}/${maxAttempts} failed: ${error.message}`,
    );
  }

  /** Exponential backoff + jitter for the next retry (mirrors BullMQ's own backoff). */
  private nextRetryAt(attemptCount: number): Date {
    const initialBackoff = readEnvNumber(
      'WEBHOOK_OUTBOUND_INITIAL_BACKOFF_MS',
      OUTBOUND_WEBHOOK_DEFAULTS.initialBackoffMs,
    );
    const jitter = readEnvNumber(
      'WEBHOOK_OUTBOUND_JITTER_MS',
      OUTBOUND_WEBHOOK_DEFAULTS.jitterMs,
    );
    const delay =
      initialBackoff *
        Math.pow(OUTBOUND_WEBHOOK_DEFAULTS.backoffFactor, attemptCount - 1) +
      Math.floor(Math.random() * jitter);
    return new Date(Date.now() + delay);
  }

  private truncate(value: string, maxLength = 2_000): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
  }
}
