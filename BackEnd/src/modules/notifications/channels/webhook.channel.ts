import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  ChannelType,
  DeliveryResult,
} from './notification-channel.interface';
import { Notification } from '../entities/notification.entity';
import { PooledHttpClientService } from '../../../common/http-client/http-client.service';

@Injectable()
export class WebhookChannel implements NotificationChannel {
  private readonly logger = new Logger(WebhookChannel.name);
  readonly type = ChannelType.WEBHOOK;

  constructor(private readonly httpClient: PooledHttpClientService) {}

  async send(
    notification: Notification,
    recipient: any,
  ): Promise<DeliveryResult> {
    try {
      if (!recipient.webhookUrl) {
        return {
          success: false,
          channel: this.type,
          error: 'No webhook URL provided',
          retryable: false,
        };
      }

      this.logger.log(
        `Sending webhook notification to ${recipient.webhookUrl}`,
      );

      const client = this.httpClient.create('medium');
      const response = await client.post(recipient.webhookUrl, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      });

      return {
        success: true,
        channel: this.type,
        providerResponse: { status: response.status },
      };
    } catch (error) {
      this.logger.error(`Failed to send webhook: ${error.message}`);
      return {
        success: false,
        channel: this.type,
        error: error.message,
        retryable: true,
      };
    }
  }
}
