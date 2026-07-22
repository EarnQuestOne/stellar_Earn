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
import { QUEUES } from '../jobs/jobs.constants';

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
    metrics = { incrementCounter: jest.fn() };
    jobs = { addJob: jest.fn().mockResolvedValue({ id: 'dead-letter-job' }) };

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
