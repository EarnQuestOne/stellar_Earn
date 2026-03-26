import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import {
  NotificationChannel,
  ChannelType,
  DeliveryResult,
} from './notification-channel.interface';

@Injectable()
export class InAppChannel implements NotificationChannel {
  private readonly logger = new Logger(InAppChannel.name);
  readonly type = ChannelType.IN_APP;

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async send(notification: Notification): Promise<DeliveryResult> {
    try {
      this.logger.log(`Sending in-app notification to user ${notification.userId}`);
      // In-app notifications are basically the records in the DB
      // The notification is already saved by the time this is called, 
      // or we can handle the saving logic here if we shift it.
      // For now, let's assume the notification record exists.
      
      return {
        success: true,
        channel: this.type,
      };
    } catch (error) {
      this.logger.error(`Failed to send in-app notification: ${error.message}`);
      return {
        success: false,
        channel: this.type,
        error: error.message,
        retryable: true,
      };
    }
  }
}
