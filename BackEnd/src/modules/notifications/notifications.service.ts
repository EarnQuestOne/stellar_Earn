import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import {
  NotificationLog,
  DeliveryStatus,
} from './entities/notification-log.entity';
import {
  NotificationTemplateService,
  NotificationTemplateType,
} from './template/notification-template.service';
import { ChannelType } from './channels/notification-channel.interface';
import { MetricsService } from '../../common/services/metrics.service';
import { JobsService } from '../jobs/jobs.service';

/**
 * Deduplication marker for a notification window.
 *
 * Each entry records when the marker was first set and how many
 * suppressed duplicates have arrived since the original.
 */
interface DedupMarker {
  /** Epoch-ms when the marker was first created. */
  createdAt: number;
  /** Number of duplicate notifications suppressed so far. */
  suppressedCount: number;
  /** ID of the original notification that was persisted. */
  originalNotificationId: string;
}

/** Default window (ms) during which identical notifications are collapsed. */
const DEFAULT_DEDUP_WINDOW_MS = 30_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * In-memory dedup map keyed by `userId:type:entityId`.
   *
   * Entries are lazily cleaned up when the window expires. The map is
   * bounded by the number of unique (user, type, entity) tuples that
   * arrive within any single window — in practice this is small because
   * the window is short (default 30 s).
   */
  private readonly dedupMap = new Map<string, DedupMarker>();
  private readonly dedupWindowMs = DEFAULT_DEDUP_WINDOW_MS;

  /** Monotonic counter for dedup suppressions — for metrics. */
  private dedupSuppressedCount = 0;

  /** Monotonic counter for notifications actually sent — for metrics. */
  private notificationsSentCount = 0;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
    private readonly jobsService: JobsService,
    private readonly templateService: NotificationTemplateService,
    private readonly metricsService: MetricsService,
  ) {
    // Register dedup-specific metrics
    this.metricsService.registerCounter(
      'notification_dedup_suppressed_total',
      'Total duplicate notifications suppressed by the dedup window',
    );
    this.metricsService.registerCounter(
      'notification_sent_total',
      'Total notifications persisted and dispatched',
    );
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Core notification dispatch with deduplication.
   *
   * Computes a dedup key from `userId + type + entityId`. If a matching
   * marker exists within the dedup window the notification is suppressed:
   *   - No database row is created.
   *   - No queue jobs are enqueued.
   *   - The suppression count is incremented for metrics.
   *
   * Notifications without an `entityId` are **never** deduplicated (each
   * one is treated as unique) because entity-less notifications represent
   * system-wide broadcasts that should always be delivered.
   *
   * @returns The persisted Notification, or `null` if suppressed by dedup.
   */
  async send(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      entityId?: string;
      priority?: NotificationPriority;
      metadata?: Record<string, unknown>;
      channels?: ChannelType[];
    },
  ): Promise<Notification | null> {
    // ── Dedup gate ──────────────────────────────────────────────────────────
    const entityId = options?.entityId;
    if (entityId) {
      const dedupKey = this.buildDedupKey(userId, type, entityId);
      const suppressed = this.tryDedup(dedupKey);
      if (suppressed) {
        this.logger.debug(
          `Notification suppressed by dedup: key=${dedupKey}, ` +
            `suppressedCount=${suppressed.suppressedCount}`,
        );
        this.dedupSuppressedCount++;
        this.metricsService.incrementCounter(
          'notification_dedup_suppressed_total',
          { type },
        );
        return null;
      }
    }

    // ── Persist ─────────────────────────────────────────────────────────────
    const notification = this.notificationsRepository.create({
      userId,
      type,
      title,
      message,
      priority: options?.priority ?? NotificationPriority.NORMAL,
      entityId: entityId ?? undefined,
      metadata: options?.metadata ?? null,
      read: false,
    });
    const saved = await this.notificationsRepository.save(notification);

    this.notificationsSentCount++;
    this.metricsService.incrementCounter('notification_sent_total', { type });

    // Store dedup marker so subsequent identicals within the window are dropped.
    if (entityId) {
      const dedupKey = this.buildDedupKey(userId, type, entityId);
      this.setDedupMarker(dedupKey, saved.id);
    }

    // ── Dispatch to channels ────────────────────────────────────────────────
    const channels = options?.channels ?? [ChannelType.IN_APP];
    for (const channel of channels) {
      const log = this.logRepository.create({
        notificationId: saved.id,
        channel,
        status: DeliveryStatus.PENDING,
      });
      const savedLog = await this.logRepository.save(log);

      await this.jobsService.addJob('notifications', {
        notificationId: saved.id,
        channel,
        logId: savedLog.id,
      });
    }

    this.logger.log(
      `Notification ${saved.id} dispatched to ${channels.join(',')} ` +
        `for user=${userId} type=${type}`,
    );

    return saved;
  }

  /**
   * Send a submission-approved notification.
   *
   * Called by SubmissionsService after a successful on-chain approval.
   */
  async sendSubmissionApproved(
    userId: string,
    questTitle: string,
    rewardAmount: number | string,
  ): Promise<Notification | null> {
    const title = 'Quest Submission Approved';
    const message = this.templateService.render(
      NotificationTemplateType.SUBMISSION_APPROVED,
      { questTitle, rewardAmount },
    );

    return this.send(
      userId,
      NotificationType.SUBMISSION_APPROVED,
      title,
      message,
      {
        priority: NotificationPriority.HIGH,
        channels: [ChannelType.IN_APP, ChannelType.EMAIL],
      },
    );
  }

  /**
   * Send a submission-rejected notification.
   *
   * Called by SubmissionsService after a rejection is recorded.
   */
  async sendSubmissionRejected(
    userId: string,
    questTitle: string,
    reason: string,
  ): Promise<Notification | null> {
    const title = 'Quest Submission Rejected';
    const message = this.templateService.render(
      NotificationTemplateType.SUBMISSION_REJECTED,
      { questTitle, reason },
    );

    return this.send(
      userId,
      NotificationType.SUBMISSION_REJECTED,
      title,
      message,
      {
        priority: NotificationPriority.NORMAL,
        channels: [ChannelType.IN_APP, ChannelType.EMAIL],
      },
    );
  }

  /**
   * Return the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsRepository.count({
      where: { userId, read: false },
    });
    return { unreadCount };
  }

  /**
   * Mark **all** unread notifications for a user as read in a single
   * batched UPDATE (avoids the N+1 query-per-notification pattern).
   *
   * Also batch-updates any related notification_logs whose status is
   * PENDING or SENT to READ so the delivery record reflects the read
   * state.
   */
  async markAllAsRead(userId: string): Promise<void> {
    // 1. Mark notifications as read and capture affected IDs via RETURNING.
    const notifResult = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt: () => 'CURRENT_TIMESTAMP' })
      .where('userId = :userId', { userId })
      .andWhere('read = :unread', { unread: false })
      .andWhere('"deletedAt" IS NULL')
      .returning('id')
      .execute();

    const ids: string[] =
      notifResult.raw?.map((r: { id: string }) => r.id) ?? [];

    if (ids.length === 0) {
      return; // Nothing to update in logs either.
    }

    // 2. Batch-update corresponding log entries to READ.
    await this.logRepository
      .createQueryBuilder()
      .update(NotificationLog)
      .set({ status: DeliveryStatus.READ })
      .where('notificationId IN (:...ids)', { ids })
      .andWhere('status IN (:...statuses)', {
        statuses: [DeliveryStatus.PENDING, DeliveryStatus.SENT],
      })
      .execute();

    this.logger.log(
      `markAllAsRead: ${ids.length} notifications marked as read for user=${userId}`,
    );
  }

  // ─── Dedup internals ─────────────────────────────────────────────────────

  /**
   * Build a deterministic dedup key from the triple.
   */
  private buildDedupKey(
    userId: string,
    type: NotificationType,
    entityId: string,
  ): string {
    return `${userId}:${type}:${entityId}`;
  }

  /**
   * Attempt to register a dedup hit for the given key.
   *
   * @returns The existing marker if the key is still within the window,
   *          or `null` if the key is fresh / expired (caller should proceed).
   */
  private tryDedup(key: string): DedupMarker | null {
    const existing = this.dedupMap.get(key);
    if (!existing) return null;

    const elapsed = Date.now() - existing.createdAt;
    if (elapsed > this.dedupWindowMs) {
      // Window expired — remove stale marker and allow the new notification.
      this.dedupMap.delete(key);
      return null;
    }

    // Within window — suppress.
    existing.suppressedCount++;
    return existing;
  }

  /**
   * Store a new dedup marker for the given key.
   */
  private setDedupMarker(key: string, notificationId: string): void {
    this.dedupMap.set(key, {
      createdAt: Date.now(),
      suppressedCount: 0,
      originalNotificationId: notificationId,
    });

    // Lazy cleanup: schedule removal after the window expires so the map
    // doesn't grow unbounded. We use a short timeout rather than a sweep
    // to keep the overhead minimal.
    setTimeout(() => {
      const marker = this.dedupMap.get(key);
      if (marker && marker.originalNotificationId === notificationId) {
        this.dedupMap.delete(key);
      }
    }, this.dedupWindowMs + 1000).unref(); // +1 s grace period
  }

  // ─── Introspection (for tests / benchmarks) ──────────────────────────────

  /** Number of duplicates suppressed since the service was constructed. */
  getDedupSuppressedCount(): number {
    return this.dedupSuppressedCount;
  }

  /** Number of notifications persisted and dispatched. */
  getNotificationsSentCount(): number {
    return this.notificationsSentCount;
  }

  /** Current number of active dedup markers. */
  getDedupMapSize(): number {
    return this.dedupMap.size;
  }

  /** Clear all dedup state (useful in tests). */
  clearDedupState(): void {
    this.dedupMap.clear();
    this.dedupSuppressedCount = 0;
    this.notificationsSentCount = 0;
  }
}
