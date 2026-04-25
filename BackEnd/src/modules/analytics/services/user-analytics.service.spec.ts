import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserAnalyticsService } from './user-analytics.service';
import { CacheService } from './cache.service';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import { User as AnalyticsUser } from '../entities/user.entity';

const buildSelectableQueryBuilder = (rows: any[]) => {
  const builder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue({}),
    getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
  };
  return builder;
};

describe('UserAnalyticsService (N+1 prevention)', () => {
  let service: UserAnalyticsService;
  let userRepo: any;
  let submissionRepo: any;
  let payoutRepo: any;
  let cacheService: any;

  const usersBatch: Partial<AnalyticsUser>[] = [
    { id: 'u1', stellarAddress: 'GA1', username: 'alice', totalXp: 100, level: 1, questsCompleted: 1, badges: [], createdAt: new Date() },
    { id: 'u2', stellarAddress: 'GA2', username: 'bob', totalXp: 50, level: 1, questsCompleted: 0, badges: [], createdAt: new Date() },
    { id: 'u3', stellarAddress: 'GA3', username: 'carol', totalXp: 200, level: 2, questsCompleted: 2, badges: [], createdAt: new Date() },
  ];

  beforeEach(async () => {
    userRepo = {
      createQueryBuilder: jest.fn(),
      count: jest.fn().mockResolvedValue(usersBatch.length),
    };

    submissionRepo = {
      createQueryBuilder: jest.fn(),
    };

    payoutRepo = {
      createQueryBuilder: jest.fn(),
    };

    cacheService = {
      generateKey: jest.fn().mockReturnValue('key'),
      wrap: jest.fn().mockImplementation((_key: string, fn: () => any) => fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAnalyticsService,
        { provide: getRepositoryToken(AnalyticsUser), useValue: userRepo },
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<UserAnalyticsService>(UserAnalyticsService);
  });

  it('batch-loads submissions, payouts, and activity history in 3 queries regardless of user count', async () => {
    // First call: top-level user select.
    const userListBuilder = buildSelectableQueryBuilder(usersBatch);

    // Batched relation queries built inside loadUserMetricsRelations.
    const submissionsBatchBuilder = buildSelectableQueryBuilder([
      { id: 's1', status: SubmissionStatus.APPROVED, submittedAt: new Date(), reviewedAt: new Date(), user: { id: 'u1' } },
      { id: 's2', status: SubmissionStatus.APPROVED, submittedAt: new Date(), reviewedAt: new Date(), user: { id: 'u3' } },
    ]);
    const payoutsBatchBuilder = buildSelectableQueryBuilder([
      { id: 'p1', amount: '500', recipient: { id: 'u1' } },
      { id: 'p2', amount: '300', recipient: { id: 'u3' } },
    ]);
    const activityBatchBuilder = buildSelectableQueryBuilder([
      { userId: 'u1', date: new Date('2026-01-01'), submissions: '1', questsCompleted: '1' },
      { userId: 'u3', date: new Date('2026-01-02'), submissions: '1', questsCompleted: '1' },
    ]);

    // calculateSummary, calculateCohortAnalysis, getUserGrowth issue further
    // queries — return empty-ish builders that cover all the methods used.
    const summaryBuilder = buildSelectableQueryBuilder([]);
    summaryBuilder.getRawOne = jest.fn().mockResolvedValue({ count: '0', avg: '0' });

    submissionRepo.createQueryBuilder
      .mockReturnValueOnce(submissionsBatchBuilder) // submissions for batch
      .mockReturnValueOnce(activityBatchBuilder) // activity history for batch
      .mockReturnValue(summaryBuilder);
    payoutRepo.createQueryBuilder.mockReturnValueOnce(payoutsBatchBuilder);
    userRepo.createQueryBuilder
      .mockReturnValueOnce(userListBuilder)
      .mockReturnValue(summaryBuilder);

    const result = await service.getUserAnalytics({} as any);

    // The legacy implementation called submissionRepository.find() per user
    // (N queries) and payoutRepository.find() per user (another N) and a
    // separate activity-history query per user (yet another N). None of
    // those paths should fire now.
    expect(submissionRepo.find).toBeUndefined();
    expect(payoutRepo.find).toBeUndefined();

    // Exactly one batched query each for submissions, payouts and activity.
    expect(submissionsBatchBuilder.getMany).toHaveBeenCalledTimes(1);
    expect(payoutsBatchBuilder.getMany).toHaveBeenCalledTimes(1);
    expect(activityBatchBuilder.getRawMany).toHaveBeenCalledTimes(1);

    // Both calls must scope by the entire user-id batch in one shot.
    expect(submissionsBatchBuilder.where).toHaveBeenCalledWith(
      'user.id IN (:...userIds)',
      { userIds: ['u1', 'u2', 'u3'] },
    );
    expect(payoutsBatchBuilder.where).toHaveBeenCalledWith(
      'recipient.id IN (:...userIds)',
      { userIds: ['u1', 'u2', 'u3'] },
    );
    expect(activityBatchBuilder.where).toHaveBeenCalledWith(
      'submission.userId IN (:...userIds)',
      { userIds: ['u1', 'u2', 'u3'] },
    );

    // Per-user metrics are still produced from the in-memory groupings.
    expect(result.users).toHaveLength(3);
    const alice = result.users.find((u) => u.stellarAddress === 'GA1')!;
    expect(alice.totalSubmissions).toBe(1);
    expect(alice.approvedSubmissions).toBe(1);
    expect(alice.totalRewardsEarned).toBe('500');
    const bob = result.users.find((u) => u.stellarAddress === 'GA2')!;
    expect(bob.totalSubmissions).toBe(0);
    expect(bob.totalRewardsEarned).toBe('0');
  });

  it('skips batch relation queries entirely when the user batch is empty', async () => {
    const userListBuilder = buildSelectableQueryBuilder([]);
    const summaryBuilder = buildSelectableQueryBuilder([]);
    summaryBuilder.getRawOne = jest.fn().mockResolvedValue({ count: '0', avg: '0' });

    userRepo.createQueryBuilder
      .mockReturnValueOnce(userListBuilder)
      .mockReturnValue(summaryBuilder);
    submissionRepo.createQueryBuilder.mockReturnValue(summaryBuilder);
    payoutRepo.createQueryBuilder.mockReturnValue(summaryBuilder);

    const result = await service.getUserAnalytics({} as any);

    expect(result.users).toEqual([]);
    // The batched submission/payout/activity builders for relations should
    // never be constructed when there are no users to look up.
    expect(payoutRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
