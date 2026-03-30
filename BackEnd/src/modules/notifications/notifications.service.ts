import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notificationPreference.entity';
import { NotificationLog, DeliveryStatus } from './entities/notification-log.entity';
import { ChannelType } from './channels/notification-channel.interface';
import { NotificationTemplateService, NotificationTemplateType } from './templates/notification-template.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationLog)
    private logRepository: Repository<NotificationLog>,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
    private readonly templateService: NotificationTemplateService,
  ) {}

  /**
   * Send notification with preference check and multi-channel support
   */
  async send(
    userId: string,
    type: NotificationType,
    data: any,
    priority: NotificationPriority = NotificationPriority.NORMAL,
  ): Promise<Notification> {
    // 1. Get or create notification
    const title = data.title || this.getDefaultTitle(type);
    const message = this.templateService.render(type as unknown as NotificationTemplateType, data);

    const notification = this.notificationsRepository.create({
      userId,
      type,
      priority,
      title,
      message,
      metadata: data,
    });

    const savedNotification = await this.notificationsRepository.save(notification);

    // 2. Check user preferences
    const preference = await this.preferenceRepository.findOne({
      where: { userId, type, enabled: true },
    });

    const enabledChannels = preference 
      ? preference.enabledChannels 
      : [ChannelType.IN_APP]; // Default to in-app if no preference set

    // 3. Queue delivery for each enabled channel
    for (const channel of enabledChannels) {
      await this.queueDelivery(savedNotification, channel);
    }

    return savedNotification;
  }

  private async queueDelivery(notification: Notification, channel: ChannelType) {
    // Create initial log entry
    const log = this.logRepository.create({
      notificationId: notification.id,
      channel,
      status: DeliveryStatus.PENDING,
    });
    const savedLog = await this.logRepository.save(log);

    // Add to BullMq queue
    await this.notificationQueue.add(
      'deliver',
      {
        notificationId: notification.id,
        channel,
        logId: savedLog.id,
      },
      {
        priority: this.getBullPriority(notification.priority),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  private getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUBMISSION_APPROVED: return 'Submission Approved! 🎉';
      case NotificationType.SUBMISSION_REJECTED: return 'Submission Update';
      case NotificationType.QUEST_UPDATE: return 'Quest Update';
      default: return 'Notification';
    }
  }

  private getBullPriority(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT: return 1;
      case NotificationPriority.HIGH: return 2;
      case NotificationPriority.NORMAL: return 3;
      case NotificationPriority.LOW: return 4;
      default: return 3;
    }
  }

  /**
   * Send notification when submission is approved
   */
  async sendSubmissionApproved(
    userId: string,
    questTitle: string,
    rewardAmount: number,
  ): Promise<Notification> {
    return this.send(userId, NotificationType.SUBMISSION_APPROVED, {
      questTitle,
      rewardAmount,
    });
  }

  /**
   * Send notification when submission is rejected
   */
  async sendSubmissionRejected(
    userId: string,
    questTitle: string,
    reason: string,
  ): Promise<Notification> {
    return this.send(userId, NotificationType.SUBMISSION_REJECTED, {
      questTitle,
      reason,
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationsRepository.update(notificationId, {
      read: true,
      readAt: new Date(),
    });

    // Update logs to READ status for IN_APP channel
    await this.logRepository.update(
      { notificationId, channel: ChannelType.IN_APP },
      { status: DeliveryStatus.READ }
    );
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const unreadNotifications = await this.notificationsRepository.find({
      where: { userId, read: false }
    });

    for (const notification of unreadNotifications) {
      await this.markAsRead(notification.id);
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreference(
    userId: string, 
    type: NotificationType, 
    enabledChannels: ChannelType[],
    enabled: boolean = true
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({ where: { userId, type } });

    if (preference) {
      preference.enabledChannels = enabledChannels;
      preference.enabled = enabled;
    } else {
      preference = this.preferenceRepository.create({
        userId,
        type,
        enabledChannels,
        enabled,
      });
    }

    return this.preferenceRepository.save(preference);
  }
}
