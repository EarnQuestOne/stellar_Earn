
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  /**
   * Send notification when submission is approved
   */
  async sendSubmissionApproved(
    userId: string,
    questTitle: string,
    rewardAmount: number,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      type: NotificationType.SUBMISSION_APPROVED,
      title: 'Submission Approved! 🎉',
      message: `Your submission for "${questTitle}" has been approved. You will receive ${rewardAmount} tokens.`,
      metadata: {
        questTitle,
        rewardAmount,
      },
    });

    const savedNotification =
      await this.notificationsRepository.save(notification);

    this.logger.log(
      `Sent approval notification to user ${userId} for quest "${questTitle}"`,
    );

    // TODO(optional): Implement actual notification delivery mechanisms to trigger:
    // - Email notification
    // - Push notification
    // - Webhook
    // - WebSocket event

    return savedNotification;
  }

  /**
   * Send notification when submission is rejected
   */
  async sendSubmissionRejected(
    userId: string,
    questTitle: string,
    reason: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      type: NotificationType.SUBMISSION_REJECTED,
      title: 'Submission Update',
      message: `Your submission for "${questTitle}" was not approved. Reason: ${reason}`,
      metadata: {
        questTitle,
        reason,
      },
    });

    const savedNotification =
      await this.notificationsRepository.save(notification);

    this.logger.log(
      `Sent rejection notification to user ${userId} for quest "${questTitle}"`,
    );

    return savedNotification;
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
    await this.notificationsRepository.update(notificationId, {
      read: true,
      readAt: new Date(),
    });
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read = false')
      .execute();
  }
}
