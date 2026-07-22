import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { verifyWebhookSignature } from './utils/signature';
import { currentTraceId } from '../trace/trace-context.storage';
import { BulkheadService } from '../../common/services/bulkhead.service';
import {
  FailedWebhookEvent,
  FailedWebhookStatus,
} from './entities/failed-webhook-event.entity';
import {
  DEFAULT_WEBHOOK_MAX_ATTEMPTS,
  computeWebhookBackoffDelayMs,
} from './utils/retry-backoff';

export interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  signature?: string;
  secret?: string;
}

export interface WebhookResponse {
  success: boolean;
  eventId: string;
  message: string;
  processedAt: Date;
  data?: any;
  /** Stellar transaction hash, populated when on-chain execution occurs. */
  txHash?: string;
  /** Canonical trace ID linking this webhook to its on-chain execution. */
  traceId?: string;
}

/** Failure reasons that will never succeed on retry — dead-letter immediately. */
const NON_RETRYABLE_MESSAGES = [
  'Invalid webhook signature',
  'Unsupported webhook source',
];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly githubHandler: GithubHandler,
    private readonly apiHandler: ApiHandler,
    private readonly configService: ConfigService,
    private readonly bulkheadService: BulkheadService,
    @InjectRepository(FailedWebhookEvent)
    private readonly failedWebhookRepository: Repository<FailedWebhookEvent>,
  ) {}

  async processWebhook(event: WebhookEvent): Promise<WebhookResponse> {
    const response = await this.dispatchWebhook(event);

    if (!response.success) {
      await this.recordFailure(event, response.message);
    } else {
      await this.resolveIfTracked(event.id);
    }

    return response;
  }

  private async dispatchWebhook(event: WebhookEvent): Promise<WebhookResponse> {
    return this.bulkheadService.runWithBulkhead(
      'webhooks',
      () => this.executeWebhook(event),
      this.getWebhookBulkheadOptions(),
    );
  }

  private async executeWebhook(event: WebhookEvent): Promise<WebhookResponse> {
    try {
      this.logger.log(
        `Processing webhook event ${event.id} of type ${event.type} from ${event.source}`,
      );

      // Verify signature if present
      if (event.signature && event.secret) {
        const isValid = verifyWebhookSignature(
          event.payload,
          event.signature,
          event.secret,
          event.source,
        );

        if (!isValid) {
          this.logger.warn(`Invalid signature for webhook ${event.id}`);
          return {
            success: false,
            eventId: event.id,
            message: 'Invalid webhook signature',
            processedAt: new Date(),
            traceId: currentTraceId(),
          };
        }
      }

      let result: any;

      // Route to appropriate handler based on source
      switch (event.source.toLowerCase()) {
        case 'github':
          result = await this.githubHandler.handleEvent(event);
          break;
        case 'api':
          result = await this.apiHandler.handleEvent(event);
          break;
        default:
          this.logger.warn(`Unsupported webhook source: ${event.source}`);
          return {
            success: false,
            eventId: event.id,
            message: `Unsupported webhook source: ${event.source}`,
            processedAt: new Date(),
            traceId: currentTraceId(),
          };
      }

      this.logger.log(`Successfully processed webhook ${event.id}`);

      return {
        success: true,
        eventId: event.id,
        message: 'Webhook processed successfully',
        processedAt: new Date(),
        data: result,
        // txHash is populated by the handler if an on-chain tx was submitted
        txHash: result?.txHash,
        traceId: currentTraceId(),
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook ${event.id}:`, error.stack);
      return {
        success: false,
        eventId: event.id,
        message: `Failed to process webhook: ${error.message}`,
        processedAt: new Date(),
        traceId: currentTraceId(),
      };
    }
  }

  private getWebhookBulkheadOptions() {
    return {
      maxConcurrent: Number(
        this.configService.get<number | string>(
          'WEBHOOK_BULKHEAD_MAX_CONCURRENT',
          10,
        ),
      ),
      maxQueueSize: Number(
        this.configService.get<number | string>(
          'WEBHOOK_BULKHEAD_MAX_QUEUE_SIZE',
          50,
        ),
      ),
    };
  }

  /**
   * Persists a failed webhook so it isn't dropped. Non-retryable failures
   * (bad signature, unsupported source) go straight to the dead-letter
   * state; everything else is scheduled for a backoff retry.
   */
  private async recordFailure(
    event: WebhookEvent,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    const retryable = this.isRetryableFailure(reason);
    const errorEntry = { error: reason, attemptedAt: now.toISOString() };

    const existing = await this.failedWebhookRepository.findOne({
      where: { eventId: event.id },
      order: { createdAt: 'DESC' },
    });

    if (existing && existing.status !== FailedWebhookStatus.SUCCEEDED) {
      existing.failureReason = reason;
      existing.errorHistory = [...(existing.errorHistory ?? []), errorEntry];
      existing.lastAttemptAt = now;
      if (retryable) {
        existing.attempts += 1;
      }
      this.applyFailureOutcome(existing, retryable, now);
      await this.failedWebhookRepository.save(existing);
      return;
    }

    const attempts = retryable ? 1 : 0;
    const exhausted = retryable && attempts >= DEFAULT_WEBHOOK_MAX_ATTEMPTS;
    const status =
      !retryable || exhausted
        ? FailedWebhookStatus.DEAD_LETTER
        : FailedWebhookStatus.PENDING;

    const record = this.failedWebhookRepository.create({
      eventId: event.id,
      type: event.type,
      source: event.source,
      payload: event.payload,
      signature: event.signature ?? null,
      failureReason: reason,
      errorHistory: [errorEntry],
      attempts,
      maxAttempts: DEFAULT_WEBHOOK_MAX_ATTEMPTS,
      lastAttemptAt: now,
      status,
      nextRetryAt:
        status === FailedWebhookStatus.PENDING
          ? new Date(now.getTime() + computeWebhookBackoffDelayMs(attempts))
          : null,
    });

    await this.failedWebhookRepository.save(record);
  }

  /** Marks any tracked failure for this event as resolved once it succeeds. */
  private async resolveIfTracked(eventId: string): Promise<void> {
    const existing = await this.failedWebhookRepository.findOne({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });

    if (
      !existing ||
      existing.status === FailedWebhookStatus.SUCCEEDED ||
      existing.status === FailedWebhookStatus.DEAD_LETTER
    ) {
      return;
    }

    existing.status = FailedWebhookStatus.SUCCEEDED;
    existing.resolvedAt = new Date();
    existing.nextRetryAt = null;
    await this.failedWebhookRepository.save(existing);
  }

  private isRetryableFailure(reason: string): boolean {
    return !NON_RETRYABLE_MESSAGES.some((prefix) => reason.startsWith(prefix));
  }

  private resolveSecretForSource(source: string): string | undefined {
    switch (source.toLowerCase()) {
      case 'github':
        return process.env.GITHUB_WEBHOOK_SECRET;
      case 'api':
        return process.env.API_WEBHOOK_SECRET;
      default:
        return process.env[`${source.toUpperCase()}_WEBHOOK_SECRET`];
    }
  }

  /** @returns `true` when the record was moved to the dead-letter state. */
  private applyFailureOutcome(
    record: FailedWebhookEvent,
    retryable: boolean,
    now: Date,
  ): boolean {
    if (!retryable || record.attempts >= record.maxAttempts) {
      record.status = FailedWebhookStatus.DEAD_LETTER;
      record.nextRetryAt = null;
      return true;
    }

    record.status = FailedWebhookStatus.PENDING;
    record.nextRetryAt = new Date(
      now.getTime() + computeWebhookBackoffDelayMs(record.attempts),
    );
    return false;
  }

  /**
   * Re-attempts processing of a previously failed webhook, identified by its
   * original event ID. Increments the attempt counter and applies backoff;
   * moves the record to the dead-letter state once `maxRetries` is reached
   * or the underlying handler reports a non-retryable failure.
   *
   * @returns `true` if the webhook is now successfully processed (or was
   *   already resolved), `false` otherwise.
   */
  async retryFailedWebhook(
    eventId: string,
    maxRetries = DEFAULT_WEBHOOK_MAX_ATTEMPTS,
  ): Promise<boolean> {
    const record = await this.failedWebhookRepository.findOne({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      this.logger.warn(`No failed webhook record found for event ${eventId}`);
      return false;
    }

    if (record.status === FailedWebhookStatus.SUCCEEDED) {
      return true;
    }

    if (record.status === FailedWebhookStatus.DEAD_LETTER) {
      this.logger.warn(
        `Webhook ${eventId} is dead-lettered after ${record.attempts} attempt(s); refusing to retry`,
      );
      return false;
    }

    record.maxAttempts = maxRetries;

    if (record.attempts >= record.maxAttempts) {
      record.status = FailedWebhookStatus.DEAD_LETTER;
      record.nextRetryAt = null;
      await this.failedWebhookRepository.save(record);
      this.logger.warn(
        `Webhook ${eventId} exhausted ${record.attempts} attempt(s); moved to dead-letter`,
      );
      return false;
    }

    this.logger.log(
      `Retrying webhook ${eventId} (attempt ${record.attempts + 1}/${record.maxAttempts})`,
    );

    const now = new Date();
    record.status = FailedWebhookStatus.RETRYING;
    record.attempts += 1;
    record.lastAttemptAt = now;
    await this.failedWebhookRepository.save(record);

    const event: WebhookEvent = {
      id: record.eventId,
      type: record.type,
      payload: record.payload,
      timestamp: now,
      source: record.source,
      signature: record.signature ?? undefined,
      secret: this.resolveSecretForSource(record.source),
    };

    const response = await this.dispatchWebhook(event);

    if (response.success) {
      record.status = FailedWebhookStatus.SUCCEEDED;
      record.resolvedAt = now;
      record.nextRetryAt = null;
      await this.failedWebhookRepository.save(record);
      this.logger.log(
        `Webhook ${eventId} succeeded on retry attempt ${record.attempts}`,
      );
      return true;
    }

    record.failureReason = response.message;
    record.errorHistory = [
      ...(record.errorHistory ?? []),
      { error: response.message, attemptedAt: now.toISOString() },
    ];
    const deadLettered = this.applyFailureOutcome(
      record,
      this.isRetryableFailure(response.message),
      now,
    );
    await this.failedWebhookRepository.save(record);

    if (deadLettered) {
      this.logger.warn(
        `Webhook ${eventId} moved to dead-letter after ${record.attempts} attempt(s): ${response.message}`,
      );
    }

    return false;
  }

  /** Lists persisted failed webhook events, optionally filtered by status. */
  async listFailedWebhooks(
    status?: FailedWebhookStatus,
  ): Promise<FailedWebhookEvent[]> {
    return this.failedWebhookRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Fetches the most recent failed-webhook record for a given event ID. */
  async getFailedWebhook(eventId: string): Promise<FailedWebhookEvent | null> {
    return this.failedWebhookRepository.findOne({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  getSupportedSources(): string[] {
    return ['github', 'api'];
  }
}
