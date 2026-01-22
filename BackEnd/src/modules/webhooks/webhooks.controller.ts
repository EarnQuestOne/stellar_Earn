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
import { WebhooksService, WebhookEvent, WebhookResponse } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * GitHub webhook endpoint
   * Handles GitHub events like push, pull_request, issues
   */
  @Post('github')
  @HttpCode(HttpStatus.OK)
  async handleGithubWebhook(
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers() headers: any,
  ): Promise<WebhookResponse> {
    try {
      this.logger.log(`Received GitHub webhook: ${eventType} (${deliveryId})`);

      // Validate required headers
      if (!eventType) {
        throw new BadRequestException('Missing X-GitHub-Event header');
      }

      if (!deliveryId) {
        throw new BadRequestException('Missing X-GitHub-Delivery header');
      }

      // Create webhook event
      const event: WebhookEvent = {
        id: deliveryId,
        type: eventType,
        payload: payload,
        timestamp: new Date(),
        source: 'github',
        signature: signature,
        secret: process.env.GITHUB_WEBHOOK_SECRET,
      };

      // Process the webhook
      const response = await this.webhooksService.processWebhook(event);

      if (!response.success) {
        this.logger.warn(`GitHub webhook processing failed: ${response.message}`);
        throw new UnauthorizedException(response.message);
      }

      return response;
    } catch (error) {
      this.logger.error(`GitHub webhook error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generic API verification webhook endpoint
   * Handles custom verification events from external services
   */
  @Post('api-verify')
  @HttpCode(HttpStatus.OK)
  async handleApiVerificationWebhook(
    @Body() payload: any,
    @Headers('x-event-type') eventType: string,
    @Headers('x-webhook-id') webhookId: string,
    @Headers('authorization') authHeader: string,
    @Headers() headers: any,
  ): Promise<WebhookResponse> {
    try {
      this.logger.log(`Received API verification webhook: ${eventType} (${webhookId})`);

      // Validate required headers
      if (!eventType) {
        throw new BadRequestException('Missing X-Event-Type header');
      }

      if (!webhookId) {
        throw new BadRequestException('Missing X-Webhook-ID header');
      }

      // Extract signature from Authorization header (Bearer token format)
      let signature: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        signature = authHeader.substring(7);
      }

      // Create webhook event
      const event: WebhookEvent = {
        id: webhookId,
        type: eventType,
        payload: payload,
        timestamp: new Date(),
        source: 'api',
        signature: signature,
        secret: process.env.API_WEBHOOK_SECRET,
      };

      // Process the webhook
      const response = await this.webhooksService.processWebhook(event);

      if (!response.success) {
        this.logger.warn(`API webhook processing failed: ${response.message}`);
        throw new UnauthorizedException(response.message);
      }

      return response;
    } catch (error) {
      this.logger.error(`API webhook error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generic webhook endpoint for other external services
   * Note: This should be placed after specific routes to avoid conflicts
   */
  @Post('generic/:service')
  @HttpCode(HttpStatus.OK)
  async handleGenericWebhook(
    @Body() payload: any,
    @Headers() headers: any,
    @Headers('x-signature') signature: string,
    @Headers('x-event-type') eventType: string,
    @Param('service') service: string,
  ): Promise<WebhookResponse> {
    try {
      this.logger.log(`Received generic webhook from ${service}: ${eventType}`);

      const event: WebhookEvent = {
        id: this.generateEventId(),
        type: eventType || 'unknown',
        payload: payload,
        timestamp: new Date(),
        source: service,
        signature: signature,
        secret: process.env[`${service.toUpperCase()}_WEBHOOK_SECRET`],
      };

      const response = await this.webhooksService.processWebhook(event);

      if (!response.success) {
        throw new UnauthorizedException(response.message);
      }

      return response;
    } catch (error) {
      this.logger.error(`Generic webhook error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Health check endpoint for webhook services
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
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