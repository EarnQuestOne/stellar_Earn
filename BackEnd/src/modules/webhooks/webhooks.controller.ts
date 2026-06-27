import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  WebhooksService,
  WebhookEvent,
  WebhookResponse,
} from './webhooks.service';
import {
  verifyWebhookSignatureWithTimestamp,
  WEBHOOK_MAX_TIMESTAMP_AGE_MS,
} from './utils/signature';
import {
  WebhookResponseDto,
  WebhookHealthResponseDto,
} from './dto/webhook-response.dto';
import { TraceService } from '../trace/trace.service';
import { TraceIdUtil } from '../trace/trace-id.util';
import {
  TraceContextStorage,
  TraceContext,
} from '../trace/trace-context.storage';
import { TraceStatus } from '../trace/trace.types';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly traceService: TraceService,
  ) {}

  private verifyWebhookRequest(
    payload: any,
    signature: string | undefined,
    secret: string | undefined,
    provider: string,
    timestampHeader: string | undefined,
  ): void {
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    if (!timestampHeader) {
      throw new UnauthorizedException('Missing webhook timestamp');
    }
    const result = verifyWebhookSignatureWithTimestamp(
      payload,
      signature,
      secret || '',
      provider,
      timestampHeader,
    );
    if (!result.valid) {
      throw new UnauthorizedException(
        result.reason || 'Invalid webhook signature',
      );
    }
  }

  /**
   * GitHub webhook endpoint
   * Handles GitHub events like push, pull_request, issues
   */
  @Post('github')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GitHub webhook events' })
  @ApiConsumes('application/json')
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or invalid signature',
  })
  async handleGithubWebhook(
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
  ): Promise<WebhookResponse> {
    if (!eventType)
      throw new BadRequestException('Missing X-GitHub-Event header');
    if (!deliveryId)
      throw new BadRequestException('Missing X-GitHub-Delivery header');

    this.verifyWebhookRequest(
      payload,
      signature,
      process.env.GITHUB_WEBHOOK_SECRET,
      'github',
      timestamp,
    );

    const traceId = TraceIdUtil.generate(deliveryId);
    const traceCtx: TraceContext = { traceId, webhookEventId: deliveryId };

    return TraceContextStorage.run(traceCtx, async () => {
      this.logger.log(
        `[${traceId}] Received GitHub webhook: ${eventType} (${deliveryId})`,
      );

      await this.traceService.createTrace({
        traceId,
        webhookEventId: deliveryId,
        questId: payload?.questId ?? 'unknown',
        submitterAddress: payload?.submitterAddress ?? 'unknown',
      });

      try {
        const event: WebhookEvent = {
          id: deliveryId,
          type: eventType,
          payload,
          timestamp: new Date(),
          source: 'github',
          signature,
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        };

        const response = await this.webhooksService.processWebhook(event);

        if (!response.success) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            response.message,
          );
          this.logger.warn(
            `[${traceId}] GitHub webhook processing failed: ${response.message}`,
          );
          throw new UnauthorizedException(response.message);
        }

        // Link on-chain tx hash if the service returns one
        if (response.txHash) {
          await this.traceService.linkOnchain({
            traceId,
            txHash: response.txHash,
            status: TraceStatus.SUBMITTED,
            message: `GitHub event '${eventType}' submitted on-chain.`,
            meta: { source: 'github', eventType },
          });
        } else {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.CONFIRMED,
            `GitHub event '${eventType}' processed successfully.`,
          );
        }

        return response;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            `Unhandled error: ${error.message}`,
            { error: error.message },
          );
        }
        this.logger.error(
          `[${traceId}] GitHub webhook error: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });
  }

  /**
   * Generic API verification webhook endpoint
   * Handles custom verification events from external services
   */
  @Post('api-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'API verification webhook endpoint' })
  @ApiConsumes('application/json')
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({
    status: 200,
    description: 'Verification processed',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook headers or payload',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handleApiVerificationWebhook(
    @Body() payload: any,
    @Headers('x-event-type') eventType: string,
    @Headers('x-webhook-id') webhookId: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-webhook-timestamp') timestamp: string,
  ): Promise<WebhookResponse> {
    if (!eventType)
      throw new BadRequestException('Missing X-Event-Type header');
    if (!webhookId)
      throw new BadRequestException('Missing X-Webhook-ID header');

    const apiSignature = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    this.verifyWebhookRequest(
      payload,
      apiSignature,
      process.env.API_WEBHOOK_SECRET,
      'api',
      timestamp,
    );

    const traceId = TraceIdUtil.generate(webhookId);
    const traceCtx: TraceContext = { traceId, webhookEventId: webhookId };

    return TraceContextStorage.run(traceCtx, async () => {
      this.logger.log(
        `[${traceId}] Received API verification webhook: ${eventType} (${webhookId})`,
      );

      await this.traceService.createTrace({
        traceId,
        webhookEventId: webhookId,
        questId: payload?.questId ?? 'unknown',
        submitterAddress: payload?.submitterAddress ?? 'unknown',
      });

      try {
        const event: WebhookEvent = {
          id: webhookId,
          type: eventType,
          payload,
          timestamp: new Date(),
          source: 'api',
          signature: apiSignature,
          secret: process.env.API_WEBHOOK_SECRET,
        };

        const response = await this.webhooksService.processWebhook(event);

        if (!response.success) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            response.message,
          );
          this.logger.warn(
            `[${traceId}] API webhook processing failed: ${response.message}`,
          );
          throw new UnauthorizedException(response.message);
        }

        if (response.txHash) {
          await this.traceService.linkOnchain({
            traceId,
            txHash: response.txHash,
            status: TraceStatus.SUBMITTED,
            message: `API event '${eventType}' submitted on-chain.`,
            meta: { source: 'api', eventType },
          });
        } else {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.CONFIRMED,
            `API event '${eventType}' processed successfully.`,
          );
        }

        return response;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            `Unhandled error: ${error.message}`,
            { error: error.message },
          );
        }
        this.logger.error(
          `[${traceId}] API webhook error: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });
  }

  /**
   * Generic webhook endpoint for other external services
   * Note: This should be placed after specific routes to avoid conflicts
   */
  @Post('generic/:service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generic webhook receiver for external services' })
  @ApiConsumes('application/json')
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handleGenericWebhook(
    @Body() payload: any,
    @Headers() headers: any,
    @Headers('x-signature') signature: string,
    @Headers('x-event-type') eventType: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Param('service') service: string,
  ): Promise<WebhookResponse> {
    const eventId = this.generateEventId();
    const traceId = TraceIdUtil.generate(eventId);
    const traceCtx: TraceContext = { traceId, webhookEventId: eventId };

    this.verifyWebhookRequest(
      payload,
      signature,
      process.env[`${service.toUpperCase()}_WEBHOOK_SECRET`],
      service,
      timestamp,
    );

    return TraceContextStorage.run(traceCtx, async () => {
      this.logger.log(
        `[${traceId}] Received generic webhook from ${service}: ${eventType}`,
      );

      await this.traceService.createTrace({
        traceId,
        webhookEventId: eventId,
        questId: payload?.questId ?? 'unknown',
        submitterAddress: payload?.submitterAddress ?? 'unknown',
      });

      try {
        const event: WebhookEvent = {
          id: eventId,
          type: eventType || 'unknown',
          payload,
          timestamp: new Date(),
          source: service,
          signature,
          secret: process.env[`${service.toUpperCase()}_WEBHOOK_SECRET`],
        };

        const response = await this.webhooksService.processWebhook(event);

        if (!response.success) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            response.message,
          );
          throw new UnauthorizedException(response.message);
        }

        if (response.txHash) {
          await this.traceService.linkOnchain({
            traceId,
            txHash: response.txHash,
            status: TraceStatus.SUBMITTED,
            message: `Generic event from '${service}' submitted on-chain.`,
            meta: { source: service, eventType },
          });
        } else {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.CONFIRMED,
            `Generic event from '${service}' processed successfully.`,
          );
        }

        return response;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          await this.traceService.appendEvent(
            traceId,
            TraceStatus.FAILED,
            `Unhandled error: ${error.message}`,
            { error: error.message },
          );
        }
        this.logger.error(
          `[${traceId}] Generic webhook error: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });
  }

  /**
   * Health check endpoint for webhook services
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook-specific health check' })
  @ApiResponse({
    status: 200,
    description: 'Service healthy',
    type: WebhookHealthResponseDto,
  })
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
