import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarAccountCacheService } from './stellar-account-cache.service';

describe('StellarAccountCacheService', () => {
  let service: StellarAccountCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarAccountCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('1000'), // 1 second TTL for tests
          },
        },
      ],
    }).compile();

    service = module.get<StellarAccountCacheService>(
      StellarAccountCacheService,
    );
  });

  it('caches loadAccount calls and avoids redundant fetches within TTL', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ id: 'GACC123', sequence: '10' });

    const res1 = await service.loadAccount('GACC123', fetcher);
    const res2 = await service.loadAccount('GACC123', fetcher);

    expect(res1).toEqual(res2);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const metrics = service.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(metrics.hitRatio).toBe(0.5);
  });

  it('caches trustline lookups and handles invalidation', async () => {
    const fetcher = jest.fn().mockResolvedValue(true);

    const hasTL1 = await service.hasTrustline('GACC123', 'USDC', fetcher);
    const hasTL2 = await service.hasTrustline('GACC123', 'USDC', fetcher);

    expect(hasTL1).toBe(true);
    expect(hasTL2).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);

    service.invalidateAccount('GACC123');

    await service.hasTrustline('GACC123', 'USDC', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
