import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmissionsService } from '#src/modules/submissions/submissions.service';
import { StellarService } from '#src/modules/stellar/stellar.service';
import { NotificationsService } from '#src/modules/notifications/notifications.service';
import { SubmissionsController } from '#src/modules/submissions/submissions.controller';
import { JwtAuthGuard } from '#src/modules/auth/guards/jwt-auth.guard';
import {
  Submission,
  SubmissionStatus,
} from '#src/modules/submissions/entities/submission.entity';
import { SubmissionBuilder } from '../../../test/utils/submission.builder';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { User } from '#src/modules/users/entities/user.entity';
import { Notification } from '#src/modules/notifications/entities/notification.entity';
import { UserRole } from '#src/modules/auth/enums/user-role.enum';

/**
 * Default fixture values. Tests can mutate these in `beforeEach` to
 * drive different scenarios (e.g. null stellarAddress, missing quest).
 */
const SUBMITTER_ID = 'submitter-1';
const SUBMITTER_STELLAR = 'GSUBMITTERSTELLARADDRESS000000000000000000000000';
const VERIFIER_ID = 'verifier-1';
const VERIFIER_STELLAR = 'GVERIFIERSTELLARADDRESS0000000000000000000000';
const QUEST_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const SUBMISSION_ID = 'a1b2c3d4-0000-0000-0000-000000000010';
const APPROVE_TX_HASH = 'mock-approve-tx-001';

const submitterRecord: { id: string; stellarAddress: string | null } = {
  id: SUBMITTER_ID,
  stellarAddress: SUBMITTER_STELLAR,
};

const verifierRecord: { id: string; stellarAddress: string | null } = {
  id: VERIFIER_ID,
  stellarAddress: VERIFIER_STELLAR,
};

const questRecord: Partial<Quest> = {
  id: QUEST_ID,
  title: 'Complete KYC',
  rewardAmount: 10,
  contractTaskId: 'onchain-task-1',
  status: 'ACTIVE',
  currentCompletions: 0,
  maxCompletions: 100,
  createdBy: VERIFIER_ID,
  verifiers: [{ id: VERIFIER_ID }],
};

describe('Submission Create + Approve flow (e2e)', () => {
  let app: INestApplication<App>;
  let submissionsRepo: any;
  let questsRepo: any;
  let usersRepo: any;
  let stellarService: any;
  let notificationsService: any;
  let eventEmitter: { emit: jest.Mock };
  let mockEntityManager: any;

  /**
   * The capacity-gate conditional UPDATE returns `affected: 1` on success
   * and `affected: 0` when the WHERE clause filtered out everything (quest
   * doesn't exist, isn't ACTIVE, or is at capacity). Tests flip this
   * between assertions to drive the failure paths.
   */
  let nextCapacityAffected = 1;

  /**
   * Build a saved-shaped submission that the service fills out on
   * `createSubmission`. Using a builder keeps the entity shape
   * consistent with the rest of the test suite.
   */
  const buildSavedSubmission = (overrides: Partial<Submission> = {}) =>
    new SubmissionBuilder()
      .withId(SUBMISSION_ID)
      .withQuestId(QUEST_ID)
      .withUserId(SUBMITTER_ID)
      .withStatus(SubmissionStatus.PENDING)
      .withProof({
        fileName: 'kyc.pdf',
        fileContent: 'base64content',
      })
      .withQuest({
        id: QUEST_ID,
        title: 'Complete KYC',
        rewardAmount: 10,
        contractTaskId: 'onchain-task-1',
      })
      .withUser({
        id: SUBMITTER_ID,
        stellarAddress: SUBMITTER_STELLAR,
      })
      .build(overrides as any);

  /**
   * Test-time authentication. The override guard reads the user identity
   * from `X-Test-*` headers so a single test can drive multiple roles
   * (submitter, verifier, no auth, etc.) without invoking the real JWT
   * pipeline.
   */
  const buildAuthOverride = () => ({
    canActivate: (ctx: any) => {
      if (ctx.headers['x-test-auth'] === 'deny') return false;
      ctx.switchToHttp().getRequest().user =
        ctx.headers['x-test-user-id'] === VERIFIER_ID
          ? { id: VERIFIER_ID, role: UserRole.ADMIN }
          : { id: SUBMITTER_ID, role: UserRole.USER };
      return true;
    },
  });

  /**
   * Wire the next-capacity-affected value onto the mockEntityManager.
   * Reset between tests via `setNextCapacityAffected(1)`.
   */
  const setupEntityManagerMock = () => {
    const execute = jest
      .fn()
      .mockResolvedValue({ affected: nextCapacityAffected });
    const andWhere = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ andWhere });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    mockEntityManager = {
      createQueryBuilder: jest.fn(() => ({ update })),
      create: jest.fn((_Entity: any, payload: Submission) => ({
        ...payload,
        id: SUBMISSION_ID,
        status: SubmissionStatus.PENDING,
      })),
      save: jest.fn((submission: Submission) =>
        Promise.resolve({ ...submission, id: submission.id ?? SUBMISSION_ID }),
      ),
    };
  };

  beforeAll(async () => {
    submissionsRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      // manager.transaction powers the new atomic-capacity-gate flow.
      // We invoke the callback synchronously with a mock EntityManager
      // so the chain for the conditional UPDATE is observable.
      manager: {
        transaction: jest.fn(async (cb: any) => cb(mockEntityManager)),
      },
      // createQueryBuilder on the repo is used by approveSubmission's
      // CAS update; kept separate from the entityManager chain.
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    questsRepo = {
      findOne: jest.fn().mockResolvedValue(questRecord),
    };

    usersRepo = {
      findOne: jest.fn(({ where: { id } }: any) => {
        if (id === SUBMITTER_ID) return Promise.resolve(submitterRecord);
        if (id === VERIFIER_ID) return Promise.resolve(verifierRecord);
        return Promise.resolve(null);
      }),
    };

    stellarService = {
      approveSubmission: jest.fn().mockResolvedValue({
        success: true,
        transactionHash: APPROVE_TX_HASH,
        ledger: 42,
      }),
    };

    notificationsService = {
      sendSubmissionApproved: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      sendSubmissionRejected: jest.fn().mockResolvedValue({ id: 'notif-2' }),
    };

    eventEmitter = { emit: jest.fn().mockReturnValue(undefined) };

    setupEntityManagerMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        SubmissionsService,
        { provide: StellarService, useValue: stellarService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: getRepositoryToken(Submission),
          useValue: submissionsRepo,
        },
        { provide: getRepositoryToken(Quest), useValue: questsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Notification), useValue: undefined },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(buildAuthOverride())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore defaults between tests.
    submitterRecord.id = SUBMITTER_ID;
    submitterRecord.stellarAddress = SUBMITTER_STELLAR;
    verifierRecord.id = VERIFIER_ID;
    verifierRecord.stellarAddress = VERIFIER_STELLAR;
    questRecord.id = QUEST_ID;
    questRecord.status = 'ACTIVE';
    questRecord.maxCompletions = 100;
    questRecord.currentCompletions = 0;
    stellarService.approveSubmission.mockResolvedValue({
      success: true,
      transactionHash: APPROVE_TX_HASH,
      ledger: 42,
    });
    // Re-init the entityManager mock so each test gets a fresh chain.
    nextCapacityAffected = 1;
    setupEntityManagerMock();
  });

  // ──────────────────────────────────────────────────────────────────────
  // CREATE — POST /quests/:questId/submissions
  // ──────────────────────────────────────────────────────────────────────
  describe('POST /quests/:questId/submissions', () => {
    it('201 happy path: capacity gate passes inside transaction, submission.created emitted', async () => {
      const res = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({
          fileName: 'kyc.pdf',
          fileContent: 'base64content',
          notes: 'see attached',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.status).toBe('PENDING');
      expect(res.body.data.submission.proof.fileName).toBe('kyc.pdf');

      // The new flow must have invoked the transaction-mocked manager and
      // the entityManager chain for the capacity gate.
      expect(submissionsRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();

      // The submission row was created and saved INSIDE the transaction.
      expect(mockEntityManager.create).toHaveBeenCalledTimes(1);
      const createdArg = mockEntityManager.create.mock.calls[0][1];
      expect(createdArg).toMatchObject({
        questId: QUEST_ID,
        userId: SUBMITTER_ID,
        status: 'PENDING',
      });
      expect(mockEntityManager.save).toHaveBeenCalledTimes(1);

      // Submissions repo .create/.save are no longer used by createSubmission.
      expect(submissionsRepo.create).not.toHaveBeenCalled();
      expect(submissionsRepo.save).not.toHaveBeenCalled();

      const createdEvent = eventEmitter.emit.mock.calls.find(
        (call: any[]) => call[0] === 'submission.created',
      );
      expect(createdEvent).toBeDefined();
    });

    it('400 when the submitter has no Stellar wallet linked (no DB write)', async () => {
      submitterRecord.stellarAddress = null;

      const res = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({
          fileName: 'kyc.pdf',
          fileContent: 'base64content',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/stellar wallet/i);
      // The validator-before-mutate invariant: capacity-gate transaction
      // must NOT have run.
      expect(submissionsRepo.manager.transaction).not.toHaveBeenCalled();
      expect(mockEntityManager.create).not.toHaveBeenCalled();
    });

    it('404 when the quest does not exist (capacity gate succeeds? No \u2014 rejects at disambiguation)', async () => {
      // Force capacity gate to fail so the disambiguation re-fetch runs.
      nextCapacityAffected = 0;
      setupEntityManagerMock();
      questsRepo.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.NOT_FOUND);

      // transaction was attempted, sentinel-threw, but the disambiguation
      // re-read confirmed the quest does not exist.
      expect(submissionsRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.create).not.toHaveBeenCalled();
    });

    it('400 when the quest is not ACTIVE (disambiguation surfaces precise error)', async () => {
      nextCapacityAffected = 0;
      setupEntityManagerMock();
      questsRepo.findOne.mockResolvedValueOnce({
        ...questRecord,
        status: 'PAUSED',
      });

      const res = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/not accepting submissions/i);
      expect(mockEntityManager.create).not.toHaveBeenCalled();
    });

    it('400 when the quest has reached its maximum completions', async () => {
      nextCapacityAffected = 0;
      setupEntityManagerMock();
      questsRepo.findOne.mockResolvedValueOnce({
        ...questRecord,
        currentCompletions: 100,
        maxCompletions: 100,
      });

      const res = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/maximum completions/i);
      expect(mockEntityManager.create).not.toHaveBeenCalled();
    });

    it('400 when the body is invalid (empty fileName)', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: '', fileContent: 'b64' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(submissionsRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('403 when the auth override denies the request', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-Auth', 'deny')
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // SUBMIT → APPROVE — full flow via HTTP
  // ──────────────────────────────────────────────────────────────────────
  describe('POST /quests/:questId/submissions/:id/approve (after submit)', () => {
    it('full happy path: submit -> approve -> status APPROVED + txHash persisted', async () => {
      // ── Step 1: SUBMIT ────────────────────────────────────────────────
      const submitRes = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.CREATED);

      expect(submitRes.body.data.submission.status).toBe('PENDING');

      // ── Step 2: APPROVE ───────────────────────────────────────────────
      // The service will re-fetch the submission by id to attempt approval.
      const fetched = buildSavedSubmission();
      submissionsRepo.findOne.mockResolvedValue(fetched);

      const approveRes = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions/${SUBMISSION_ID}/approve`)
        .set('X-Test-User-Id', VERIFIER_ID)
        .send({ notes: 'looks good' })
        .expect(HttpStatus.OK);

      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.submission.status).toBe('APPROVED');
      expect(approveRes.body.data.submission.transactionHash).toBe(
        APPROVE_TX_HASH,
      );

      // StellarService must be called with the verifier's Stellar public
      // key (NOT the backend UUID).
      expect(stellarService.approveSubmission).toHaveBeenCalledTimes(1);
      expect(stellarService.approveSubmission).toHaveBeenCalledWith(
        fetched.quest.contractTaskId,
        fetched.user.stellarAddress,
        VERIFIER_STELLAR,
      );

      // The chain txHash must be persisted on the submission row.
      expect(submissionsRepo.update).toHaveBeenCalledWith(
        SUBMISSION_ID,
        expect.objectContaining({ transactionHash: APPROVE_TX_HASH }),
      );

      // The approval notification must have dispatched.
      expect(notificationsService.sendSubmissionApproved).toHaveBeenCalledTimes(
        1,
      );

      // Both events must have fired.
      const createdEvent = eventEmitter.emit.mock.calls.find(
        (c: any[]) => c[0] === 'submission.created',
      );
      const approvedEvent = eventEmitter.emit.mock.calls.find(
        (c: any[]) => c[0] === 'submission.approved',
      );
      const completedEvent = eventEmitter.emit.mock.calls.find(
        (c: any[]) => c[0] === 'quest.completed',
      );
      expect(createdEvent).toBeDefined();
      expect(approvedEvent).toBeDefined();
      expect(completedEvent).toBeDefined();
    });

    it('chain call fails: rolls DB status back, returns 400 with chain error, no notification', async () => {
      // ── Step 1: SUBMIT (success) ──────────────────────────────────────
      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.CREATED);

      // ── Step 2: APPROVE ───────────────────────────────────────────────
      const fetched = buildSavedSubmission();
      submissionsRepo.findOne.mockResolvedValue(fetched);
      stellarService.approveSubmission.mockRejectedValueOnce(
        new BadRequestException(
          'Contract rejected approve_submission: QuestNotFound',
        ),
      );

      const res = await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions/${SUBMISSION_ID}/approve`)
        .set('X-Test-User-Id', VERIFIER_ID)
        .send({ notes: 'looks good' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/On-chain approval failed|QuestNotFound/);

      // Rollback path: status reverts to PENDING, approved_* cleared.
      const rollbackCall = submissionsRepo.update.mock.calls.find(
        (call: any[]) => {
          const payload = call[1];
          return payload?.status === 'PENDING' && payload?.approvedBy == null;
        },
      );
      expect(rollbackCall).toBeDefined();

      // No txHash must have been written.
      const txHashWrite = submissionsRepo.update.mock.calls.find(
        (call: any[]) => typeof call[1]?.transactionHash === 'string',
      );
      expect(txHashWrite).toBeUndefined();

      // No approval notification must have been sent.
      expect(notificationsService.sendSubmissionApproved).not.toHaveBeenCalled();
    });

    it('verifier must have a Stellar wallet: 400 BadRequest, no DB write', async () => {
      // Submit (success)
      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .send({ fileName: 'kyc.pdf', fileContent: 'b64' })
        .expect(HttpStatus.CREATED);

      // Approve — verifier has no wallet
      const fetched = buildSavedSubmission();
      submissionsRepo.findOne.mockResolvedValue(fetched);
      verifierRecord.stellarAddress = null;

      await request(app.getHttpServer())
        .post(`/quests/${QUEST_ID}/submissions/${SUBMISSION_ID}/approve`)
        .set('X-Test-User-Id', VERIFIER_ID)
        .send({ notes: 'looks good' })
        .expect(HttpStatus.BAD_REQUEST);

      // CAS update must NOT have run (validator-before-CAS invariant).
      // If a future regression re-orders the verifier check after the CAS,
      // this assertion catches it.
      expect(submissionsRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(stellarService.approveSubmission).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // READ — GET /quests/:questId/submissions/:id
  // ──────────────────────────────────────────────────────────────────────
  describe('GET /quests/:questId/submissions/:id', () => {
    it('returns the submission when found', async () => {
      const found = buildSavedSubmission();
      submissionsRepo.findOne.mockResolvedValue(found);

      const res = await request(app.getHttpServer())
        .get(`/quests/${QUEST_ID}/submissions/${SUBMISSION_ID}`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.id).toBe(SUBMISSION_ID);
    });

    it('404 when not found', async () => {
      submissionsRepo.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/quests/${QUEST_ID}/submissions/does-not-exist`)
        .set('X-Test-User-Id', SUBMITTER_ID)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
