import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationLog, DeliveryStatus } from './entities/notification-log.entity';
import { ChannelType } from './channels/notification-channel.interface';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly notificationPreferencesRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogsRepository: Repository<NotificationLog>,
  ) {}

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsRepository.count({
      where: { userId, read: false },
    });

    return { unreadCount };
  }

  async markAllAsRead(
    userId: string,
  ): Promise<{ notificationsUpdated: number; logsUpdated: number }> {
    const now = new Date();
    const notificationsResult = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt: now })
      .where('userId = :userId', { userId })
      .andWhere('read = false')
      .execute();

    const notificationsUpdated =
      notificationsResult.affected ?? notificationsResult.raw?.length ?? 0;

    if (notificationsUpdated === 0) {
      return { notificationsUpdated: 0, logsUpdated: 0 };
    }

    const notificationIds = (notificationsResult.raw ?? [])
      .map((row: { id?: string }) => row.id)
      .filter((id: string | undefined): id is string => Boolean(id));

    const logsResult = await this.notificationLogsRepository
      .createQueryBuilder()
      .update(NotificationLog)
      .set({ status: DeliveryStatus.READ })
      .where('notificationId IN (:...notificationIds)', { notificationIds })
      .execute();

    return {
      notificationsUpdated,
      logsUpdated: logsResult.affected ?? 0,
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.notificationPreferencesRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async upsertPreference(
    userId: string,
    type: NotificationType,
    enabledChannels: ChannelType[] = [ChannelType.IN_APP],
    enabled = true,
  ): Promise<NotificationPreference> {
    const existing = await this.notificationPreferencesRepository.findOne({
      where: { userId, type },
    });

    if (existing) {
      existing.enabledChannels = enabledChannels;
      existing.enabled = enabled;
      return this.notificationPreferencesRepository.save(existing);
    }

    const preference = this.notificationPreferencesRepository.create({
      userId,
      type,
      enabledChannels,
      enabled,
    });

    return this.notificationPreferencesRepository.save(preference);
  }
}
