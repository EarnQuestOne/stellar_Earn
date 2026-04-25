import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { NotificationsService } from '../notifications/notifications.service';

const buildUpdateBuilder = (affected = 1) => {
  const execute = jest.fn().mockResolvedValue({ affected });
  const andWhere = jest.fn().mockReturnValue({ execute });
  const where = jest.fn().mockReturnValue({ andWhere });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const createQueryBuilder = jest.fn().mockReturnValue({ update });
  return { createQueryBuilder, execute };
};

describe('SubmissionsService (N+1 prevention)', () => {
  let service: SubmissionsService;
  let submissionsRepo: any;
  let notifications: { sendSubmissionApproved: jest.Mock; sendSubmissionRejected: jest.Mock };

  const buildSubmission = () => ({
    id: 'sub-1',
    questId: 'quest-1',
    userId: 'user-1',
    status: 'PENDING',
    proof: {},
    quest: {
      id: 'quest-1',
      title: 'Complete KYC',
      rewardAmount: 10,
    },
    user: {
      id: 'user-1',
      stellarAddress: 'GABC',
    },
  });

  beforeEach(async () => {
    submissionsRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
      manager: {
        getRepository: jest.fn(),
      },
    };

    notifications = {
      sendSubmissionApproved: jest.fn().mockResolvedValue(undefined),
      sendSubmissionRejected: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getRepositoryToken(Submission), useValue: submissionsRepo },
        { provide: NotificationsService, useValue: notifications },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);

    // Bypass the (currently stubbed) verifier-authorization check so the
    // tests can focus on the data-access code path under test.
    jest
      .spyOn(service as any, 'checkAdminRole')
      .mockResolvedValue(true);
  });

  describe('approveSubmission', () => {
    it('eager-loads quest+user relations in one findOne and never re-fetches them', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder = buildUpdateBuilder().createQueryBuilder;

      const result = await service.approveSubmission(
        'sub-1',
        { notes: 'looks good' },
        'verifier-1',
      );

      // Single findOne, asking for quest + user up front.
      expect(submissionsRepo.findOne).toHaveBeenCalledTimes(1);
      expect(submissionsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        relations: ['quest', 'user'],
      });

      // The legacy implementation accessed the entity manager to fetch quest
      // and user in two extra round-trips. That path must be gone.
      expect(submissionsRepo.manager.getRepository).not.toHaveBeenCalled();

      expect(notifications.sendSubmissionApproved).toHaveBeenCalledWith(
        'user-1',
        'Complete KYC',
        10,
      );

      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('verifier-1');
      expect(result.verifierNotes).toBe('looks good');
    });
  });

  describe('rejectSubmission', () => {
    it('eager-loads quest+user relations in one findOne and never re-fetches them', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder = buildUpdateBuilder().createQueryBuilder;

      const result = await service.rejectSubmission(
        'sub-1',
        { reason: 'incomplete proof' },
        'verifier-1',
      );

      expect(submissionsRepo.findOne).toHaveBeenCalledTimes(1);
      expect(submissionsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        relations: ['quest', 'user'],
      });
      expect(submissionsRepo.manager.getRepository).not.toHaveBeenCalled();

      expect(notifications.sendSubmissionRejected).toHaveBeenCalledWith(
        'user-1',
        'Complete KYC',
        'incomplete proof',
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectedBy).toBe('verifier-1');
      expect(result.rejectionReason).toBe('incomplete proof');
    });
  });

  describe('findByQuest', () => {
    it('eager-loads quest and user relations so the controller does not lazy-load per row', async () => {
      submissionsRepo.find.mockResolvedValue([]);

      await service.findByQuest('quest-1');

      expect(submissionsRepo.find).toHaveBeenCalledWith({
        where: { questId: 'quest-1' },
        relations: ['quest', 'user'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
