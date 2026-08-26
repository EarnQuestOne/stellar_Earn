import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PooledHttpClientService } from '../../common/http-client/http-client.service';
import { MetricsService } from '../../common/services/metrics.service';
import {
  WebhookDelivery,
  WebhookDeliveryStatusEnum,
} from './entities/webhook-delivery.entity';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  signOutboundWebhookPayload,
  decryptSecret,
} from './utils/signature.util';
import {
  WEBHOOK_OUTBOUND_METRICS,
  WEBHOOK_OUTBOUND_RETRY,
} from './webhooks-outbound.constants';

/** Result contract the module's own tests (and logs) rely on. */
export interface OutboundDeliveryResult {
  deliveryId: string;
  status: WebhookDeliveryStatusEnum;
  responseStatusCode: number | null;
}

/**
 * BullMQ processor that performs the actual HTTP POST for one delivery
 * attempt (#2306). Jobs are single-attempt by design — success/failure is
 * written back to the delivery row and all retry orchestration (backoff +
 * jitter, dead-lettering) is owned by the dispatcher.
 */
@Injectable()
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepository: Repository<WebhookDelivery>,
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    private readonly http: PooledHttpClientService,
    private readonly dispatcher: WebhookDispatcherService,
    private readonly metrics: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Entry point for `outbound-deliver` jobs on the webhooks queue.
   * Loading the row, marking it delivering, POSTing, and recording the
   * outcome are one flow; every failure path lands in scheduleRetry.
   */
  async process(
    job: Job<{ deliveryId: string }>,
  ): Promise<OutboundDeliveryResult> {
    const { deliveryId } = job.data;
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });
    if (!delivery) {
      this.logger.warn(`Delivery ${deliveryId} not found — discarding job`);
      return {
        deliveryId,
        status: WebhookDeliveryStatusEnum.SKIPPED,
        responseStatusCode: null,
      };
    }

    // Terminal rows (delivered / dead-lettered / skipped) are idempotency
    // guards against duplicate enqueues.
    if (
      delivery.status === WebhookDeliveryStatusEnum.DELIVERED ||
      delivery.status === WebhookDeliveryStatusEnum.DEAD_LETTERED ||
      delivery.status === WebhookDeliveryStatusEnum.SKIPPED
    ) {
      return {
        deliveryId,
        status: delivery.status,
        responseStatusCode: delivery.responseStatusCode,
      };
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: delivery.subscriptionId },
    });
    if (
      !subscription ||
      subscription.state !== WebhookSubscriptionState.ACTIVE
    ) {
      await this.deliveryRepository.update(delivery.id, {
        status: WebhookDeliveryStatusEnum.SKIPPED,
        lastError: subscription
          ? 'subscription paused'
          : 'subscription deleted',
        nextRetryAt: null,
      });
      this.metrics.incrementCounter(WEBHOOK_OUTBOUND_METRICS.skipped, {
        event: delivery.eventType,
      });
      return {
        deliveryId,
        status: WebhookDeliveryStatusEnum.SKIPPED,
        responseStatusCode: null,
      };
    }

    await this.deliveryRepository.update(delivery.id, {
      status: WebhookDeliveryStatusEnum.DELIVERING,
    });

    // Serialize once; the HMAC covers exactly these bytes.
    const rawBody = JSON.stringify(delivery.payload);
    let secret: string;
    try {
      const key = this.configService.get<string>(
        'OUTBOUND_WEBHOOK_ENCRYPTION_KEY',
      );
      if (!key) throw new Error('OUTBOUND_WEBHOOK_ENCRYPTION_KEY missing');
      secret = decryptSecret(subscription.secretCiphertext, key);
    } catch (err: any) {
      return this.handleFailure(
        delivery,
        null,
        `secret decryption failed: ${err.message}`,
      );
    }

    const { timestamp, signature } = signOutboundWebhookPayload(
      rawBody,
      secret,
    );

    try {
      const response = await this.http
        .create('long')
        .post(subscription.targetUrl, rawBody, {
          headers: {
            'Content-Type': 'application/json',
            'X-StellarEarn-Event': delivery.eventType,
            'X-StellarEarn-Delivery': delivery.id,
            'X-StellarEarn-Timestamp': String(timestamp),
            'X-StellarEarn-Signature': signature,
          },
          // axios treats non-2xx as an error; we want the status code, so
          // validateStatus below lets every response resolve.
          validateStatus: () => true,
          timeout: WEBHOOK_OUTBOUND_RETRY.requestTimeoutMs,
        });

      const statusCode = response.status;
      if (statusCode >= 200 && statusCode < 300) {
        await this.deliveryRepository.update(delivery.id, {
          status: WebhookDeliveryStatusEnum.DELIVERED,
          attempts: delivery.attempts + 1,
          responseStatusCode: statusCode,
          lastError: null,
          deliveredAt: new Date(),
          nextRetryAt: null,
        });
        this.metrics.incrementCounter(WEBHOOK_OUTBOUND_METRICS.delivered, {
          event: delivery.eventType,
        });
        this.metrics.observeHistogram(
          WEBHOOK_OUTBOUND_METRICS.duration,
          Date.now() - timestamp * 1000,
          { event: delivery.eventType },
        );
        return {
          deliveryId,
          status: WebhookDeliveryStatusEnum.DELIVERED,
          responseStatusCode: statusCode,
        };
      }

      return this.handleFailure(delivery, statusCode, `HTTP ${statusCode}`);
    } catch (err: any) {
      return this.handleFailure(
        delivery,
        null,
        err?.message ?? 'network error',
      );
    }
  }

  /** Records a failed attempt and schedules the retry (or dead-letter). */
  private async handleFailure(
    delivery: WebhookDelivery,
    responseStatusCode: number | null,
    errorText: string,
  ): Promise<OutboundDeliveryResult> {
    const outcome = await this.dispatcher.scheduleRetry(
      delivery,
      responseStatusCode,
      errorText,
    );
    return {
      deliveryId: delivery.id,
      status:
        outcome === 'dead_lettered'
          ? WebhookDeliveryStatusEnum.DEAD_LETTERED
          : WebhookDeliveryStatusEnum.RETRYING,
      responseStatusCode,
    };
  }
}
