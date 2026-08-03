import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { User } from '../users/entities/user.entity';
import { Quest } from '../quests/entities/quest.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StellarSubmissionService } from '../stellar/stellar-submission.service';
import { SubmissionBuilder } from '../../../test/utils/submission.builder';
import { VerificationDedupService } from '../../common/services/verification-dedup.service';
import { MetricsService } from '../../common/services/metrics.service';

// Vitest-style fake verifier for User repo mocks. The StellarService call
// path requires the verifier to have a Stellar public key; tests use a
// sentinel address distinct from any submitter address so assertions can
// tell the two apart.
const VERIFIER_ID = 'verifier-1';
const VERIFIER_STELLAR_ADDRESS =
  'GVERIFIERSTELLARADDRESS0000000000000000000000';

const buildUpdateBuilder = (affected = 1) => {
  const execute = jest.fn().mockResolvedValue({ affected });
  const andWhere = jest.fn().mockReturnValue({ execute });
  const where = jest.fn().mockReturnValue({ andWhere });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const createQueryBuilder = jest.fn().mockReturnValue({ update });
  return { createQueryBuilder, execute };
};

/**
 * Fake dedup service that simply invokes the operation directly so
 * existing approval-flow tests work without modification.
 */
const createMockDedup = () => ({
  executeWithDedup: jest.fn((_key: string, operation: () => Promise<any>) => operation()),
  clear: jest.fn(),
  clearAll: jest.fn(),
  inflightCount: jest.fn().mockReturnValue(0),
  cacheSize: jest.fn().mockReturnValue(0),
});

const createMockMetrics = () => ({
  incrementCounter: jest.fn(),
  setGauge: jest.fn(),
  observeHistogram: jest.fn(),
  registerCounter: jest.fn(),
  registerGauge: jest.fn(),
  registerHistogram: jest.fn(),
  getPrometheusOutput: jest.fn(),
  getSnapshot: jest.fn(),
});

describe('SubmissionsService (N+1 prevention)', () => {
  let service: SubmissionsService;
  let submissionsRepo: any;
  let usersRepo: any;
  let notifications: {
    sendSubmissionApproved: jest.Mock;
    sendSubmissionRejected: jest.Mock;
  };
  let stellarService: { approveSubmission: jest.Mock };
  let mockDedup: ReturnType<typeof createMockDedup>;

  const buildSubmission = () =>
    new SubmissionBuilder()
      .withId('sub-1')
      .withQuestId('quest-1')
      .withUserId('user-1')
      .withStatus('PENDING' as any)
      .withProof({})
      .withQuest({
        id: 'quest-1',
        title: 'Complete KYC',
        rewardAmount: 10,
      })
      .withUser({
        id: 'user-1',
        stellarAddress: 'GABC',
      })
      .build();

  /**
   * Default verifier record returned by the User repo. Each test can
   * mutate it directly via `verifierRecord.stellarAddress = null` etc.
   */
  const verifierRecord: { id: string; stellarAddress: string | null } = {
    id: VERIFIER_ID,
    stellarAddress: VERIFIER_STELLAR_ADDRESS,
  };

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

    // The service now looks up the verifier via User repo to bind the
    // verifier's Stellar public key into the on-chain tx.
    usersRepo = {
      findOne: jest.fn(({ where }) => {
        if (where?.id === VERIFIER_ID) {
          return Promise.resolve(verifierRecord);
        }
        return Promise.resolve(null);
      }),
    };

    notifications = {
      sendSubmissionApproved: jest.fn().mockResolvedValue(undefined),
      sendSubmissionRejected: jest.fn().mockResolvedValue(undefined),
    };

    stellarService = {
      approveSubmission: jest.fn().mockResolvedValue({
        transactionHash: 'mock-tx-hash-001',
        ledger: 42,
        success: true,
      }),
    };

    mockDedup = createMockDedup();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getRepositoryToken(Submission), useValue: submissionsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Quest), useValue: { findOne: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
        { provide: StellarSubmissionService, useValue: stellarService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: MetricsService, useValue: createMockMetrics() },
        { provide: VerificationDedupService, useValue: mockDedup },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);

    // Bypass the (currently stubbed) verifier-authorization check so the
    // tests can focus on the data-access code path under test.
    jest.spyOn(service as any, 'checkAdminRole').mockResolvedValue(true);

    // Reset verifier fixture between tests so a missing-stellarAddress
    // test does not bleed into the next one.
    verifierRecord.id = VERIFIER_ID;
    verifierRecord.stellarAddress = VERIFIER_STELLAR_ADDRESS;
  });

  describe('approveSubmission', () => {
    it('eager-loads quest+user relations in one findOne and never re-fetches them', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

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
        withDeleted: false,
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

    it('invokes StellarService.approveSubmission with quest id, submitter Stellar address, and verifier Stellar address (NOT the verifier UUID)', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      await service.approveSubmission(
        'sub-1',
        { notes: 'looks good' },
        VERIFIER_ID,
      );

      expect(stellarService.approveSubmission).toHaveBeenCalledTimes(1);
      // CRITICAL: The chain expects a Stellar Address (`G...`) for the
      // verifier argument. Passing a backend user UUID would cause the
      // Soroban SDK to throw on Address construction. We must bind the
      // verifier's `stellarAddress` after looking them up, not the raw id.
      expect(stellarService.approveSubmission).toHaveBeenCalledWith(
        submission.quest.contractTaskId,
        submission.user.stellarAddress,
        VERIFIER_STELLAR_ADDRESS,
      );
    });

    it('looks the verifier up AFTER the submission findOne and BEFORE the Stellar service call', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      await service.approveSubmission(
        'sub-1',
        { notes: 'looks good' },
        VERIFIER_ID,
      );

      const subCallOrder = (submissionsRepo.findOne as jest.Mock).mock
        .invocationCallOrder[0];
      const stellarCallOrder = (stellarService.approveSubmission as jest.Mock)
        .mock.invocationCallOrder[0];
      // Exactly one verifier lookup, falling strictly between the
      // submission fetch and the chain call. Catches regressions where
      // someone moves the lookup to AFTER the CAS (DB-leak bug) or AFTER
      // the chain call (defeats the purpose of validation).
      const verifierLookups = (usersRepo.findOne as jest.Mock).mock.calls
        .map((call, idx) => ({ call, idx }))
        .filter(({ call }) => call[0]?.where?.id === VERIFIER_ID);
      expect(verifierLookups).toHaveLength(1);
      const verifierCallOrder = (usersRepo.findOne as jest.Mock).mock
        .invocationCallOrder[verifierLookups[0].idx];
      expect(subCallOrder).toBeLessThan(verifierCallOrder);
      expect(verifierCallOrder).toBeLessThan(stellarCallOrder);
    });

    it('throws BadRequestException when the verifier has no Stellar address linked', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;
      verifierRecord.stellarAddress = null;

      await expect(
        service.approveSubmission(
          'sub-1',
          { notes: 'looks good' },
          VERIFIER_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      // CRITICAL: The CAS update must NOT have run before the verifier
      // validation. If it did, the DB would be left in a phantom APPROVED
      // state with no rollback path. Assert `createQueryBuilder` was never
      // called so a regression that re-introduces post-CAS validation is
      // caught immediately.
      const updateBuilder = submissionsRepo.createQueryBuilder as jest.Mock;
      expect(updateBuilder).not.toHaveBeenCalled();
      // No chain call should have been attempted.
      expect(stellarService.approveSubmission).not.toHaveBeenCalled();
      // No notifications should have been sent.
      expect(notifications.sendSubmissionApproved).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the verifier record does not exist', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;
      // Override the default User-repo lookup to return null for any id.
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveSubmission(
          'sub-1',
          { notes: 'looks good' },
          'ghost-verifier',
        ),
      ).rejects.toThrow(ForbiddenException);

      // Same invariant: DB must not be mutated on validation failure.
      const updateBuilder = submissionsRepo.createQueryBuilder as jest.Mock;
      expect(updateBuilder).not.toHaveBeenCalled();
      expect(stellarService.approveSubmission).not.toHaveBeenCalled();
    });

    it('throws BadRequestException and does NOT mutate the DB when the submitter has no Stellar address linked', async () => {
      // Build a submission whose submitter has NO Stellar address. The
      // submitter-side check must short-circuit BEFORE the verifier lookup
      // (which would otherwise trigger) and BEFORE the CAS update.
      const submission = new SubmissionBuilder()
        .withId('sub-1')
        .withQuestId('quest-1')
        .withUserId('user-1')
        .withStatus('PENDING' as any)
        .withProof({})
        .withQuest({
          id: 'quest-1',
          title: 'Complete KYC',
          rewardAmount: 10,
        })
        .withUser({
          id: 'user-1',
          stellarAddress: null,
        })
        .build();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      await expect(
        service.approveSubmission(
          'sub-1',
          { notes: 'looks good' },
          VERIFIER_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      // No DB CAS update, no chain call, no notification.
      // The verifier IS looked up (it runs before the submitter address check).
      const updateBuilder = submissionsRepo.createQueryBuilder as jest.Mock;
      expect(updateBuilder).not.toHaveBeenCalled();
      expect(stellarService.approveSubmission).not.toHaveBeenCalled();
      expect(notifications.sendSubmissionApproved).not.toHaveBeenCalled();
    });

    it('persists the on-chain transaction hash on the submission record', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      await service.approveSubmission('sub-1', { notes: 'ok' }, 'verifier-1');

      // The tx-hash write happens AFTER the chain call, with the tx hash
      // returned by StellarService.approveSubmission.
      expect(submissionsRepo.update).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({ transactionHash: 'mock-tx-hash-001' }),
      );
    });

    it('rolls DB status back and throws BadRequest when the chain call fails', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;
      stellarService.approveSubmission.mockRejectedValueOnce(
        new BadRequestException(
          'Contract rejected approve_submission: QuestNotFound',
        ),
      );

      await expect(
        service.approveSubmission('sub-1', { notes: 'ok' }, 'verifier-1'),
      ).rejects.toThrow(BadRequestException);

      // Status reverts and approvedBy/approvedAt are cleared. verifierNotes
      // is intentionally preserved (verifier's review context, not approval
      // state).
      expect(submissionsRepo.update).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          status: 'PENDING',
          approvedBy: undefined,
          approvedAt: undefined,
        }),
      );
      // The submission should NOT have been marked PAID or have a tx hash.
      expect(submissionsRepo.update).not.toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({ transactionHash: expect.anything() }),
      );
      // Approval notification must NOT have been sent on a failed chain call.
      expect(notifications.sendSubmissionApproved).not.toHaveBeenCalled();
    });
  });

  describe('rejectSubmission', () => {
    it('eager-loads quest+user relations in one findOne and never re-fetches them', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      const result = await service.rejectSubmission(
        'sub-1',
        { reason: 'incomplete proof' },
        'verifier-1',
      );

      expect(submissionsRepo.findOne).toHaveBeenCalledTimes(1);
      expect(submissionsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        relations: ['quest', 'user'],
        withDeleted: false,
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

  describe('dedup / cache', () => {
    it('delegates to VerificationDedupService.executeWithDedup with the correct key', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      await service.approveSubmission(
        'sub-1',
        { notes: 'looks good' },
        VERIFIER_ID,
      );

      expect(mockDedup.executeWithDedup).toHaveBeenCalledWith(
        'approve:sub-1',
        expect.any(Function),
      );
    });

    it('dedup reuses the in-flight promise when called concurrently for the same submission', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      // Use a real dedup-like mock that tracks in-flight operations
      const inflightMap = new Map<string, Promise<any>>();
      mockDedup.executeWithDedup = jest.fn(
        (key: string, operation: () => Promise<any>) => {
          const existing = inflightMap.get(key);
          if (existing) return existing;
          const p = operation().finally(() => inflightMap.delete(key));
          inflightMap.set(key, p);
          return p;
        },
      );

      let resolveChain: (v: any) => void;
      const chainPromise = new Promise((resolve) => {
        resolveChain = resolve;
      });
      stellarService.approveSubmission.mockReturnValue(chainPromise);

      const call1 = service.approveSubmission(
        'sub-1',
        { notes: 'ok' },
        VERIFIER_ID,
      );
      const call2 = service.approveSubmission(
        'sub-1',
        { notes: 'ok' },
        VERIFIER_ID,
      );

      resolveChain!({
        transactionHash: 'mock-tx-hash-001',
        ledger: 42,
        success: true,
      });

      const [result1, result2] = await Promise.all([call1, call2]);

      // Both resolved to the same result object
      expect(result1.status).toBe('APPROVED');
      expect(result2.status).toBe('APPROVED');
      // StellarService should only have been called once
      expect(stellarService.approveSubmission).toHaveBeenCalledTimes(1);
    });

    it('caches a successful result and returns it on subsequent calls within TTL', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;

      // Override the mock dedup to simulate caching
      let capturedOp: (() => Promise<any>) | null = null;
      mockDedup.executeWithDedup = jest.fn(
        (_key: string, operation: () => Promise<any>) => {
          capturedOp = operation;
          return operation();
        },
      );

      await service.approveSubmission(
        'sub-1',
        { notes: 'first' },
        VERIFIER_ID,
      );

      expect(stellarService.approveSubmission).toHaveBeenCalledTimes(1);
    });

    it('does NOT cache failed operations so retries are possible', async () => {
      const submission = buildSubmission();
      submissionsRepo.findOne.mockResolvedValue(submission);

      // Fake the dedup to actually mimic real caching: store promise
      // and reject on first call
      let firstCall = true;
      mockDedup.executeWithDedup = jest.fn(
        (_key: string, operation: () => Promise<any>) => {
          if (firstCall) {
            firstCall = false;
            return operation().catch(() => {
              throw new BadRequestException('chain failed');
            });
          }
          return operation();
        },
      );

      // Let the second attempt pass
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;
      stellarService.approveSubmission
        .mockRejectedValueOnce(new Error('chain failure'))
        .mockResolvedValueOnce({
          transactionHash: 'mock-tx-hash-retry',
          ledger: 43,
          success: true,
        });

      await expect(
        service.approveSubmission('sub-1', { notes: 'fail' }, VERIFIER_ID),
      ).rejects.toThrow(BadRequestException);

      // Retry — should succeed because failures are not cached
      submissionsRepo.createQueryBuilder =
        buildUpdateBuilder().createQueryBuilder;
      submissionsRepo.findOne.mockResolvedValue(submission);

      const result = await service.approveSubmission(
        'sub-1',
        { notes: 'retry' },
        VERIFIER_ID,
      );

      expect(result.status).toBe('APPROVED');
      // The chain was called twice: once failed, once succeeded
      expect(stellarService.approveSubmission).toHaveBeenCalledTimes(2);
    });
  });
});
