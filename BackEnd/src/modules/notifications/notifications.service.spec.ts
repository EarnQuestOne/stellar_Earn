import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notificationPreference.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationTemplateService } from './templates/notification-template.service';

const buildUpdateBuilder = (
  raw: Array<{ id: string }> = [],
  executeMock?: jest.Mock,
) => {
  const execute = executeMock ?? jest.fn().mockResolvedValue({ raw });
  const returning = jest.fn().mockReturnValue({ execute });
  const andWhere = jest
    .fn()
    .mockReturnValue({ returning, execute });
  const where = jest.fn().mockReturnValue({ andWhere });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const createQueryBuilder = jest.fn().mockReturnValue({ update });
  return { createQueryBuilder, update, set, where, andWhere, returning, execute };
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepo: any;
  let logRepo: any;
  let preferenceRepo: any;
  let queue: any;
  let templateService: any;

  beforeEach(async () => {
    notificationsRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    logRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    preferenceRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };

    queue = { add: jest.fn().mockResolvedValue({ id: 'job' }) };
    templateService = { render: jest.fn().mockReturnValue('rendered') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notificationsRepo },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: preferenceRepo,
        },
        { provide: getRepositoryToken(NotificationLog), useValue: logRepo },
        { provide: getQueueToken('notifications'), useValue: queue },
        { provide: NotificationTemplateService, useValue: templateService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markAllAsRead (N+1 prevention)', () => {
    it('issues one batch UPDATE per table instead of looping per notification', async () => {
      const notificationsBuilder = buildUpdateBuilder([
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
      ]);
      const logBuilder = buildUpdateBuilder();

      notificationsRepo.createQueryBuilder = notificationsBuilder.createQueryBuilder;
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
      expect(notificationsBuilder.where).toHaveBeenCalledWith('userId = :userId', {
        userId: 'user-1',
      });
    });

    it('skips the log update when no notifications were unread', async () => {
      const notificationsBuilder = buildUpdateBuilder([]);
      const logBuilder = buildUpdateBuilder();

      notificationsRepo.createQueryBuilder = notificationsBuilder.createQueryBuilder;
      logRepo.createQueryBuilder = logBuilder.createQueryBuilder;

      await service.markAllAsRead('user-1');

      expect(notificationsBuilder.execute).toHaveBeenCalledTimes(1);
      expect(logBuilder.execute).not.toHaveBeenCalled();
    });
  });
});
