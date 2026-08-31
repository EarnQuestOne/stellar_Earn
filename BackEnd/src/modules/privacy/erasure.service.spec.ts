import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { ErasureService } from './erasure.service';
import {
  ErasureRequest,
  ErasureStatus,
} from './entities/erasure-request.entity';
import { User } from '../users/entities/user.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ModerationItem } from '../moderation/entities/moderation-item.entity';
import { EventStore } from '../../events/entities/event-store.entity';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';

describe('ErasureService', () => {
  let service: ErasureService;
  let erasureRepo: any;
  let userRepo: any;
  let dataSource: any;
  let usersService: any;
  let submissionsService: any;
  let eventEmitter: any;

  const subjectId = '11111111-1111-4111-8111-111111111111';
  const requestId = '22222222-2222-4222-8222-222222222222';

  const baseRequest = () =>
    ({
      id: requestId,
      subjectId,
      requestedBy: subjectId,
      status: ErasureStatus.REQUESTED,
      requestedAt: new Date(),
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      executedAt: null,
      cancelledAt: null,
      scope: ['users', 'submissions', 'notifications', 'payouts', 'moderation'],
      reason: null,
    }) as ErasureRequest;

  beforeEach(async () => {
    jest.clearAllMocks();

    erasureRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    userRepo = { findOne: jest.fn() };

    const managerFns: Record<string, jest.Mock> = {};
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(createManager(managerFns))),
    };

    usersService = { anonymizeForErasure: jest.fn() };
    submissionsService = { anonymizeForErasure: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErasureService,
        { provide: getRepositoryToken(ErasureRequest), useValue: erasureRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Submission), useValue: {} },
        { provide: getRepositoryToken(Payout), useValue: {} },
        { provide: getRepositoryToken(Notification), useValue: {} },
        { provide: getRepositoryToken(ModerationItem), useValue: {} },
        { provide: getRepositoryToken(EventStore), useValue: {} },
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
        { provide: SubmissionsService, useValue: submissionsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ErasureService>(ErasureService);

    function createManager(fns: Record<string, jest.Mock>) {
      const manager = {
        update: jest.fn((entity: any, criteria: any, _patch: any) => {
          if (entity === ErasureRequest && criteria.id === requestId) {
            return Promise.resolve({ affected: 1 });
          }
          return Promise.resolve({ affected: 1 });
        }),
        getRepository: jest.fn((entity: any) => {
          const key = entity.name || String(entity);
          if (!fns[key]) {
            fns[key] = {
              findOne: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              create: jest.fn((x: any) => x),
              save: jest.fn((x: any) => Promise.resolve(x)),
            };
          }
          return fns[key];
        }),
      };
      return manager;
    }
  });

  describe('requestErasure', () => {
    it('creates a request with a grace period and emits the scheduling event', async () => {
      userRepo.findOne.mockResolvedValue({ id: subjectId });
      erasureRepo.findOne.mockResolvedValue(null);

      const result = await service.requestErasure(subjectId, {
        requestedBy: subjectId,
      });

      expect(erasureRepo.create).toHaveBeenCalled();
      expect(erasureRepo.save).toHaveBeenCalled();
      expect(result.status).toBe(ErasureStatus.REQUESTED);
      expect(result.scheduledFor.getTime()).toBeGreaterThan(Date.now());
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'privacy.erasure.requested',
        expect.objectContaining({ requestId: result.id, subjectId }),
      );
    });

    it('throws NotFoundException when the subject does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.requestErasure(subjectId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(erasureRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when an active request already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: subjectId });
      erasureRepo.findOne.mockResolvedValue(baseRequest());

      await expect(service.requestErasure(subjectId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(erasureRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelErasure', () => {
    it('cancels a request within the grace window', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());

      const result = await service.cancelErasure(requestId, {
        id: subjectId,
        role: 'USER',
      });

      expect(result.status).toBe(ErasureStatus.CANCELLED);
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'privacy.erasure.cancelled',
        expect.objectContaining({ requestId, subjectId }),
      );
    });

    it('allows an admin to cancel on behalf of the subject', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());

      const result = await service.cancelErasure(requestId, {
        id: 'admin-id',
        role: 'ADMIN',
      });
      expect(result.status).toBe(ErasureStatus.CANCELLED);
    });

    it('rejects a third party that is neither subject nor admin', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());

      await expect(
        service.cancelErasure(requestId, { id: 'other-id', role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cancellation after the grace period has elapsed', async () => {
      const request = baseRequest();
      request.scheduledFor = new Date(Date.now() - 1000);
      erasureRepo.findOne.mockResolvedValue(request);

      await expect(
        service.cancelErasure(requestId, { id: subjectId, role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cancellation of an already-completed request', async () => {
      const request = baseRequest();
      request.status = ErasureStatus.COMPLETED;
      erasureRepo.findOne.mockResolvedValue(request);

      await expect(
        service.cancelErasure(requestId, { id: subjectId, role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('returns the request for the subject', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());
      const result = await service.getStatus(requestId, {
        id: subjectId,
        role: 'USER',
      });
      expect(result.id).toBe(requestId);
    });

    it('returns the request for an admin', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());
      const result = await service.getStatus(requestId, {
        id: 'admin-id',
        role: 'ADMIN',
      });
      expect(result.id).toBe(requestId);
    });

    it('rejects a third party', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());
      await expect(
        service.getStatus(requestId, { id: 'other-id', role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for an unknown request', async () => {
      erasureRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getStatus(requestId, { id: subjectId, role: 'USER' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('executeErasure', () => {
    it('is a no-op for an already-completed request', async () => {
      const request = baseRequest();
      request.status = ErasureStatus.COMPLETED;
      erasureRepo.findOne.mockResolvedValue(request);

      const result = await service.executeErasure(requestId);
      expect(result).toEqual({
        requestId,
        status: ErasureStatus.COMPLETED,
        alreadyExecuted: true,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('skips cancelled requests', async () => {
      const request = baseRequest();
      request.status = ErasureStatus.CANCELLED;
      erasureRepo.findOne.mockResolvedValue(request);

      const result = await service.executeErasure(requestId);
      expect(result).toEqual({
        requestId,
        status: ErasureStatus.CANCELLED,
        skipped: true,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('refuses to run before the grace period has elapsed', async () => {
      erasureRepo.findOne.mockResolvedValue(baseRequest());

      await expect(service.executeErasure(requestId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('anonymizes all modules in a single transaction and completes the request', async () => {
      const request = baseRequest();
      request.scheduledFor = new Date(Date.now() - 1000);
      erasureRepo.findOne.mockResolvedValue(request);

      const managerUserRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: subjectId,
          stellarAddress: 'GOLDEN-STELLAR-ADDRESS',
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        delete: jest.fn().mockResolvedValue({ affected: 0 }),
        create: jest.fn((x: any) => x),
        save: jest.fn((x: any) => Promise.resolve(x)),
      };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager: any = {
          update: jest
            .fn()
            .mockResolvedValueOnce({ affected: 1 }) // claim
            .mockResolvedValueOnce({ affected: 1 }) // payout update
            .mockResolvedValueOnce({ affected: 1 }) // moderation update
            .mockResolvedValueOnce({ affected: 1 }), // mark completed
          getRepository: jest.fn().mockImplementation((entity: any) => {
            if (entity === User) return managerUserRepo;
            if (entity === Notification)
              return { delete: jest.fn().mockResolvedValue({ affected: 3 }) };
            if (entity === Payout)
              return { update: jest.fn().mockResolvedValue({ affected: 2 }) };
            if (entity === ModerationItem)
              return {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
              };
            if (entity === EventStore)
              return {
                create: jest.fn((x: any) => x),
                save: jest.fn((x: any) => Promise.resolve(x)),
              };
            return {};
          }),
        };
        return cb(manager);
      });

      usersService.anonymizeForErasure.mockResolvedValue({
        stellarAddress: 'GOLDEN-STELLAR-ADDRESS',
        email: 'user@example.com',
      });
      submissionsService.anonymizeForErasure.mockResolvedValue(2);

      const result = await service.executeErasure(requestId);

      expect(result.status).toBe(ErasureStatus.COMPLETED);
      expect(usersService.anonymizeForErasure).toHaveBeenCalledWith(
        subjectId,
        expect.anything(),
      );
      expect(submissionsService.anonymizeForErasure).toHaveBeenCalledWith(
        subjectId,
        expect.anything(),
      );
      expect(managerUserRepo.findOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when the subject row is gone', async () => {
      const request = baseRequest();
      request.scheduledFor = new Date(Date.now() - 1000);
      erasureRepo.findOne.mockResolvedValue(request);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager: any = {
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(null),
          }),
        };
        return cb(manager);
      });

      await expect(service.executeErasure(requestId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
