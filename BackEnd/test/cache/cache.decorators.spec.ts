import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, Param } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CacheableInterceptor,
  CacheInvalidateInterceptor,
  Cacheable,
  CacheInvalidate,
} from '#src/common/decorators/cache.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller('test')
class TestController {
  @Get('cacheable/:id')
  @Cacheable({ ttl: 300, key: 'test_{{0}}' })
  async getCacheable(@Param('id') id: string) {
    return { id, timestamp: Date.now() };
  }

  @Get('invalidate')
  @CacheInvalidate(['test_pattern_'])
  async invalidate() {
    return { message: 'invalidated' };
  }
}

describe('Cache Decorators', () => {
  let app: INestApplication;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        getKeys: jest
          .fn()
          .mockResolvedValue(['test_pattern_1', 'test_pattern_2', 'other_key']),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        CacheableInterceptor,
        CacheInvalidateInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('Cacheable Decorator', () => {
    it('should cache first request and return cached value on second', async () => {
      const expectedValue = { id: '123', timestamp: 1234567890 };
      cacheManager.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(expectedValue);

      // First request - should miss cache
      await request(app.getHttpServer()).get('/test/cacheable/123').expect(200);

      // Second request - should hit cache
      await request(app.getHttpServer()).get('/test/cacheable/123').expect(200);

      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should generate correct cache key with parameter', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .get('/test/cacheable/test-id')
        .expect(200);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('test_'),
        expect.any(Object),
        300,
      );
    });
  });

  describe('CacheInvalidate Decorator', () => {
    it('should invalidate cache matching pattern', async () => {
      await request(app.getHttpServer()).get('/test/invalidate').expect(200);

      expect(cacheManager.store.getKeys).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('test_pattern_1');
      expect(cacheManager.del).toHaveBeenCalledWith('test_pattern_2');
    });

    it('should not invalidate non-matching keys', async () => {
      await request(app.getHttpServer()).get('/test/invalidate').expect(200);

      expect(cacheManager.del).not.toHaveBeenCalledWith('other_key');
    });
  });
});
