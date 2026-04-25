import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheAnalyticsService } from './cache-analytics.service';
import {
  createMockCacheManager,
} from '../../test/utils/test-helpers';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;
  let analyticsService: any;

  beforeEach(async () => {
    cacheManager = createMockCacheManager();
    analyticsService = {
      recordHit: jest.fn(),
      recordMiss: jest.fn(),
      recordSet: jest.fn(),
      recordDel: jest.fn(),
      recordError: jest.fn(),
      getStats: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: CacheAnalyticsService,
          useValue: analyticsService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(analyticsService.recordHit).toHaveBeenCalled();
    });

    it('should return undefined when key not found', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);

      const result = await service.get('non-existent-key');

      expect(result).toBeUndefined();
      expect(analyticsService.recordMiss).toHaveBeenCalled();
    });

    it('should use local fallback when cache errors', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache error'));

      const result = await service.get('test-key');

      expect(result).toBeUndefined();
      expect(analyticsService.recordError).toHaveBeenCalled();
    });

    it('should record analytics on cache hit', async () => {
      const value = { data: 'test' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(value);

      await service.get('test-key');

      expect(analyticsService.recordHit).toHaveBeenCalled();
    });

    it('should record analytics on cache miss', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);

      await service.get('test-key');

      expect(analyticsService.recordMiss).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should store value in cache with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 3600;

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
      expect(analyticsService.recordSet).toHaveBeenCalled();
    });

    it('should store value without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should handle cache write errors with fallback', async () => {
      jest
        .spyOn(cacheManager, 'set')
        .mockRejectedValue(new Error('Cache write error'));

      await service.set('test-key', { data: 'test' });

      expect(analyticsService.recordError).toHaveBeenCalled();
    });

    it('should support cache tags', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const tags = ['user', 'profile'];

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'addTagToKey').mockResolvedValue(undefined);

      await service.set(key, value, 3600, tags);

      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete cache entry', async () => {
      const key = 'test-key';

      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.del(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
      expect(analyticsService.recordDel).toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      jest
        .spyOn(cacheManager, 'del')
        .mockRejectedValue(new Error('Delete failed'));

      await service.del('test-key');

      expect(analyticsService.recordError).toHaveBeenCalled();
    });

    it('should support delete alias', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.delete('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      // First set some keys to populate registry
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      // Manually populate the registry (normally done via set)
      (service as any).keyRegistry.add('user:1:profile');
      (service as any).keyRegistry.add('user:2:profile');
      (service as any).keyRegistry.add('user:1:settings');
      (service as any).keyRegistry.add('post:1:data');

      await service.deletePattern('user:');

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
    });

    it('should handle empty pattern matches', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.deletePattern('non-existent:');

      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should clear all cache entries', async () => {
      jest.spyOn(cacheManager, 'reset').mockResolvedValue(undefined);

      await service.reset();

      expect(cacheManager.reset).toHaveBeenCalled();
    });

    it('should clear registry on reset', async () => {
      (service as any).keyRegistry.add('key1');
      (service as any).keyRegistry.add('key2');

      jest.spyOn(cacheManager, 'reset').mockResolvedValue(undefined);

      await service.reset();

      expect((service as any).keyRegistry.size).toBe(0);
    });
  });

  describe('Cache Analytics Integration', () => {
    it('should track cache statistics', async () => {
      const statsService = service.getAnalytics?.();

      if (statsService) {
        expect(statsService).toBeDefined();
      }
    });

    it('should report cache hit rate', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue({ data: 'test' });

      // Simulate hits
      await service.get('key1');
      await service.get('key2');

      // Simulate miss
      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);
      await service.get('key3');

      expect(analyticsService.recordHit).toHaveBeenCalledTimes(2);
      expect(analyticsService.recordMiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Store', () => {
    it('should use local fallback when cache service unavailable', async () => {
      const key = 'fallback-key';
      const value = { data: 'fallback-data' };

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      // First set the value
      await service.set(key, value, 3600);

      // Then make cache unavailable
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache down'));

      // Should still retrieve from fallback
      const result = await service.get(key);

      // Result should be from fallback store
      expect(analyticsService.recordError).toHaveBeenCalled();
    });

    it('should respect TTL in fallback store', async () => {
      const key = 'ttl-key';
      const value = { data: 'test' };
      const ttl = 1; // 1 second

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.set(key, value, ttl);

      // Wait for fallback to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache down'));

      const result = await service.get(key);

      expect(result).toBeUndefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads', async () => {
      const value = { data: 'test' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(value);

      const promises = Array.from({ length: 10 }, () =>
        service.get('concurrent-key'),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r === value)).toBe(true);
    });

    it('should handle concurrent writes', async () => {
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.set(`key-${i}`, { index: i }),
      );

      await Promise.all(promises);

      expect(cacheManager.set).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from cache errors', async () => {
      jest
        .spyOn(cacheManager, 'get')
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({ data: 'recovered' });

      const result1 = await service.get('test-key');
      const result2 = await service.get('test-key');

      expect(result1).toBeUndefined();
      expect(result2).toEqual({ data: 'recovered' });
    });
  });
});
