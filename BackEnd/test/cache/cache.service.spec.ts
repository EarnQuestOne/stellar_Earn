import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '#src/modules/cache/cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        getKeys: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value if exists', async () => {
      const testValue = { id: 1, name: 'Test' };
      cacheManager.get.mockResolvedValue(testValue);

      const result = await service.get('test_key');

      expect(result).toEqual(testValue);
      expect(cacheManager.get).toHaveBeenCalledWith('test_key');
    });

    it('should return undefined if key not found', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('nonexistent_key');

      expect(result).toBeUndefined();
    });

    it('should record cache hit', async () => {
      cacheManager.get.mockResolvedValue({ data: 'value' });

      await service.get('test_key');
      const stats = service.getStats('test_key');

      expect(stats).toHaveProperty('hits', 1);
      expect(stats).toHaveProperty('misses', 0);
    });

    it('should record cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      await service.get('test_key');
      const stats = service.getStats('test_key');

      expect(stats).toHaveProperty('hits', 0);
      expect(stats).toHaveProperty('misses', 1);
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const testValue = { id: 1, name: 'Test' };

      await service.set('test_key', testValue, 3600);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'test_key',
        testValue,
        3600,
      );
    });

    it('should set value with default TTL', async () => {
      const testValue = { id: 1 };

      await service.set('test_key', testValue);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'test_key',
        testValue,
        undefined,
      );
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const testValue = { id: 1, name: 'Test' };
      const factory = jest.fn();
      cacheManager.get.mockResolvedValue(testValue);

      const result = await service.getOrSet('test_key', factory, 3600);

      expect(result).toEqual(testValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should execute factory and cache result if not cached', async () => {
      const testValue = { id: 1, name: 'Test' };
      const factory = jest.fn().mockResolvedValue(testValue);
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet('test_key', factory, 3600);

      expect(result).toEqual(testValue);
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'test_key',
        testValue,
        3600,
      );
    });
  });

  describe('delete', () => {
    it('should delete a specific key', async () => {
      await service.delete('test_key');

      expect(cacheManager.del).toHaveBeenCalledWith('test_key');
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await service.deleteMany(keys);

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      keys.forEach((key) => {
        expect(cacheManager.del).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['quests_1', 'quests_2', 'users_1', 'quests_3'];
      cacheManager.store.getKeys.mockResolvedValue(keys);

      await service.deletePattern('quests_');

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith('quests_1');
      expect(cacheManager.del).toHaveBeenCalledWith('quests_2');
      expect(cacheManager.del).toHaveBeenCalledWith('quests_3');
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await service.clear();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats for specific key', async () => {
      cacheManager.get.mockResolvedValue({ data: 'value' });

      // Record some hits and misses
      await service.get('test_key');
      await service.get('test_key');
      cacheManager.get.mockResolvedValue(undefined);
      await service.get('test_key');

      const stats = service.getStats('test_key');

      expect(stats).toHaveProperty('hits', 2);
      expect(stats).toHaveProperty('misses', 1);
      expect((stats as any).hitRate).toBe((2 / 3) * 100);
    });

    it('should return empty stats for nonexistent key', async () => {
      const stats = service.getStats('nonexistent');

      expect(stats).toEqual({ hits: 0, misses: 0, hitRate: 0 });
    });

    it('should return all stats if no key specified', async () => {
      cacheManager.get.mockResolvedValue({ data: 'value' });

      await service.get('key1');
      await service.get('key2');

      const allStats = service.getStats();

      expect(allStats).toBeInstanceOf(Map);
      expect((allStats as Map<string, any>).size).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      cacheManager.get.mockResolvedValue({ data: 'value' });
      await service.get('test_key');

      service.resetStats();

      const stats = service.getStats('test_key');
      expect(stats).toEqual({ hits: 0, misses: 0, hitRate: 0 });
    });
  });
});
