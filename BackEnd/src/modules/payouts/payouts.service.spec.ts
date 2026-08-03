import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payout, PayoutStatus, PayoutType } from './entities/payout.entity';
import { PayoutsService } from './payouts.service';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import { QuotaService } from '../quota/quota.service';
import { MetricsService } from '../../common/services/metrics.service';
import { JobsService } from '../jobs/jobs.service';
import { StellarService } from '../stellar/stellar.service';
import { BulkheadService } from '../../common/services/bulkhead.service';
import { QUEUES } from '../jobs/jobs.constants';
import { BulkheadService } from '../../common/services/bulkhead.service';
import { JobResultStatusCacheService } from '../jobs/services/job-result-status-cache.service';

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: emitter },
        { provide: FraudRiskRulesService, useValue: {} },
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: jobs },
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
    metrics = { incrementCounter: jest.fn(), observeHistogram: jest.fn() };
    jobs = { addJob: jest.fn().mockResolvedValue({ id: 'dead-letter-job' }) };
    stellarService = {
      sendPayment: jest.fn(),
      sendBatchPayments: jest
        .fn()
        .mockResolvedValue([
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
        { provide: QuotaService, useValue: { enforcePayoutQuota: jest.fn() } },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: jobs },
        { provide: StellarService, useValue: stellarService },
        { provide: BulkheadService, useValue: { runWithBulkhead: jest.fn((_name, fn) => fn()) } },
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

    const txResult = { transactionHash: 'tx', ledger: 1, operations: [] };
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

    repo.find.mockResolvedValueOnce([payout1, payout2]).mockResolvedValueOnce([]);

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
