import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  ChannelType,
  DeliveryResult,
} from './notification-channel.interface';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class EmailChannel implements NotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);
  readonly type = ChannelType.EMAIL;

  async send(notification: Notification, recipient: any): Promise<DeliveryResult> {
    try {
      this.logger.log(`Sending email notification to ${recipient.email}`);
      
      // Placeholder for SendGrid/Mailgun integration
      // if (!process.env.SENDGRID_API_KEY) {
      //   throw new Error('SendGrid API key not found');
      // }
      
      return {
        success: true,
        channel: this.type,
        providerResponse: { messageId: 'placeholder-email-id' },
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return {
        success: false,
        channel: this.type,
        error: error.message,
        retryable: true,
      };
    }
  }
}
