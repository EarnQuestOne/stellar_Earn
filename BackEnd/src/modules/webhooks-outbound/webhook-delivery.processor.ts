import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
} from './entities/webhook-subscription.entity';
import { MetricsService } from '../../common/services/metrics.service';
import { computeSignature, decryptSecret } from './webhook-crypto';

/** Tuning knobs, overridable via env; defaults are sane for production. */
const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 6);
const BASE_DELAY_MS = Number(process.env.WEBHOOK_BASE_DELAY_MS ?? 1000);
const MAX_DELAY_MS = Number(process.env.WEBHOOK_MAX_DELAY_MS ?? 300000);
const REQUEST_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS ?? 10000);

const M_SUCCESS = 'webhook_outbound_delivery_success_total';
const M_FAILURE = 'webhook_outbound_delivery_failure_total';
const M_RETRY = 'webhook_outbound_delivery_retry_total';
const M_DEAD_LETTER = 'webhook_outbound_delivery_dead_letter_total';
const M_LATENCY = 'webhook_outbound_delivery_latency_ms';

/**
 * Performs the actual HTTP delivery of a persisted {@link WebhookDelivery}.
 *
 * On each attempt it signs `"{timestamp}.{body}"` with the subscription secret,
 * POSTs over a keep-alive agent with a hard timeout, and records the outcome.
 * Failures are retried with exponential backoff + jitter up to `MAX_ATTEMPTS`,
 * after which the delivery is dead-lettered. A paused or deleted subscription
 * short-circuits any pending delivery. Delivery metrics are emitted throughout.
 *
 * Retries are scheduled in-process (the platform does not run a BullMQ worker);
 * the durable {@link WebhookDelivery} row keeps status queryable and lets a
 * future queue-backed worker resume from the persisted state.
 */
@Injectable()
export class WebhookDeliveryProcessor implements OnModuleInit {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);
  private readonly httpAgent = new http.Agent({ keepAlive: true });
  private readonly httpsAgent = new https.Agent({ keepAlive: true });

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metrics.registerCounter(
      M_SUCCESS,
      'Outbound webhook deliveries that succeeded',
    );
    this.metrics.registerCounter(
      M_FAILURE,
      'Outbound webhook delivery attempts that failed',
    );
    this.metrics.registerCounter(
      M_RETRY,
      'Outbound webhook delivery retries scheduled',
    );
    this.metrics.registerCounter(
      M_DEAD_LETTER,
      'Outbound webhook deliveries dead-lettered',
    );
    this.metrics.registerHistogram(
      M_LATENCY,
      'Outbound webhook delivery latency (ms)',
    );
  }

  /** Attempts one delivery, scheduling a retry or dead-lettering on failure. */
  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.deliveries.findOne({
      where: { id: deliveryId },
    });
    if (
      !delivery ||
      delivery.status === WebhookDeliveryStatus.DELIVERED ||
      delivery.deadLettered
    ) {
      return;
    }

    const subscription = await this.subscriptions.findOne({
      where: { id: delivery.subscriptionId },
    });
    // Paused or deleted subscription: short-circuit pending deliveries.
    if (
      !subscription ||
      subscription.status !== WebhookSubscriptionStatus.ACTIVE
    ) {
      delivery.status = WebhookDeliveryStatus.FAILED;
      delivery.lastError = 'Subscription is paused or no longer exists';
      await this.deliveries.save(delivery);
      return;
    }

    const attempt = delivery.attemptCount + 1;
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computeSignature(
      decryptSecret(subscription.encryptedSecret),
      timestamp,
      body,
    );
    const startedAt = Date.now();

    try {
      const response = await axios.post(subscription.targetUrl, body, {
        timeout: REQUEST_TIMEOUT_MS,
        httpAgent: this.httpAgent,
        httpsAgent: this.httpsAgent,
        maxRedirects: 0,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-Delivery': delivery.id,
          'X-Webhook-Timestamp': String(timestamp),
          'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
        },
        // We classify status ourselves so non-2xx flows into the retry path.
        validateStatus: () => true,
      });

      this.metrics.observeHistogram(M_LATENCY, Date.now() - startedAt, {
        event: delivery.eventType,
      });

      if (response.status >= 200 && response.status < 300) {
        delivery.status = WebhookDeliveryStatus.DELIVERED;
        delivery.attemptCount = attempt;
        delivery.responseStatusCode = response.status;
        delivery.lastError = null;
        delivery.nextRetryAt = null;
        delivery.deliveredAt = new Date();
        await this.deliveries.save(delivery);
        this.metrics.incrementCounter(M_SUCCESS, { event: delivery.eventType });
        return;
      }

      await this.handleFailure(
        delivery,
        attempt,
        `Non-2xx response: ${response.status}`,
        response.status,
      );
    } catch (err) {
      await this.handleFailure(delivery, attempt, (err as Error).message, null);
    }
  }

  private async handleFailure(
    delivery: WebhookDelivery,
    attempt: number,
    error: string,
    statusCode: number | null,
  ): Promise<void> {
    delivery.attemptCount = attempt;
    delivery.responseStatusCode = statusCode;
    delivery.lastError = error;
    this.metrics.incrementCounter(M_FAILURE, { event: delivery.eventType });

    if (attempt >= MAX_ATTEMPTS) {
      delivery.status = WebhookDeliveryStatus.DEAD_LETTERED;
      delivery.deadLettered = true;
      delivery.nextRetryAt = null;
      await this.deliveries.save(delivery);
      this.metrics.incrementCounter(M_DEAD_LETTER, {
        event: delivery.eventType,
      });
      this.logger.warn(
        `Webhook delivery ${delivery.id} dead-lettered after ${attempt} attempts: ${error}`,
      );
      return;
    }

    const delayMs = this.backoffWithJitter(attempt);
    delivery.status = WebhookDeliveryStatus.FAILED;
    delivery.nextRetryAt = new Date(Date.now() + delayMs);
    await this.deliveries.save(delivery);
    this.metrics.incrementCounter(M_RETRY, { event: delivery.eventType });

    setTimeout(() => {
      void this.deliver(delivery.id).catch((e) =>
        this.logger.error(
          `Retry of webhook ${delivery.id} failed: ${(e as Error).message}`,
        ),
      );
    }, delayMs).unref();
  }

  /** Exponential backoff (base * 2^(attempt-1)) capped at MAX_DELAY_MS, with full jitter. */
  private backoffWithJitter(attempt: number): number {
    const exponential = Math.min(
      BASE_DELAY_MS * 2 ** (attempt - 1),
      MAX_DELAY_MS,
    );
    return Math.floor(Math.random() * exponential);
  }
}
