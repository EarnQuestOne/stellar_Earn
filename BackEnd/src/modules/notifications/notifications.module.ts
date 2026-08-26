import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationTemplateService } from './template/notification-template.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      NotificationLog,
    ]),
    JobsModule,
  ],
  providers: [NotificationsService, NotificationTemplateService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
