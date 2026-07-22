import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { QuotaConfig } from './entities/quota-config.entity';
import { QuotaUsage, QuotaResourceType } from './entities/quota-usage.entity';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeConfig = (overrides: Partial<QuotaConfig> = {}): QuotaConfig => ({
  id: 'cfg-1',
  tenantId: 'TENANT_A',
  maxQuestsPerPeriod: 5,
  maxPayoutAmountPerPeriod: 1000,
  maxSinglePayoutAmount: 200,
  periodSeconds: 86400,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeUsage = (overrides: Partial<QuotaUsage> = {}): QuotaUsage => ({
  id: 'usage-1',
  tenantId: 'TENANT_A',
  resourceType: QuotaResourceType.QUEST,
  periodStart: new Date('2026-06-01T00:00:00.000Z'),
  questCount: 0,
  payoutAmount: 0,
  createdAt: new Date(),
  ...overrides,
});

// ─── Mock factories ───────────────────────────────────────────────────────────

/** Returns a fully chainable query builder mock. */
const makeQb = () => {
  const qb: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;
  for (const m of [
    'insert',
    'into',
    'values',
    'orIgnore',
    'update',
    'set',
    'where',
    'setParameter',
    'setParameters',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb['execute'] = jest.fn().mockResolvedValue(undefined);
  return qb;
};

const mockConfigRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockUsageRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(),
});

/** EntityManager mock passed to the transaction callback. */
const makeMockManager = () => ({
  createQueryBuilder: jest.fn(() => makeQb()),
  findOne: jest.fn(),
  increment: jest.fn().mockResolvedValue(undefined),
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('QuotaService', () => {
  let service: QuotaService;
  let configRepo: ReturnType<typeof mockConfigRepo>;
  let usageRepo: ReturnType<typeof mockUsageRepo>;
  let mockManager: ReturnType<typeof makeMockManager>;
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    configRepo = mockConfigRepo();
    usageRepo = mockUsageRepo();
    mockManager = makeMockManager();
    mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof mockManager) => Promise<unknown>) =>
          cb(mockManager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: getRepositoryToken(QuotaConfig), useValue: configRepo },
        { provide: getRepositoryToken(QuotaUsage), useValue: usageRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getPeriodStart ──────────────────────────────────────────────────────

  describe('getPeriodStart', () => {
    it('returns the floored period start for a daily period', () => {
      const config = makeConfig({ periodSeconds: 86400 });
      const now = new Date('2026-06-01T15:30:00.000Z');
      const result = service.getPeriodStart(config, now);
      expect(result.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    it('returns the floored period start for an hourly period', () => {
      const config = makeConfig({ periodSeconds: 3600 });
      const now = new Date('2026-06-01T15:45:00.000Z');
      const result = service.getPeriodStart(config, now);
      expect(result.toISOString()).toBe('2026-06-01T15:00:00.000Z');
    });
  });

  // ─── getConfig ───────────────────────────────────────────────────────────

  describe('getConfig', () => {
    it('returns config when found', async () => {
      const config = makeConfig();
      configRepo.findOne.mockResolvedValue(config);
      const result = await service.getConfig('TENANT_A');
      expect(result).toBe(config);
    });

    it('returns null when not found', async () => {
      configRepo.findOne.mockResolvedValue(null);
      const result = await service.getConfig('UNKNOWN');
      expect(result).toBeNull();
    });
  });

  // ─── setConfig ───────────────────────────────────────────────────────────

  describe('setConfig', () => {
    it('creates a new config when none exists', async () => {
      configRepo.findOne.mockResolvedValue(null);
      const newConfig = makeConfig();
      configRepo.create.mockReturnValue(newConfig);
      configRepo.save.mockResolvedValue(newConfig);

      const result = await service.setConfig('TENANT_A', {
        maxQuestsPerPeriod: 10,
      });
      expect(configRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'TENANT_A',
          maxQuestsPerPeriod: 10,
        }),
      );
      expect(result).toBe(newConfig);
    });

    it('updates existing config', async () => {
      const existing = makeConfig();
      configRepo.findOne.mockResolvedValue(existing);
      configRepo.save.mockResolvedValue({
        ...existing,
        maxQuestsPerPeriod: 20,
      });

      const result = await service.setConfig('TENANT_A', {
        maxQuestsPerPeriod: 20,
      });
      expect(result.maxQuestsPerPeriod).toBe(20);
    });
  });

  // ─── enforceQuestCreationQuota ───────────────────────────────────────────

  describe('enforceQuestCreationQuota', () => {
    it('does nothing when no config exists', async () => {
      configRepo.findOne.mockResolvedValue(null);
      await expect(
        service.enforceQuestCreationQuota('TENANT_A'),
      ).resolves.toBeUndefined();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('does nothing when maxQuestsPerPeriod is null (unlimited)', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxQuestsPerPeriod: null }),
      );
      await expect(
        service.enforceQuestCreationQuota('TENANT_A'),
      ).resolves.toBeUndefined();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('runs check-and-increment inside a transaction', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 3 }));

      await service.enforceQuestCreationQuota('TENANT_A');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('increments quest count inside the transaction when under limit', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      const usage = makeUsage({ questCount: 3 });
      mockManager.findOne.mockResolvedValue(usage);

      await service.enforceQuestCreationQuota('TENANT_A');

      expect(mockManager.increment).toHaveBeenCalledWith(
        QuotaUsage,
        { id: usage.id },
        'questCount',
        1,
      );
    });

    it('acquires a pessimistic_write lock on the usage row', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 0 }));

      await service.enforceQuestCreationQuota('TENANT_A');

      expect(mockManager.findOne).toHaveBeenCalledWith(
        QuotaUsage,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('throws ForbiddenException when quest limit is reached', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 5 }));

      await expect(
        service.enforceQuestCreationQuota('TENANT_A'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockManager.increment).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when quest limit is exceeded', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 6 }));

      await expect(
        service.enforceQuestCreationQuota('TENANT_A'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a new usage row before locking (orIgnore insert)', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 0 }));

      await service.enforceQuestCreationQuota('TENANT_A');

      const qb = mockManager.createQueryBuilder.mock.results[0].value;
      expect(qb.insert).toHaveBeenCalled();
      expect(qb.orIgnore).toHaveBeenCalled();
    });

    // ── Concurrency regression ──────────────────────────────────────────────
    //
    // True concurrency safety is guaranteed by the DB-level SELECT FOR UPDATE
    // lock (pessimistic_write). The tests below verify that every call runs
    // inside its own transaction and that the boundary condition is enforced
    // within the locked read, so no concurrent request can slip past a stale
    // questCount.

    it('issues each concurrent call through a separate transaction', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 10 }));
      mockManager.findOne.mockResolvedValue(makeUsage({ questCount: 0 }));

      const N = 5;
      await Promise.all(
        Array.from({ length: N }, () =>
          service.enforceQuestCreationQuota('TENANT_A'),
        ),
      );

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(N);
    });

    it('rejects requests that see a locked row already at the limit', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ maxQuestsPerPeriod: 5 }));

      let served = 0;
      mockManager.findOne.mockImplementation(async () =>
        makeUsage({ questCount: served++ < 5 ? served - 1 : 5 }),
      );

      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          service.enforceQuestCreationQuota('TENANT_A'),
        ),
      );

      const rejected = results.filter((r) => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // ─── enforcePayoutQuota ──────────────────────────────────────────────────

  describe('enforcePayoutQuota', () => {
    it('does nothing when no config exists', async () => {
      configRepo.findOne.mockResolvedValue(null);
      await expect(
        service.enforcePayoutQuota('TENANT_A', 100),
      ).resolves.toBeUndefined();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when single payout exceeds limit', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: 200 }),
      );
      await expect(
        service.enforcePayoutQuota('TENANT_A', 201),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('does nothing when maxPayoutAmountPerPeriod is null (unlimited)', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({
          maxSinglePayoutAmount: null,
          maxPayoutAmountPerPeriod: null,
        }),
      );
      await expect(
        service.enforcePayoutQuota('TENANT_A', 9999),
      ).resolves.toBeUndefined();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('runs period check-and-increment inside a transaction', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 500 }),
      );

      await service.enforcePayoutQuota('TENANT_A', 300);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('acquires a pessimistic_write lock on the payout usage row', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 0 }),
      );

      await service.enforcePayoutQuota('TENANT_A', 100);

      expect(mockManager.findOne).toHaveBeenCalledWith(
        QuotaUsage,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('increments payout amount when under period limit', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 500 }),
      );

      await service.enforcePayoutQuota('TENANT_A', 300);

      const qb = mockManager.createQueryBuilder.mock.results.find(
        (r) => r.value.update.mock?.calls?.length > 0,
      )?.value;
      expect(qb?.execute).toHaveBeenCalled();
    });

    it('throws ForbiddenException when period payout limit would be exceeded', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 800 }),
      );

      await expect(
        service.enforcePayoutQuota('TENANT_A', 300),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows payout exactly at the period limit', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 700 }),
      );

      await expect(
        service.enforcePayoutQuota('TENANT_A', 300),
      ).resolves.toBeUndefined();
    });

    // ── Concurrency regression ──────────────────────────────────────────────

    it('issues each concurrent payout call through a separate transaction', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 10000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 0 }),
      );

      const N = 5;
      await Promise.all(
        Array.from({ length: N }, () =>
          service.enforcePayoutQuota('TENANT_A', 100),
        ),
      );

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(N);
    });

    it('rejects a payout that would exceed the period limit under the lock', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      // Simulate the locked row showing the period already full
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 900 }),
      );

      await expect(
        service.enforcePayoutQuota('TENANT_A', 200),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uses bound parameters and does not interpolate amount into SQL string with adversarial/boundary values', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 100 }),
      );

      const adversarialAmount = '1 OR 1=1' as unknown as number;
      await service.enforcePayoutQuota('TENANT_A', adversarialAmount);

      const qb = mockManager.createQueryBuilder.mock.results.find(
        (r) => r.value.update.mock?.calls?.length > 0,
      )?.value;

      expect(qb).toBeDefined();
      expect(qb.set).toHaveBeenCalledTimes(1);

      const setArg = qb.set.mock.calls[0][0];
      expect(typeof setArg.payoutAmount).toBe('function');
      const sqlSnippet = setArg.payoutAmount();

      expect(sqlSnippet).toBe('"payoutAmount" + :amount');
      expect(sqlSnippet).not.toContain('1 OR 1=1');
      expect(qb.setParameter).toHaveBeenCalledWith('amount', adversarialAmount);
    });

    it('handles numeric boundary amount values safely with bound parameters', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ maxSinglePayoutAmount: null, maxPayoutAmountPerPeriod: 1000 }),
      );
      mockManager.findOne.mockResolvedValue(
        makeUsage({ resourceType: QuotaResourceType.PAYOUT, payoutAmount: 100 }),
      );

      const boundaryAmount = 0.00000001;
      await service.enforcePayoutQuota('TENANT_A', boundaryAmount);

      const qb = mockManager.createQueryBuilder.mock.results.find(
        (r) => r.value.update.mock?.calls?.length > 0,
      )?.value;

      expect(qb).toBeDefined();
      expect(qb.setParameter).toHaveBeenCalledWith('amount', boundaryAmount);
    });
  });
});
