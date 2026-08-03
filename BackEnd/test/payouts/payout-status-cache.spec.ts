import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { Payout, PayoutStatus, PayoutType } from 'src/modules/payouts/entities/payout.entity';
import { PayoutsService } from 'src/modules/payouts/payouts.service';
import { FraudRiskRulesService } from 'src/modules/payouts/services/fraud-risk-rules.service';
import { QuotaService } from 'src/modules/quota/quota.service';
import { MetricsService } from 'src/common/services/metrics.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { BulkheadService } from 'src/common/services/bulkhead.service';
import { JobResultStatusCacheService } from 'src/modules/jobs/services/job-result-status-cache.service';

const buildPayout = (): Payout =>
  ({
    id: 'payout-1',
    stellarAddress: 'G'.padEnd(56, 'A'),
    amount: 10,
    asset: 'XLM',
    status: PayoutStatus.PROCESSING,
    type: PayoutType.QUEST_REWARD,
    createdAt: new Date(),
  }) as Payout;

describe('PayoutsService payout status polling cache', () => {
  let service: PayoutsService;
  let repo: { findOne: jest.Mock; save: jest.Mock };
  let cache: {
    getPayoutPoll: jest.Mock;
    setPayoutPoll: jest.Mock;
    invalidatePayout: jest.Mock;
  };
  let metrics: { registerCounter: jest.Mock; incrementCounter: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (p) => p),
    };
    cache = {
      getPayoutPoll: jest.fn(),
      setPayoutPoll: jest.fn().mockResolvedValue(undefined),
      invalidatePayout: jest.fn().mockResolvedValue(undefined),
    };
    metrics = {
      registerCounter: jest.fn(),
      incrementCounter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: FraudRiskRulesService, useValue: {} },
        { provide: QuotaService, useValue: {} },
        { provide: MetricsService, useValue: metrics },
        { provide: JobsService, useValue: { addJob: jest.fn() } },
        {
          provide: BulkheadService,
          useValue: {
            runWithBulkhead: (_n: string, fn: () => Promise<unknown>) => fn(),
          },
        },
        { provide: JobResultStatusCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(PayoutsService);
  });

  it('serves repeated polls from cache without database reads', async () => {
    const dto = {
      id: 'payout-1',
      status: PayoutStatus.PROCESSING,
      stellarAddress: 'G'.padEnd(56, 'A'),
    } as any;
    cache.getPayoutPoll.mockResolvedValue(dto);

    const first = await service.getPayoutById('payout-1', dto.stellarAddress);
    const second = await service.getPayoutById('payout-1', dto.stellarAddress);

    expect(first).toEqual(dto);
    expect(second).toEqual(dto);
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_status_poll_cache_hits_total',
    );
  });

  it('loads from the database on cache miss and warms the cache', async () => {
    const payout = buildPayout();
    cache.getPayoutPoll.mockResolvedValue(undefined);
    repo.findOne.mockResolvedValue(payout);

    const result = await service.getPayoutById(payout.id, payout.stellarAddress);

    expect(result.status).toBe(PayoutStatus.PROCESSING);
    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(cache.setPayoutPoll).toHaveBeenCalledWith(
      payout.id,
      payout.stellarAddress,
      expect.objectContaining({ id: payout.id }),
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'payout_status_poll_cache_misses_total',
    );
  });

  it('invalidates cache entries when payout state is persisted', async () => {
    const payout = buildPayout();
    await (service as any).persistPayout(payout);
    expect(cache.invalidatePayout).toHaveBeenCalledWith(payout.id);
  });

  it('throws when payout is missing on cache miss', async () => {
    cache.getPayoutPoll.mockResolvedValue(undefined);
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.getPayoutById('missing', 'G'.padEnd(56, 'A')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
