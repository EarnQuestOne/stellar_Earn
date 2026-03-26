import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { NotificationLog, DeliveryStatus } from './entities/notification-log.entity';
import { ChannelType } from './channels/notification-channel.interface';
import { User } from '../users/entities/user.entity';

import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { WebhookChannel } from './channels/webhook.channel';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly pushChannel: PushChannel,
    private readonly webhookChannel: WebhookChannel,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'deliver') {
      const { notificationId, channel, logId } = job.data;
      
      this.logger.log(`Processing delivery for notification ${notificationId} via ${channel}`);
      
      const notification = await this.notificationRepository.findOne({ 
        where: { id: notificationId } 
      });
      const user = await this.userRepository.findOne({ 
        where: { id: notification.userId } 
      });
      const log = await this.logRepository.findOne({ 
        where: { id: logId } 
      });

      if (!notification || !user || !log) {
        this.logger.error(`Missing data: notification=${!!notification}, user=${!!user}, log=${!!log}`);
        return;
      }

      let result;
      switch (channel) {
        case ChannelType.IN_APP:
          result = await this.inAppChannel.send(notification, user);
          break;
        case ChannelType.EMAIL:
          result = await this.emailChannel.send(notification, user);
          break;
        case ChannelType.PUSH:
          result = await this.pushChannel.send(notification, user);
          break;
        case ChannelType.WEBHOOK:
          result = await this.webhookChannel.send(notification, user);
          break;
        default:
          this.logger.error(`Unsupported channel: ${channel}`);
          return;
      }

      // Update log with result
      log.status = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
      log.providerResponse = result.providerResponse;
      log.error = result.error;
      log.retryCount = job.attemptsMade;
      
      await this.logRepository.save(log);

      if (!result.success && result.retryable) {
        throw new Error(`Failed to deliver via ${channel}: ${result.error}`);
      }
      
      return result;
    }
  }
}
