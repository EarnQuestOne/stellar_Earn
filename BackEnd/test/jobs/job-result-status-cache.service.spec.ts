import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JobResultStatusCacheService } from 'src/modules/jobs/services/job-result-status-cache.service';
import { CacheService } from 'src/modules/cache/cache.service';
import { PayoutStatus } from 'src/modules/payouts/entities/payout.entity';
import { JobStatus } from 'src/modules/jobs/job.types';

const mockCache = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  deletePattern: jest.fn().mockResolvedValue(undefined),
};

describe('JobResultStatusCacheService', () => {
  let service: JobResultStatusCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobResultStatusCacheService,
        { provide: CacheService, useValue: mockCache },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue: unknown) => defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get(JobResultStatusCacheService);
    service.resetPollMetrics();
    jest.clearAllMocks();
  });

  it('uses a shorter TTL for in-progress payout statuses', () => {
    expect(service.resolveTtlSeconds(PayoutStatus.PROCESSING)).toBe(5);
    expect(service.resolveTtlSeconds(PayoutStatus.COMPLETED)).toBe(30);
  });

  it('uses a shorter TTL for in-progress job statuses', () => {
    expect(service.resolveTtlSeconds(JobStatus.PROCESSING)).toBe(5);
    expect(service.resolveTtlSeconds(JobStatus.FAILED)).toBe(30);
  });

  it('returns cached payout polls and tracks hits', async () => {
    const payout = {
      id: 'payout-1',
      status: PayoutStatus.PROCESSING,
    };
    mockCache.get.mockResolvedValue({
      status: PayoutStatus.PROCESSING,
      payout,
      cachedAt: new Date().toISOString(),
    });

    const result = await service.getPayoutPoll('payout-1', 'GABC');
    expect(result).toEqual(payout);
    expect(service.getPollMetrics().hits).toBe(1);
    expect(service.getPollMetrics().dbReadsAvoided).toBe(1);
  });

  it('stores payout polls with TTL derived from status', async () => {
    const payout = {
      id: 'payout-1',
      status: PayoutStatus.COMPLETED,
    } as any;

    await service.setPayoutPoll('payout-1', '__admin__', payout);

    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('payout_poll:payout-1'),
      expect.objectContaining({ status: PayoutStatus.COMPLETED, payout }),
      30,
    );
  });

  it('invalidates all viewer scopes for a payout', async () => {
    await service.invalidatePayout('payout-99');
    expect(mockCache.deletePattern).toHaveBeenCalledWith(
      expect.stringContaining('payout_poll:payout-99'),
    );
  });
});
