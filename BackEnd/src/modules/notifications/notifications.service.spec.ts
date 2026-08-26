import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationTemplateService } from './template/notification-template.service';
import { MetricsService } from '../../common/services/metrics.service';
import { JobsService } from '../jobs/jobs.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

const buildUpdateBuilder = (
  raw: Array<{ id: string }> = [],
  executeMock?: jest.Mock,
) => {
  const execute = executeMock ?? jest.fn().mockResolvedValue({ raw });
  const returning = jest.fn().mockReturnValue({ execute });
  // andWhere returns an object that supports further .andWhere() calls
  // OR .returning() / .execute() — a chainable builder.
  const andWhereFn = jest.fn().mockImplementation(() => ({
    andWhere: andWhereFn,
    returning,
    execute,
  }));
  const where = jest.fn().mockReturnValue({ andWhere: andWhereFn });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const createQueryBuilder = jest.fn().mockReturnValue({ update });
  return {
    createQueryBuilder,
    update,
    set,
    where,
    andWhere: andWhereFn,
    returning,
    execute,
  };
};

const createMockMetrics = (): jest.Mocked<MetricsService> =>
  ({
    registerCounter: jest.fn(),
    registerGauge: jest.fn(),
    registerHistogram: jest.fn(),
    incrementCounter: jest.fn(),
    setGauge: jest.fn(),
    observeHistogram: jest.fn(),
    getLatencyPercentiles: jest.fn(),
    getPrometheusOutput: jest.fn(),
    getSnapshot: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  }) as any;

// ─── Tests ────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepo: any;
  let logRepo: any;
  let preferenceRepo: any;
  let jobsService: any;
  let templateService: any;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    notificationsRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: 'notif-' + Date.now() }),
        ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(3),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    logRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 'log-' + Date.now() }),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    preferenceRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };

    jobsService = {
      addJob: jest.fn().mockResolvedValue({ id: 'job' }),
    };

    templateService = {
      render: jest.fn().mockReturnValue('rendered message'),
    };

    metrics = createMockMetrics();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationsRepo,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: preferenceRepo,
        },
        { provide: getRepositoryToken(NotificationLog), useValue: logRepo },
        { provide: JobsService, useValue: jobsService },
        { provide: NotificationTemplateService, useValue: templateService },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    service.clearDedupState();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────────

  describe('markAllAsRead (N+1 prevention)', () => {
    it('issues one batch UPDATE per table instead of looping per notification', async () => {
      const notificationsBuilder = buildUpdateBuilder([
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
      ]);
      const logBuilder = buildUpdateBuilder();

      notificationsRepo.createQueryBuilder =
        notificationsBuilder.createQueryBuilder;
      logRepo.createQueryBuilder = logBuilder.createQueryBuilder;

      await service.markAllAsRead('user-1');

      // The legacy implementation called .find + per-row .update (2N queries).
      // The new implementation must not load notifications row-by-row.
      expect(notificationsRepo.find).not.toHaveBeenCalled();
      expect(notificationsRepo.update).not.toHaveBeenCalled();
      expect(logRepo.update).not.toHaveBeenCalled();

      // Exactly one batched UPDATE for notifications and one for logs.
      expect(notificationsBuilder.execute).toHaveBeenCalledTimes(1);
      expect(logBuilder.execute).toHaveBeenCalledTimes(1);
      expect(notificationsBuilder.where).toHaveBeenCalledWith(
        'userId = :userId',
        {
          userId: 'user-1',
        },
      );
    });

    it('skips the log update when no notifications were unread', async () => {
      const notificationsBuilder = buildUpdateBuilder([]);
      const logBuilder = buildUpdateBuilder();

      notificationsRepo.createQueryBuilder =
        notificationsBuilder.createQueryBuilder;
      logRepo.createQueryBuilder = logBuilder.createQueryBuilder;

      await service.markAllAsRead('user-1');

      expect(notificationsBuilder.execute).toHaveBeenCalledTimes(1);
      expect(logBuilder.execute).not.toHaveBeenCalled();
    });
  });

  // ─── getUnreadCount ──────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns the unread count for a user', async () => {
      notificationsRepo.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ unreadCount: 5 });
      expect(notificationsRepo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
    });

    it('returns 0 when no unread notifications exist', async () => {
      notificationsRepo.count.mockResolvedValue(0);
      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ unreadCount: 0 });
    });
  });

  // ─── send (core dispatch) ────────────────────────────────────────────────

  describe('send', () => {
    it('persists a notification and enqueues delivery jobs', async () => {
      const result = await service.send(
        'user-1',
        NotificationType.INFO,
        'Test',
        'Hello',
      );

      expect(result).toBeDefined();
      expect(notificationsRepo.create).toHaveBeenCalled();
      expect(notificationsRepo.save).toHaveBeenCalled();
      expect(jobsService.addJob).toHaveBeenCalledWith('notifications', {
        notificationId: expect.anything(),
        channel: 'IN_APP',
        logId: expect.anything(),
      });
      expect(logRepo.create).toHaveBeenCalled();
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('uses specified channels', async () => {
      await service.send('user-1', NotificationType.INFO, 'Test', 'Hello', {
        channels: ['IN_APP', 'EMAIL'],
      });

      expect(jobsService.addJob).toHaveBeenCalledTimes(2);
      expect(jobsService.addJob).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({ channel: 'IN_APP' }),
      );
      expect(jobsService.addJob).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({ channel: 'EMAIL' }),
      );
    });

    it('increments notification_sent_total metric', async () => {
      await service.send('user-1', NotificationType.INFO, 'Test', 'Hello');
      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'notification_sent_total',
        { type: NotificationType.INFO },
      );
    });
  });

  // ─── sendSubmissionApproved ──────────────────────────────────────────────

  describe('sendSubmissionApproved', () => {
    it('sends an approved notification with rendered template', async () => {
      const result = await service.sendSubmissionApproved(
        'user-1',
        'Quest Title',
        100,
      );

      expect(result).toBeDefined();
      expect(templateService.render).toHaveBeenCalledWith(
        'SUBMISSION_APPROVED',
        { questTitle: 'Quest Title', rewardAmount: 100 },
      );
    });

    it('sends to IN_APP and EMAIL channels', async () => {
      await service.sendSubmissionApproved('user-1', 'Quest', 50);

      expect(jobsService.addJob).toHaveBeenCalledTimes(2);
      const channels = (jobsService.addJob as jest.Mock).mock.calls.map(
        (c: any[]) => c[1].channel,
      );
      expect(channels).toContain('IN_APP');
      expect(channels).toContain('EMAIL');
    });
  });

  // ─── sendSubmissionRejected ──────────────────────────────────────────────

  describe('sendSubmissionRejected', () => {
    it('sends a rejected notification with rendered template', async () => {
      const result = await service.sendSubmissionRejected(
        'user-1',
        'Quest Title',
        'Insufficient proof',
      );

      expect(result).toBeDefined();
      expect(templateService.render).toHaveBeenCalledWith(
        'SUBMISSION_REJECTED',
        { questTitle: 'Quest Title', reason: 'Insufficient proof' },
      );
    });
  });

  // ─── Deduplication ───────────────────────────────────────────────────────

  describe('deduplication', () => {
    it('allows the first notification through', async () => {
      const result = await service.send(
        'user-1',
        NotificationType.SUBMISSION_APPROVED,
        'Approved',
        'Your submission was approved',
        { entityId: 'entity-123' },
      );

      expect(result).not.toBeNull();
      expect(notificationsRepo.save).toHaveBeenCalledTimes(1);
      expect(jobsService.addJob).toHaveBeenCalled();
      expect(service.getDedupSuppressedCount()).toBe(0);
      expect(service.getNotificationsSentCount()).toBe(1);
    });

    it('suppresses duplicate notifications within the window', async () => {
      const opts = {
        entityId: 'entity-123',
        priority: NotificationPriority.NORMAL,
      };

      // First notification — should go through.
      const first = await service.send(
        'user-1',
        NotificationType.SUBMISSION_APPROVED,
        'Approved',
        'Your submission was approved',
        opts,
      );
      expect(first).not.toBeNull();

      // Reset the save mock call count for clarity.
      (notificationsRepo.save as jest.Mock).mockClear();
      (logRepo.save as jest.Mock).mockClear();
      (jobsService.addJob as jest.Mock).mockClear();

      // Second identical notification — should be suppressed.
      const second = await service.send(
        'user-1',
        NotificationType.SUBMISSION_APPROVED,
        'Approved',
        'Your submission was approved',
        opts,
      );
      expect(second).toBeNull();
      expect(notificationsRepo.save).not.toHaveBeenCalled();
      expect(jobsService.addJob).not.toHaveBeenCalled();
      expect(service.getDedupSuppressedCount()).toBe(1);
      expect(service.getNotificationsSentCount()).toBe(1);

      // Third — also suppressed.
      const third = await service.send(
        'user-1',
        NotificationType.SUBMISSION_APPROVED,
        'Approved',
        'Your submission was approved',
        opts,
      );
      expect(third).toBeNull();
      expect(service.getDedupSuppressedCount()).toBe(2);
    });

    it('does not deduplicate notifications without entityId', async () => {
      const send = async () =>
        service.send(
          'user-1',
          NotificationType.INFO,
          'System message',
          'Hello',
        );

      await send();
      await send();
      await send();

      expect(notificationsRepo.save).toHaveBeenCalledTimes(3);
      expect(service.getDedupSuppressedCount()).toBe(0);
      expect(service.getNotificationsSentCount()).toBe(3);
    });

    it('deduplicates separately per user', async () => {
      const opts = { entityId: 'entity-123' };

      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);
      await service.send('user-2', NotificationType.INFO, 'Test', 'msg', opts);

      // Both should go through because they're for different users.
      expect(notificationsRepo.save).toHaveBeenCalledTimes(2);
      expect(service.getNotificationsSentCount()).toBe(2);
    });

    it('deduplicates separately per notification type', async () => {
      const opts = { entityId: 'entity-123' };

      await service.send(
        'user-1',
        NotificationType.SUBMISSION_APPROVED,
        'Approved',
        'msg',
        opts,
      );
      await service.send(
        'user-1',
        NotificationType.SUBMISSION_REJECTED,
        'Rejected',
        'msg',
        opts,
      );

      // Different types for the same entity should both go through.
      expect(notificationsRepo.save).toHaveBeenCalledTimes(2);
      expect(service.getNotificationsSentCount()).toBe(2);
    });

    it('allows notifications after the dedup window expires', async () => {
      jest.useFakeTimers();

      const opts = { entityId: 'entity-123' };

      // First notification.
      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);
      expect(service.getNotificationsSentCount()).toBe(1);

      // Advance time past the 30s window.
      jest.advanceTimersByTime(31_000);

      // Second notification after window — should go through.
      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);
      expect(service.getNotificationsSentCount()).toBe(2);
      expect(service.getDedupSuppressedCount()).toBe(0);

      jest.useRealTimers();
    });

    it('increments notification_dedup_suppressed_total metric on suppression', async () => {
      const opts = { entityId: 'entity-123' };

      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);
      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'notification_dedup_suppressed_total',
        { type: NotificationType.INFO },
      );
    });

    it('cleans up dedup markers after window + grace period', async () => {
      jest.useFakeTimers();

      const opts = { entityId: 'entity-123' };

      await service.send('user-1', NotificationType.INFO, 'Test', 'msg', opts);
      expect(service.getDedupMapSize()).toBe(1);

      // Advance past window + 1s grace period.
      jest.advanceTimersByTime(31_500);

      expect(service.getDedupMapSize()).toBe(0);

      jest.useRealTimers();
    });
  });
});
