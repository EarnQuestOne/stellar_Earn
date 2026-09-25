import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';
import { Payout, PayoutStatus, PayoutType } from './entities/payout.entity';
import { PayoutsService } from './payouts.service';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import { IdempotencyService } from './services/idempotency.service';
import { QuotaService } from '../quota/quota.service';
import { MetricsService } from '../../common/services/metrics.service';
import { JobsService } from '../jobs/jobs.service';
import { StellarService } from '../stellar/stellar.service';
import { BulkheadService } from '../../common/services/bulkhead.service';
import { QUEUES } from '../jobs/jobs.constants';
import { JobResultStatusCacheService } from '../jobs/services/job-result-status-cache.service';
import { encodeCursor } from '../../common/dto/pagination.dto';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const buildPayout = (overrides: Partial<Payout> = {}): Payout =>
  ({
    id: 'payout-1',
    stellarAddress: 'G'.padEnd(56, 'A'),
    amount: 10,
    asset: 'XLM',
    status: PayoutStatus.PROCESSING,
    type: PayoutType.QUEST_REWARD,
    questId: 'quest-1',
    submissionId: 'submission-1',
    transactionHash: null,
    stellarLedger: null,
    settlementConfirmations: 0,
    settlementConfirmedAt: null,
    failureReason: null,
    retryCount: 0,
    maxRetries: 5,
    nextRetryAt: null,
    processedAt: null,
    claimedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    canRetry: Payout.prototype.canRetry,
    isClaimable: jest.fn().mockReturnValue(false),
    ...overrides,
  }) as Payout;

describe('PayoutsService settlement finality', () => {
  let service: PayoutsService;
  let repo: ReturnType<typeof mockRepo>;
  let config: { get: jest.Mock };
  let emitter: { emit: jest.Mock };
  let metrics: { incrementCounter: jest.Mock };
  let jobs: { addJob: jest.Mock };
  let stellarService: { sendPayment: jest.Mock; sendBatchPayments: jest.Mock };
  let idempotencyService: {
    computeFingerprint: jest.Mock;
    computeBodyHash: jest.Mock;
    tryAcquire: jest.Mock;
    complete: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = mockRepo();
    repo.save.mockImplementation(async (payout) => payout);
    config = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'test',
          STELLAR_FINALITY_CONFIRMATIONS: 3,
        };
        return values[key] ?? defaultValue;
      }),
    };
    emitter = { emit: jest.fn() };
    metrics = { incrementCounter: jest.fn(), registerCounter: jest.fn() };
    jobs = { addJob: jest.fn().mockResolvedValue({ id: 'dead-letter-job' }) };
    stellarService = {
      sendPayment: jest.fn(),
      sendBatchPayments: jest.fn(),
    };
    idempotencyService = {
      computeFingerprint: jest.fn().mockReturnValue('fingerprint-123'),
      computeBodyHash: jest.fn().mockReturnValue('body-hash-123'),
      tryAcquire: jest.fn().mockResolvedValue({ acquired: true }),
      complete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: emitter },
        { provide: FraudRiskRulesService, useValue: {} },
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: jobs },
        { provide: StellarService, useValue: stellarService },
        {
          provide: BulkheadService,
          useValue: {
            runWithBulkhead: (_n: string, fn: () => Promise<unknown>) => fn(),
          },
        },
        {
          provide: JobResultStatusCacheService,
          useValue: {
            getPayoutPoll: jest.fn(),
            setPayoutPoll: jest.fn(),
            invalidatePayout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps a submitted payout processing until the finality depth is reached', async () => {
    const payout = buildPayout();
    repo.findOne.mockResolvedValue(payout);
    jest
      .spyOn(service as any, 'executeStellarPayment')
      .mockResolvedValue({ transactionHash: 'tx-123', ledger: 100 });
    jest
      .spyOn(service as any, 'getCurrentStellarLedger')
      .mockResolvedValue(101);

    await service.processPayout(payout.id);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PayoutStatus.PROCESSING,
        transactionHash: 'tx-123',
        stellarLedger: 100,
        settlementConfirmations: 2,
        processedAt: null,
        settlementConfirmedAt: null,
      }),
    );
    expect(emitter.emit).not.toHaveBeenCalledWith(
      'payout.processed',
      expect.anything(),
    );
  });

  it('marks a payout completed only after settlement finality is confirmed', async () => {
    const payout = buildPayout();
    repo.findOne.mockResolvedValue(payout);
    jest
      .spyOn(service as any, 'executeStellarPayment')
      .mockResolvedValue({ transactionHash: 'tx-123', ledger: 100 });
    jest
      .spyOn(service as any, 'getCurrentStellarLedger')
      .mockResolvedValue(102);

    await service.processPayout(payout.id);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PayoutStatus.COMPLETED,
        transactionHash: 'tx-123',
        stellarLedger: 100,
        settlementConfirmations: 3,
        nextRetryAt: null,
      }),
    );
    expect(payout.processedAt).toBeInstanceOf(Date);
    expect(payout.settlementConfirmedAt).toBeInstanceOf(Date);
    expect(emitter.emit).toHaveBeenCalledWith(
      'payout.processed',
      expect.objectContaining({ transactionHash: 'tx-123' }),
    );
  });

  it('confirms previously submitted processing payouts without resubmitting payment', async () => {
    const payout = buildPayout({
      transactionHash: 'tx-123',
      stellarLedger: 100,
      nextRetryAt: new Date(Date.now() - 1000),
    });
    repo.find.mockResolvedValue([payout]);
    const executeSpy = jest.spyOn(service as any, 'executeStellarPayment');
    jest
      .spyOn(service as any, 'getCurrentStellarLedger')
      .mockResolvedValue(105);

    await service.confirmPendingSettlements();

    expect(executeSpy).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PayoutStatus.COMPLETED,
        settlementConfirmations: 6,
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'payout.processed',
      expect.objectContaining({ payoutId: payout.id }),
    );
  });

  it('schedules failed Stellar submissions for exponential backoff retry', async () => {
    const now = Date.parse('2026-06-25T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const payout = buildPayout();
    repo.findOne.mockResolvedValue(payout);
    jest
      .spyOn(service as any, 'executeStellarPayment')
      .mockRejectedValue(new Error('Horizon timeout'));

    await service.processPayout(payout.id);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PayoutStatus.RETRY_SCHEDULED,
        retryCount: 1,
        maxRetries: 5,
        failureReason: 'Horizon timeout',
        nextRetryAt: new Date(now + 5 * 60 * 1000),
      }),
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_failures_total',
      { asset: 'XLM', outcome: 'retry_scheduled' },
    );
  });

  it('moves exhausted payout retries to dead letter and alerts admins', async () => {
    const payout = buildPayout({ retryCount: 4, maxRetries: 5 });
    repo.findOne.mockResolvedValue(payout);
    jest
      .spyOn(service as any, 'executeStellarPayment')
      .mockRejectedValue(new Error('Stellar submission failed'));

    await service.processPayout(payout.id);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'dead_letter',
        retryCount: 5,
        maxRetries: 5,
        failureReason: 'Stellar submission failed',
        nextRetryAt: null,
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'payout.dead_lettered',
      expect.objectContaining({
        payoutId: payout.id,
        asset: 'XLM',
        retryCount: 5,
        reason: 'Stellar submission failed',
      }),
    );
    expect(jobs.addJob).toHaveBeenCalledWith(
      QUEUES.DEAD_LETTER,
      expect.objectContaining({
        failedJob: expect.objectContaining({
          id: payout.id,
          name: 'payout.settlement',
          failedReason: 'Stellar submission failed',
          data: {
            payoutId: payout.id,
            asset: 'XLM',
            retryCount: 5,
          },
        }),
      }),
      expect.objectContaining({
        jobId: `payout-${payout.id}-dead-letter`,
      }),
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_failures_total',
      { asset: 'XLM', outcome: 'dead_letter' },
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_dead_letter_total',
      { asset: 'XLM' },
    );
  });

  it('uses stable keyset pagination and emits a cursor for the next page', async () => {
    const rows = [
      buildPayout({
        id: 'payout-3',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      }),
      buildPayout({
        id: 'payout-2',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
      buildPayout({
        id: 'payout-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ];
    const queryBuilder = {
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      take: jest.fn(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    repo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getPayoutHistory({ limit: 2 });

    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'payout.createdAt',
      'DESC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('payout.id', 'DESC');
    expect(queryBuilder.take).toHaveBeenCalledWith(3);
    expect(result.data.map((payout) => payout.id)).toEqual([
      'payout-3',
      'payout-2',
    ]);
    expect(result.nextCursor).toBe(
      encodeCursor({
        createdAt: rows[1].createdAt,
        id: rows[1].id,
      }),
    );
    expect(result.hasMore).toBe(true);
  });

  it('applies the cursor boundary before fetching the next page', async () => {
    const queryBuilder = {
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      take: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    repo.createQueryBuilder.mockReturnValue(queryBuilder);
    const cursor = encodeCursor({
      createdAt: '2026-01-02T00:00:00.000Z',
      id: 'payout-2',
    });

    await service.getPayoutHistory({ cursor, limit: 10 }, 'user-address');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'payout.stellarAddress = :address',
      { address: 'user-address' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(payout.createdAt < :cv OR (payout.createdAt = :cv AND payout.id < :idv))',
      { cv: '2026-01-02T00:00:00.000Z', idv: 'payout-2' },
    );
  });
});

describe('PayoutsService.processBatchPayouts', () => {
  let service: PayoutsService;
  let repo: ReturnType<typeof mockRepo>;
  let config: { get: jest.Mock };
  let emitter: { emit: jest.Mock };
  let metrics: { incrementCounter: jest.Mock; observeHistogram: jest.Mock };
  let jobs: { addJob: jest.Mock };
  let stellarService: { sendPayment: jest.Mock; sendBatchPayments: jest.Mock };

  beforeEach(async () => {
    repo = mockRepo();
    repo.save.mockImplementation(async (payout) => payout);
    config = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'test',
          STELLAR_FINALITY_CONFIRMATIONS: 3,
        };
        return values[key] ?? defaultValue;
      }),
    };
    emitter = { emit: jest.fn() };
    metrics = {
      incrementCounter: jest.fn(),
      observeHistogram: jest.fn(),
      registerCounter: jest.fn(),
    };
    jobs = { addJob: jest.fn().mockResolvedValue({ id: 'dead-letter-job' }) };
    stellarService = {
      sendPayment: jest.fn(),
      sendBatchPayments: jest.fn().mockResolvedValue([
        {
          transactionHash: 'batch-tx-hash',
          ledger: 42,
          operations: [
            { destination: 'G'.padEnd(56, 'A'), amount: 10, success: true },
          ],
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: emitter },
        { provide: FraudRiskRulesService, useValue: {} },
        {
          provide: IdempotencyService,
          useValue: {
            computeFingerprint: jest.fn().mockReturnValue('fp'),
            computeBodyHash: jest.fn().mockReturnValue('bh'),
            tryAcquire: jest.fn().mockResolvedValue({ acquired: true }),
            complete: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: jobs },
        { provide: StellarService, useValue: stellarService },
        {
          provide: BulkheadService,
          useValue: { runWithBulkhead: jest.fn((_name, fn) => fn()) },
        },
        {
          provide: JobResultStatusCacheService,
          useValue: {
            getPayoutPoll: jest.fn(),
            setPayoutPoll: jest.fn(),
            invalidatePayout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('groups payouts by asset and processes them in batches', async () => {
    const xlmPayout1 = buildPayout({
      id: 'p1',
      stellarAddress: 'G'.padEnd(56, 'A'),
      amount: 10,
      asset: 'XLM',
      status: PayoutStatus.PENDING,
    });
    const xlmPayout2 = buildPayout({
      id: 'p2',
      stellarAddress: 'G'.padEnd(56, 'B'),
      amount: 20,
      asset: 'XLM',
      status: PayoutStatus.PENDING,
    });
    const usdcPayout = buildPayout({
      id: 'p3',
      stellarAddress: 'G'.padEnd(56, 'C'),
      amount: 5,
      asset: 'USDC',
      status: PayoutStatus.PENDING,
    });

    repo.find
      .mockResolvedValueOnce([xlmPayout1, xlmPayout2, usdcPayout])
      .mockResolvedValueOnce([]);

    await service.processBatchPayouts();

    expect(stellarService.sendBatchPayments).toHaveBeenCalledTimes(2);

    const xlmCall = stellarService.sendBatchPayments.mock.calls.find(
      (c: any) => c[0][0].asset === 'XLM',
    );
    const usdcCall = stellarService.sendBatchPayments.mock.calls.find(
      (c: any) => c[0][0].asset === 'USDC',
    );
    expect(xlmCall).toBeDefined();
    expect(xlmCall[0]).toHaveLength(2);
    expect(usdcCall).toBeDefined();
    expect(usdcCall[0]).toHaveLength(1);
  });

  it('respects the 100-operation limit by chunking large groups', async () => {
    const payouts = Array.from({ length: 150 }, (_, i) =>
      buildPayout({
        id: `p${i}`,
        stellarAddress: `G${String(i).padStart(55, '0')}`,
        amount: i + 1,
        asset: 'XLM',
        status: PayoutStatus.PENDING,
      }),
    );

    repo.find.mockResolvedValueOnce(payouts).mockResolvedValueOnce([]);

    stellarService.sendBatchPayments.mockImplementation(
      async (payments: any[]) => {
        const ops = payments.map((p: any) => ({
          destination: p.destination,
          amount: p.amount,
          success: true,
        }));
        return [{ transactionHash: 'tx-hash', ledger: 42, operations: ops }];
      },
    );

    await service.processBatchPayouts();

    expect(stellarService.sendBatchPayments).toHaveBeenCalledTimes(2);
    const firstBatch = stellarService.sendBatchPayments.mock.calls[0][0];
    const secondBatch = stellarService.sendBatchPayments.mock.calls[1][0];
    expect(firstBatch).toHaveLength(100);
    expect(secondBatch).toHaveLength(50);
  });

  it('handles partial failures by marking failed payouts through handlePayoutFailure', async () => {
    const payout1 = buildPayout({
      id: 'p1',
      stellarAddress: 'G'.padEnd(56, 'A'),
      amount: 10,
      asset: 'XLM',
      status: PayoutStatus.PENDING,
    });
    const payout2 = buildPayout({
      id: 'p2',
      stellarAddress: 'G'.padEnd(56, 'B'),
      amount: 20,
      asset: 'XLM',
      status: PayoutStatus.PENDING,
    });

    repo.find
      .mockResolvedValueOnce([payout1, payout2])
      .mockResolvedValueOnce([]);

    stellarService.sendBatchPayments.mockRejectedValue(
      new Error('Horizon timeout'),
    );

    await service.processBatchPayouts();

    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        status: PayoutStatus.RETRY_SCHEDULED,
        retryCount: 1,
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p2',
        status: PayoutStatus.RETRY_SCHEDULED,
        retryCount: 1,
      }),
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_failures_total',
      expect.objectContaining({ outcome: 'retry_scheduled' }),
    );
  });
});

describe('PayoutsService.claimPayout idempotency', () => {
  let service: PayoutsService;
  let repo: ReturnType<typeof mockRepo>;
  let config: { get: jest.Mock };
  let emitter: { emit: jest.Mock };
  let metrics: { incrementCounter: jest.Mock };
  let stellarService: { sendPayment: jest.Mock; sendBatchPayments: jest.Mock };
  let idempotencyService: {
    computeFingerprint: jest.Mock;
    computeBodyHash: jest.Mock;
    tryAcquire: jest.Mock;
    complete: jest.Mock;
    remove: jest.Mock;
  };

  const userAddress = 'G'.padEnd(56, 'A');
  const submissionId = '11111111-1111-1111-1111-111111111111';
  const claimDto = {
    submissionId,
    stellarAddress: userAddress,
  };

  beforeEach(async () => {
    repo = mockRepo();
    repo.save.mockImplementation(async (payout) => payout);
    config = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'test',
        };
        return values[key] ?? defaultValue;
      }),
    };
    emitter = { emit: jest.fn() };
    metrics = { incrementCounter: jest.fn(), registerCounter: jest.fn() };
    stellarService = {
      sendPayment: jest.fn(),
      sendBatchPayments: jest.fn(),
    };
    idempotencyService = {
      computeFingerprint: jest.fn().mockReturnValue('fp-claim'),
      computeBodyHash: jest.fn().mockReturnValue('bh-claim'),
      tryAcquire: jest.fn().mockResolvedValue({ acquired: true }),
      complete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: emitter },
        { provide: FraudRiskRulesService, useValue: {} },
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        {
          provide: JobsService,
          useValue: {
            addJob: jest.fn().mockResolvedValue({ id: 'job' }),
          },
        },
        { provide: StellarService, useValue: stellarService },
        {
          provide: BulkheadService,
          useValue: {
            runWithBulkhead: (_n: string, fn: () => Promise<unknown>) => fn(),
          },
        },
        {
          provide: JobResultStatusCacheService,
          useValue: {
            getPayoutPoll: jest.fn(),
            setPayoutPoll: jest.fn(),
            invalidatePayout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('acquires an idempotency lock and completes the record on success', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PENDING,
      claimedAt: null,
      isClaimable: jest.fn().mockReturnValue(true),
    });
    repo.findOne.mockResolvedValue(payout);

    const response = await service.claimPayout(claimDto, userAddress);

    expect(idempotencyService.tryAcquire).toHaveBeenCalledWith(
      `payout-claim:${submissionId}:${userAddress}`,
      'fp-claim',
      'SERVICE',
      'payout-claim',
      'bh-claim',
    );
    expect(idempotencyService.complete).toHaveBeenCalledWith(
      `payout-claim:${submissionId}:${userAddress}`,
      200,
      expect.objectContaining({ id: payout.id, status: 'processing' }),
    );
    expect(response.status).toBe(PayoutStatus.PROCESSING);
    expect(response.id).toBe(payout.id);
  });

  it('returns the cached response when the idempotency record is already completed', async () => {
    const cachedResponse = {
      id: 'cached-payout',
      status: PayoutStatus.COMPLETED,
      stellarAddress: userAddress,
      amount: 10,
      asset: 'XLM',
      type: PayoutType.QUEST_REWARD,
      questId: null,
      submissionId,
      transactionHash: 'tx-123',
      stellarLedger: 42,
      settlementConfirmations: 3,
      settlementConfirmedAt: new Date(),
      failureReason: null,
      retryCount: 0,
      processedAt: new Date(),
      claimedAt: new Date(),
      createdAt: new Date(),
    };

    idempotencyService.tryAcquire.mockResolvedValue({
      acquired: false,
      existing: {
        key: `payout-claim:${submissionId}:${userAddress}`,
        fingerprint: 'fp-claim',
        responseStatusCode: 200,
        responseBody: cachedResponse,
        locked: false,
        completedAt: new Date(),
      },
    });

    const response = await service.claimPayout(claimDto, userAddress);

    expect(response).toEqual(cachedResponse);
    // Must NOT have touched the database
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the idempotency record is still locked', async () => {
    idempotencyService.tryAcquire.mockResolvedValue({
      acquired: false,
      existing: {
        key: `payout-claim:${submissionId}:${userAddress}`,
        fingerprint: 'fp-claim',
        responseStatusCode: null,
        responseBody: null,
        locked: true,
        completedAt: null,
      },
    });

    await expect(service.claimPayout(claimDto, userAddress)).rejects.toThrow(
      ConflictException,
    );
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('removes the idempotency record when the payout is not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.claimPayout(claimDto, userAddress)).rejects.toThrow(
      'Payout not found for this submission',
    );
    expect(idempotencyService.remove).toHaveBeenCalledWith(
      `payout-claim:${submissionId}:${userAddress}`,
    );
  });

  it('removes the idempotency record when payout is not claimable', async () => {
    const payout = buildPayout({
      status: PayoutStatus.COMPLETED,
      claimedAt: new Date(),
      isClaimable: jest.fn().mockReturnValue(false),
    });
    repo.findOne.mockResolvedValue(payout);

    await expect(service.claimPayout(claimDto, userAddress)).rejects.toThrow(
      'Payout cannot be claimed',
    );
    expect(idempotencyService.remove).toHaveBeenCalledWith(
      `payout-claim:${submissionId}:${userAddress}`,
    );
  });

  it('removes the idempotency record on optimistic-lock ConflictException', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PENDING,
      claimedAt: null,
      isClaimable: jest.fn().mockReturnValue(true),
    });
    repo.findOne.mockResolvedValue(payout);
    repo.save.mockRejectedValue(new ConflictException('Concurrent update'));

    await expect(service.claimPayout(claimDto, userAddress)).rejects.toThrow(
      ConflictException,
    );
    expect(idempotencyService.remove).toHaveBeenCalledWith(
      `payout-claim:${submissionId}:${userAddress}`,
    );
  });

  it('generates a deterministic idempotency key from submissionId and userAddress', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PENDING,
      claimedAt: null,
      isClaimable: jest.fn().mockReturnValue(true),
    });
    repo.findOne.mockResolvedValue(payout);

    await service.claimPayout(claimDto, userAddress);

    const expectedKey = `payout-claim:${submissionId}:${userAddress}`;
    expect(idempotencyService.tryAcquire).toHaveBeenCalledWith(
      expectedKey,
      expect.any(String),
      'SERVICE',
      'payout-claim',
      expect.any(String),
    );
    expect(idempotencyService.computeBodyHash).toHaveBeenCalledWith(claimDto);
  });
});

describe('PayoutsService.forceResetPayout', () => {
  let service: PayoutsService;
  let repo: ReturnType<typeof mockRepo>;
  let config: { get: jest.Mock };
  let metrics: { incrementCounter: jest.Mock };

  beforeEach(async () => {
    repo = mockRepo();
    repo.save.mockImplementation(async (payout) => payout);
    config = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'test',
        };
        return values[key] ?? defaultValue;
      }),
    };
    metrics = { incrementCounter: jest.fn(), registerCounter: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: FraudRiskRulesService, useValue: {} },
        {
          provide: IdempotencyService,
          useValue: {
            computeFingerprint: jest.fn().mockReturnValue('fp'),
            computeBodyHash: jest.fn().mockReturnValue('bh'),
            tryAcquire: jest.fn().mockResolvedValue({ acquired: true }),
            complete: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: { addJob: jest.fn() } },
        {
          provide: StellarService,
          useValue: { sendPayment: jest.fn(), sendBatchPayments: jest.fn() },
        },
        {
          provide: BulkheadService,
          useValue: {
            runWithBulkhead: jest.fn(
              (_name: string, fn: () => Promise<unknown>) => fn(),
            ),
          },
        },
        {
          provide: JobResultStatusCacheService,
          useValue: {
            getPayoutPoll: jest.fn(),
            setPayoutPoll: jest.fn(),
            invalidatePayout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns null when the payout does not exist', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.forceResetPayout('nonexistent');

    expect(result).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('resets a stuck PROCESSING payout to PENDING when retries remain', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PROCESSING,
      transactionHash: null,
      retryCount: 2,
      maxRetries: 5,
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.PENDING);
    expect(result!.failureReason).toContain('Reset to PENDING');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PayoutStatus.PENDING }),
    );
  });

  it('moves a stuck PROCESSING payout to DEAD_LETTER when retries are exhausted', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PROCESSING,
      transactionHash: null,
      retryCount: 5,
      maxRetries: 5,
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.DEAD_LETTER);
    expect(result!.nextRetryAt).toBeNull();
    expect(result!.failureReason).toContain('Exceeded retries');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PayoutStatus.DEAD_LETTER }),
    );
  });

  it('resets an overdue RETRY_SCHEDULED payout to PENDING', async () => {
    const payout = buildPayout({
      status: PayoutStatus.RETRY_SCHEDULED,
      transactionHash: 'tx_abc',
      retryCount: 1,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 60_000), // overdue by 1 minute
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.PENDING);
    expect(result!.failureReason).toBeNull();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PayoutStatus.PENDING }),
    );
  });

  it('does not touch a RETRY_SCHEDULED payout whose nextRetryAt is still in the future', async () => {
    const payout = buildPayout({
      status: PayoutStatus.RETRY_SCHEDULED,
      transactionHash: 'tx_abc',
      retryCount: 1,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() + 60_000), // not yet due
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.RETRY_SCHEDULED);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not touch a PROCESSING payout that already has a transactionHash', async () => {
    const payout = buildPayout({
      status: PayoutStatus.PROCESSING,
      transactionHash: 'tx_submitted',
      retryCount: 0,
      maxRetries: 5,
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.PROCESSING);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not touch a COMPLETED payout', async () => {
    const payout = buildPayout({
      status: PayoutStatus.COMPLETED,
      transactionHash: 'tx_done',
    });
    repo.findOne.mockResolvedValue(payout);

    const result = await service.forceResetPayout(payout.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(PayoutStatus.COMPLETED);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
