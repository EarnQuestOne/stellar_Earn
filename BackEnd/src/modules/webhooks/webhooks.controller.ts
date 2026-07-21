import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  WebhooksService,
  WebhookEvent,
  WebhookResponse,
} from './webhooks.service';
import {
  WebhookResponseDto,
  WebhookHealthResponseDto,
  FailedWebhookEventResponseDto,
  RetryWebhookResponseDto,
} from './dto/webhook-response.dto';
import { FailedWebhookStatus } from './entities/failed-webhook-event.entity';
import { TraceService } from '../trace/trace.service';
import { TraceIdUtil } from '../trace/trace-id.util';
import {
  TraceContextStorage,
  TraceContext,
} from '../trace/trace-context.storage';
import { TraceStatus } from '../trace/trace.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly traceService: TraceService,
  ) {}

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
  ): Promise<WebhookResponse> {
    if (!eventType)
      throw new BadRequestException('Missing X-GitHub-Event header');
    if (!deliveryId)
      throw new BadRequestException('Missing X-GitHub-Delivery header');

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
  ): Promise<WebhookResponse> {
    if (!eventType)
      throw new BadRequestException('Missing X-Event-Type header');
    if (!webhookId)
      throw new BadRequestException('Missing X-Webhook-ID header');

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
        let signature: string | undefined;
        if (authHeader?.startsWith('Bearer ')) {
          signature = authHeader.substring(7);
        }

        const event: WebhookEvent = {
          id: webhookId,
          type: eventType,
          payload,
          timestamp: new Date(),
          source: 'api',
          signature,
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
    @Param('service') service: string,
  ): Promise<WebhookResponse> {
    const eventId = this.generateEventId();
    const traceId = TraceIdUtil.generate(eventId);
    const traceCtx: TraceContext = { traceId, webhookEventId: eventId };

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
   * List persisted failed webhook events (admin only)
   */
  @Get('admin/failed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List failed webhook events (Admin only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: FailedWebhookStatus,
    description: 'Filter by retry lifecycle status',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed webhook events retrieved successfully',
    type: [FailedWebhookEventResponseDto],
  })
  async listFailedWebhooks(
    @Query('status') status?: FailedWebhookStatus,
  ): Promise<FailedWebhookEventResponseDto[]> {
    return this.webhooksService.listFailedWebhooks(status);
  }

  /**
   * Inspect a single failed webhook event (admin only)
   */
  @Get('admin/failed/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a failed webhook event (Admin only)' })
  @ApiParam({ name: 'eventId', description: 'Original webhook event ID' })
  @ApiResponse({
    status: 200,
    description: 'Failed webhook event retrieved successfully',
    type: FailedWebhookEventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No failed webhook found' })
  async getFailedWebhook(
    @Param('eventId') eventId: string,
  ): Promise<FailedWebhookEventResponseDto> {
    const record = await this.webhooksService.getFailedWebhook(eventId);
    if (!record) {
      throw new NotFoundException(
        `No failed webhook found for event ${eventId}`,
      );
    }
    return record;
  }

  /**
   * Manually trigger a retry of a failed webhook event (admin only)
   */
  @Post('admin/failed/:eventId/retry')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed webhook event (Admin only)' })
  @ApiParam({ name: 'eventId', description: 'Original webhook event ID' })
  @ApiResponse({
    status: 200,
    description: 'Retry attempted',
    type: RetryWebhookResponseDto,
  })
  async retryFailedWebhook(
    @Param('eventId') eventId: string,
  ): Promise<RetryWebhookResponseDto> {
    const success = await this.webhooksService.retryFailedWebhook(eventId);
    return { success, eventId };
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
