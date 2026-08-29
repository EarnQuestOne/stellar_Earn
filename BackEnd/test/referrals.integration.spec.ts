import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReferralsService } from '../src/modules/referrals/referrals.service';
import { ReferralsController } from '../src/modules/referrals/referrals.controller';
import {
  Referral,
  ReferralStatus,
} from '../src/modules/referrals/entities/referral.entity';
import {
  ReferralReward,
  ReferralRewardStatus,
} from '../src/modules/referrals/entities/referral-reward.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UsersService } from '../src/modules/users/users.service';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { ReferralRewardProcessor } from '../src/modules/jobs/processors/referral-reward.processor';
import { SubmissionsService } from '../src/modules/submissions/submissions.service';
import { Submission } from '../src/modules/submissions/entities/submission.entity';
import { Quest } from '../src/modules/quests/entities/quest.entity';
import { StellarSubmissionService } from '../src/modules/stellar/stellar-submission.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { MetricsService } from '../src/common/services/metrics.service';
import { VerificationDedupService } from '../src/common/services/verification-dedup.service';

describe('Referral Program Integration Test', () => {
  let module: TestingModule;
  let referralsService: ReferralsService;
  let referralsController: ReferralsController;
  let rewardProcessor: ReferralRewardProcessor;
  let submissionsService: SubmissionsService;

  // In-memory data stores for integration testing
  const usersStore = new Map<string, User>();
  const referralsStore = new Map<string, Referral>();
  const rewardsStore = new Map<string, ReferralReward>();
  const submissionsStore = new Map<string, Submission>();
  const questsStore = new Map<string, Quest>();

  const userA: User = {
    id: '11111111-1111-1111-1111-111111111111',
    stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    username: 'userA',
    role: 'USER',
    xp: 0,
    level: 1,
    calculateLevel: () => 1,
  } as any;

  const userB: User = {
    id: '22222222-2222-2222-2222-222222222222',
    stellarAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    username: 'userB',
    role: 'USER',
    xp: 0,
    level: 1,
    calculateLevel: () => 1,
  } as any;

  const mockQuest: Quest = {
    id: 'quest-101',
    contractTaskId: 'contract-task-1',
    title: 'First Onboarding Task',
    rewardAmount: 100,
    createdBy: userA.id,
    verifiers: [{ id: 'verifier-1' }],
  } as any;

  const verifierUser: User = {
    id: 'verifier-1',
    stellarAddress: 'GVERIFIER1111111111111111111111111111111111111111111111',
    username: 'verifier1',
    role: 'VERIFIER',
  } as any;

  beforeAll(async () => {
    usersStore.set(userA.id, userA);
    usersStore.set(userB.id, userB);
    usersStore.set(verifierUser.id, verifierUser);
    questsStore.set(mockQuest.id, mockQuest);

    const mockReferralsRepo = {
      create: jest.fn((dto) => {
        const entity = new Referral();
        Object.assign(entity, dto);
        entity.id = entity.id || `ref-${referralsStore.size + 1}`;
        entity.createdAt = new Date();
        entity.updatedAt = new Date();
        return entity;
      }),
      save: jest.fn((entity: Referral) => {
        entity.id = entity.id || `ref-${referralsStore.size + 1}`;
        referralsStore.set(entity.id, entity);
        return Promise.resolve(entity);
      }),
      findOne: jest.fn(({ where }: any) => {
        for (const ref of referralsStore.values()) {
          let match = true;
          if (where.id && ref.id !== where.id) match = false;
          if (
            where.referredUserId &&
            ref.referredUserId !== where.referredUserId
          )
            match = false;
          if (where.referrerId && ref.referrerId !== where.referrerId)
            match = false;
          if (where.status && ref.status !== where.status) match = false;
          if (match) return Promise.resolve(ref);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn(({ where }: any = {}) => {
        const results: Referral[] = [];
        for (const ref of referralsStore.values()) {
          let match = true;
          if (where?.referrerId && ref.referrerId !== where.referrerId)
            match = false;
          if (
            where?.referredUserId &&
            ref.referredUserId !== where.referredUserId
          )
            match = false;
          if (where?.status && ref.status !== where.status) match = false;
          if (match) results.push(ref);
        }
        return Promise.resolve(results);
      }),
    };

    const mockRewardsRepo = {
      create: jest.fn((dto) => {
        const entity = new ReferralReward();
        Object.assign(entity, dto);
        entity.id = entity.id || `reward-${rewardsStore.size + 1}`;
        entity.createdAt = new Date();
        entity.updatedAt = new Date();
        return entity;
      }),
      save: jest.fn((entity: ReferralReward) => {
        entity.id = entity.id || `reward-${rewardsStore.size + 1}`;
        rewardsStore.set(entity.id, entity);
        return Promise.resolve(entity);
      }),
      findOne: jest.fn(({ where }: any) => {
        for (const r of rewardsStore.values()) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.idempotencyKey && r.idempotencyKey !== where.idempotencyKey)
            match = false;
          if (where.referralId && r.referralId !== where.referralId)
            match = false;
          if (where.recipientId && r.recipientId !== where.recipientId)
            match = false;
          if (match) return Promise.resolve(r);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn(({ where }: any = {}) => {
        const results: ReferralReward[] = [];
        for (const r of rewardsStore.values()) {
          let match = true;
          if (where?.recipientId && r.recipientId !== where.recipientId)
            match = false;
          if (where?.referralId && r.referralId !== where.referralId)
            match = false;
          if (match) results.push(r);
        }
        return Promise.resolve(results);
      }),
    };

    const mockUsersRepo = {
      findOne: jest.fn(({ where }: any) => {
        for (const u of usersStore.values()) {
          if (where.id && u.id === where.id) return Promise.resolve(u);
          if (where.username && u.username === where.username)
            return Promise.resolve(u);
          if (where.stellarAddress && u.stellarAddress === where.stellarAddress)
            return Promise.resolve(u);
        }
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn((_clause, params) => {
          const prefix = params?.prefix?.replace(/[%]/g, '').toUpperCase();
          for (const u of usersStore.values()) {
            if (
              prefix &&
              u.id.replace(/-/g, '').toUpperCase().startsWith(prefix)
            ) {
              return {
                getOne: () => Promise.resolve(u),
              };
            }
          }
          return { getOne: () => Promise.resolve(null) };
        }),
      })),
    };

    const mockSubmissionsRepo = {
      create: jest.fn((dto) => ({
        ...dto,
        id: 'sub-1',
        createdAt: new Date(),
      })),
      save: jest.fn((e) => {
        submissionsStore.set(e.id, e);
        return Promise.resolve(e);
      }),
      findOne: jest.fn(({ where }: any) => {
        if (where.id)
          return Promise.resolve(submissionsStore.get(where.id) || null);
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    const mockQuestsRepo = {
      findOne: jest.fn(({ where }: any) => {
        if (where.id) return Promise.resolve(questsStore.get(where.id) || null);
        return Promise.resolve(null);
      }),
    };

    module = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        ReferralsService,
        ReferralRewardProcessor,
        SubmissionsService,
        {
          provide: getRepositoryToken(Referral),
          useValue: mockReferralsRepo,
        },
        {
          provide: getRepositoryToken(ReferralReward),
          useValue: mockRewardsRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepo,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionsRepo,
        },
        {
          provide: getRepositoryToken(Quest),
          useValue: mockQuestsRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'APP_URL') return 'https://stellarearn.com';
              return null;
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn((id) =>
              Promise.resolve(usersStore.get(id) || null),
            ),
            applyReputationDeltaAtomic: jest.fn((id, delta) => {
              const u = usersStore.get(id);
              if (u) u.xp = (u.xp || 0) + delta;
              return Promise.resolve({ userId: id, newXp: u?.xp });
            }),
          },
        },
        {
          provide: JobsService,
          useValue: {
            addJob: jest.fn((queue, data) =>
              rewardProcessor.process({
                id: 'bullmq-job-1',
                timestamp: Date.now(),
                data,
              } as any),
            ),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: StellarSubmissionService,
          useValue: {
            approveSubmission: jest
              .fn()
              .mockResolvedValue({ hash: '0xtxhash' }),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendSubmissionApproved: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCounter: jest.fn(),
            observeHistogram: jest.fn(),
          },
        },
        {
          provide: VerificationDedupService,
          useValue: {
            executeWithDedup: jest.fn((_key, fn) => fn()),
          },
        },
      ],
    }).compile();

    referralsService = module.get<ReferralsService>(ReferralsService);
    referralsController = module.get<ReferralsController>(ReferralsController);
    rewardProcessor = module.get<ReferralRewardProcessor>(
      ReferralRewardProcessor,
    );
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
  });

  it('Flow: Referral Code Generation -> Signup Attribution -> Anti-Abuse -> Qualifying Milestone -> Idempotent Reward Ledger', async () => {
    // 1. User A obtains their referral code
    const codeDto = referralsController.getMyReferralCode({
      id: userA.id,
      stellarAddress: userA.stellarAddress ?? '',
      role: userA.role,
    });
    expect(codeDto.code).toBe('REF-11111111');
    expect(codeDto.referralLink).toBe(
      'https://stellarearn.com/signup?ref=REF-11111111',
    );

    // 2. Anti-abuse check: User A cannot refer themselves
    await expect(
      referralsService.recordAttribution(userA.id, 'REF-11111111'),
    ).rejects.toThrow(BadRequestException);

    // 3. User B signs up using User A's referral code
    const attributionResult = await referralsController.attributeReferral(
      { code: 'REF-11111111' },
      {
        id: userB.id,
        stellarAddress: userB.stellarAddress ?? '',
        role: userB.role,
      },
    );
    expect(attributionResult.success).toBe(true);
    expect(attributionResult.status).toBe(ReferralStatus.PENDING);

    // Verify attribution state in User A's referrals list
    const userAReferrals = await referralsController.getMyReferrals({
      id: userA.id,
      stellarAddress: userA.stellarAddress ?? '',
      role: userA.role,
    });
    expect(userAReferrals.total).toBe(1);
    expect(userAReferrals.pending).toBe(1);
    expect(userAReferrals.referrals[0].referredUserId).toBe(userB.id);

    // 4. Anti-abuse check: Duplicate referral for User B is rejected
    await expect(
      referralsService.recordAttribution(userB.id, 'REF-11111111'),
    ).rejects.toThrow(ConflictException);

    // 5. Anti-abuse check: Circular attribution (User A using User B's code) is rejected
    const userBCode = referralsService.generateReferralCode(userB.id);
    expect(userBCode).toBe('REF-22222222');
    await expect(
      referralsService.recordAttribution(userA.id, userBCode),
    ).rejects.toThrow(BadRequestException);

    // 6. User B submits work and verifier approves the submission (Qualifying Milestone)
    const initialSubmission: Submission = {
      id: 'sub-user-b-1',
      userId: userB.id,
      questId: mockQuest.id,
      user: userB,
      quest: mockQuest,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 60000),
    } as any;
    submissionsStore.set(initialSubmission.id, initialSubmission);

    // Verifier approves the submission
    await submissionsService.approveSubmission(
      initialSubmission.id,
      { notes: 'Great work on first task' },
      'verifier-1',
    );

    // Verify that the referral transitioned to QUALIFIED and then REWARDED
    const updatedReferral = await referralsService.getReferralsForUser(
      userA.id,
    );
    expect(updatedReferral.rewarded).toBe(1);
    expect(updatedReferral.pending).toBe(0);
    expect(updatedReferral.referrals[0].status).toBe(ReferralStatus.REWARDED);

    // 7. Verify reward ledger for User A
    const userARewards = await referralsController.getMyRewards({
      id: userA.id,
      stellarAddress: userA.stellarAddress ?? '',
      role: userA.role,
    });
    expect(userARewards.totalRewards).toBe(1);
    expect(userARewards.totalAmount).toBe(50);
    expect(userARewards.rewards[0].asset).toBe('XLM');
    expect(userARewards.rewards[0].status).toBe(ReferralRewardStatus.CREDITED);

    // 8. Idempotency test: Re-executing reward crediting for the same referral produces no duplicate ledger entry
    const reProcessResult = await rewardProcessor.process({
      id: 'bullmq-retry-job',
      timestamp: Date.now(),
      data: {
        referralId: updatedReferral.referrals[0].id,
      },
    } as any);
    expect(reProcessResult.success).toBe(true);
    expect(reProcessResult.data.alreadyRewarded).toBe(true);

    const userARewardsAfterRetry = await referralsController.getMyRewards({
      id: userA.id,
      stellarAddress: userA.stellarAddress ?? '',
      role: userA.role,
    });
    expect(userARewardsAfterRetry.totalRewards).toBe(1);
    expect(userARewardsAfterRetry.totalAmount).toBe(50);
  });
});
