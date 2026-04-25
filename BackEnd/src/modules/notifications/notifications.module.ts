import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notificationPreference.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { User } from '../users/entities/user.entity';

import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { WebhookChannel } from './channels/webhook.channel';
import { NotificationTemplateService } from './templates/notification-template.service';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      NotificationLog,
      User,
    ]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    NotificationsService,
    InAppChannel,
    EmailChannel,
    PushChannel,
    WebhookChannel,
    NotificationTemplateService,
    NotificationAnalyticsService,
    NotificationsProcessor,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationAnalyticsService],
})
export class NotificationsModule {}
