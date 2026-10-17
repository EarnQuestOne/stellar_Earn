import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CacheAnalyticsService } from './cache-analytics.service';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
};

const mockAnalyticsService = {
  recordHit: jest.fn(),
  recordMiss: jest.fn(),
  recordSet: jest.fn(),
  recordDel: jest.fn(),
  recordError: jest.fn(),
  getAnalytics: jest.fn().mockReturnValue({ hits: 0, misses: 0, errors: 0 }),
};

describe('CacheService — stale-while-revalidate', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: 'CACHE_MANAGER', useValue: mockCacheManager },
        { provide: CacheAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('wrapSWR', () => {
    it('should return fresh cached value without calling fn', async () => {
      const freshData = { value: 'fresh', cachedAt: Date.now() };
      mockCacheManager.get.mockResolvedValueOnce(freshData);

      const fn = jest.fn().mockResolvedValue('new');
      const result = await service.wrapSWR('key', fn, 300, 60);

      expect(result).toBe('fresh');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should return stale value (age between softTTL and hardTTL)', async () => {
      const now = Date.now();
      const staleData = { value: 'stale', cachedAt: now - 90_000 };
      mockCacheManager.get.mockResolvedValueOnce(staleData);

      const fn = jest.fn().mockResolvedValue('refreshed');
      const result = await service.wrapSWR('key', fn, 300, 60);

      // Should return stale value immediately (not block)
      expect(result).toBe('stale');
    });

    it('should compute synchronously when expired (age >= hardTTL)', async () => {
      const expiredData = { value: 'expired', cachedAt: Date.now() - 400_000 };
      mockCacheManager.get.mockResolvedValueOnce(expiredData);

      const fn = jest.fn().mockResolvedValue('computed');
      const result = await service.wrapSWR('key', fn, 300, 60);

      expect(result).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should compute synchronously when no cached value exists', async () => {
      mockCacheManager.get.mockResolvedValueOnce(undefined);

      const fn = jest.fn().mockResolvedValue('computed');
      const result = await service.wrapSWR('key', fn, 300, 60);

      expect(result).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
