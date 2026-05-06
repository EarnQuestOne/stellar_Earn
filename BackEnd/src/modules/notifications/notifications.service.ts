<<<<<<< HEAD
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
=======
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
<<<<<<< HEAD
import { NotificationPreference } from './entities/notificationPreference.entity';
import { NotificationLog, DeliveryStatus } from './entities/notification-log.entity';
import { ChannelType } from './channels/notification-channel.interface';
import { NotificationTemplateService, NotificationTemplateType } from './templates/notification-template.service';
=======
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  encodeCursor,
  decodeCursor,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
<<<<<<< HEAD
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
=======
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  // ─── Send helpers (called by event listeners) ──────────────────────────────

>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
  async sendSubmissionApproved(
    userId: string,
    questTitle: string,
    rewardAmount: number,
  ): Promise<Notification> {
<<<<<<< HEAD
    return this.send(userId, NotificationType.SUBMISSION_APPROVED, {
      questTitle,
      rewardAmount,
    });
=======
    const notification = this.notificationsRepository.create({
      userId,
      type: NotificationType.SUBMISSION_APPROVED,
      priority: NotificationPriority.HIGH,
      title: 'Submission Approved! 🎉',
      message: `Your submission for "${questTitle}" has been approved. You will receive ${rewardAmount} tokens.`,
      metadata: { questTitle, rewardAmount },
    });

    const saved = await this.notificationsRepository.save(notification);
    this.logger.log(
      `Sent approval notification to user ${userId} for quest "${questTitle}"`,
    );
    return saved;
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
  }

  async sendSubmissionRejected(
    userId: string,
    questTitle: string,
    reason: string,
  ): Promise<Notification> {
<<<<<<< HEAD
    return this.send(userId, NotificationType.SUBMISSION_REJECTED, {
      questTitle,
      reason,
    });
=======
    const notification = this.notificationsRepository.create({
      userId,
      type: NotificationType.SUBMISSION_REJECTED,
      priority: NotificationPriority.NORMAL,
      title: 'Submission Update',
      message: `Your submission for "${questTitle}" was not approved. Reason: ${reason}`,
      metadata: { questTitle, reason },
    });

    const saved = await this.notificationsRepository.save(notification);
    this.logger.log(
      `Sent rejection notification to user ${userId} for quest "${questTitle}"`,
    );
    return saved;
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
  }

  // ─── List (cursor-paginated) ───────────────────────────────────────────────

  /**
   * Returns cursor-paginated notifications for a user, newest first.
   *
   * Previously `getUserNotifications(userId, cursor?, limit?)` used a raw
   * ISO timestamp as the cursor which is insecure and non-opaque.
   * Now uses base64url-encoded { id, createdAt } via encodeCursor/decodeCursor.
   *
   * Controller calls this as: findByUser(user.id, queryDto)
   */
  async findByUser(
    userId: string,
    dto: NotificationQueryDto,
  ): Promise<PaginatedResponseDto<Notification>> {
    const limit = dto.limit ?? 20;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC');

    // Optional unread filter
    if (dto.unreadOnly) {
      qb.andWhere('notification.read = false');
    }

    // Cursor filter — compound condition handles same-millisecond rows
    if (dto.cursor) {
      const decoded = decodeCursor(dto.cursor);
      if (decoded?.createdAt && decoded?.id) {
        qb.andWhere(
          '(notification.createdAt < :cv OR (notification.createdAt = :cv AND notification.id < :idv))',
          { cv: decoded.createdAt, idv: decoded.id },
        );
      }
    }

    // Fetch one extra to detect whether a next page exists
    qb.take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return new PaginatedResponseDto<Notification>(data, nextCursor);
  }

  // ─── Unread count ──────────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsRepository.count({
      where: { userId, read: false },
    });
    return { unreadCount };
  }

  // ─── Mark as read ──────────────────────────────────────────────────────────

  /**
   * Mark a single notification as read.
   * Verifies ownership before updating — the old signature only took
   * notificationId which allowed any authenticated user to mark any
   * notification as read.
   *
   * Controller calls this as: markAsRead(id, user.id)
   */
<<<<<<< HEAD
  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Notification not found');
=======
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this notification',
      );
    }
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)

    await this.notificationsRepository.update(notificationId, {
      read: true,
      readAt: new Date(),
    });

<<<<<<< HEAD
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
    // Batch-update notifications and the matching IN_APP delivery logs in two
    // queries instead of issuing 2N queries inside a per-notification loop.
    const readAt = new Date();

    const updateResult = await this.notificationsRepository
=======
    return { success: true };
  }

  // ─── Mark all as read ──────────────────────────────────────────────────────

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt })
      .where('userId = :userId', { userId })
      .andWhere('read = :read', { read: false })
      .returning(['id'])
      .execute();

    const updatedIds = (
      updateResult.raw as Array<{ id: string }> | undefined
    )?.map((row) => row.id);

    if (!updatedIds || updatedIds.length === 0) {
      return;
    }

    await this.logRepository
      .createQueryBuilder()
      .update(NotificationLog)
      .set({ status: DeliveryStatus.READ })
      .where('notificationId IN (:...ids)', { ids: updatedIds })
      .andWhere('channel = :channel', { channel: ChannelType.IN_APP })
      .execute();

    return { updated: result.affected ?? 0 };
  }

<<<<<<< HEAD
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
=======
  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Delete a notification, verifying the requesting user owns it.
   * Controller calls this as: deleteNotification(id, user.id)
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this notification',
      );
    }

    await this.notificationsRepository.remove(notification);
  }
}
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
