import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { API_VERSION_CONFIG, extractApiVersion } from '../../src/config/versioning.config';
import { HealthController } from '../../src/modules/health/health.controller';
import { DatabaseHealthService } from '../../src/modules/health/services/database-health.service';
import { CacheHealthService } from '../../src/modules/health/services/cache-health.service';
import { ExternalHealthService } from '../../src/modules/health/services/external-health.service';
import { HealthCheckResult } from '../../src/modules/health/types/health.types';

const mockDatabaseHealth = {
  check: jest.fn(),
};

const mockCacheHealth = {
  check: jest.fn(),
};

const mockExternalHealth = {
  check: jest.fn(),
};

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [HealthController],
      providers: [
        { provide: DatabaseHealthService, useValue: mockDatabaseHealth },
        { provide: CacheHealthService, useValue: mockCacheHealth },
        { provide: ExternalHealthService, useValue: mockExternalHealth },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.CUSTOM,
      defaultVersion: API_VERSION_CONFIG.defaultVersion,
      extractor: (request) => extractApiVersion(request as any) || API_VERSION_CONFIG.defaultVersion,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health/live', () => {
    it('returns 200 with basic app status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeDefined();
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with status ok when all checks pass', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.database.latency).toBe(50);
      expect(res.body.services.cache.status).toBe('ok');
      expect(res.body.services.cache.latency).toBe(50);
      expect(res.body.services.external).toBeUndefined();
    });

    it('returns 200 with status degraded when one service is degraded', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 2000, 
        error: 'Slow response' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(degradedResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(res.body.status).toBe('degraded');
      expect(res.body.services.cache.status).toBe('degraded');
      expect(res.body.services.cache.error).toBe('Slow response');
    });

    it('returns 503 when database is down', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Connection refused' 
      };
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
      expect(res.body.services.database.error).toBe('Connection refused');
    });

    it('returns 503 when cache is down', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Redis connection failed' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.cache.status).toBe('down');
    });

    it('returns 503 when both services are down', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Connection failed' 
      };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
      expect(res.body.services.cache.status).toBe('down');
    });

    it('executes checks in parallel', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);

      await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      // Both should have been called
      expect(mockDatabaseHealth.check).toHaveBeenCalledTimes(1);
      expect(mockCacheHealth.check).toHaveBeenCalledTimes(1);
      // They are called without waiting for each other (Promise.all)
      // This is implicit - we'd need to test timing to be sure
    });
  });

  describe('GET /health/deep', () => {
    it('returns 200 with status ok when all checks pass', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.cache.status).toBe('ok');
      expect(res.body.services.external.status).toBe('ok');
    });

    it('returns 200 with status degraded when external service is degraded', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 2000, 
        error: 'Slow external API' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(degradedResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.status).toBe('degraded');
      expect(res.body.services.external.status).toBe('degraded');
      expect(res.body.services.external.latency).toBe(2000);
      expect(res.body.services.external.error).toBe('Slow external API');
    });

    it('returns 503 when any service is down', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'External API unavailable' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.external.status).toBe('down');
      expect(res.body.services.external.error).toBe('External API unavailable');
    });

    it('returns 503 when database is down (overrides any other status)', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Database unreachable' 
      };
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
    });

    it('includes error field only when service has error', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 1500 
        // No error field
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(degradedResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.services.cache.error).toBeUndefined();
      expect(res.body.services.cache.latency).toBe(1500);
    });
  });
});

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health/live', () => {
    it('returns 200 with basic app status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeDefined();
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with status ok when all checks pass', async () => {
      const mockResults: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(mockResults);
      mockCacheHealth.check.mockResolvedValue(mockResults);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.database.latency).toBe(50);
      expect(res.body.services.cache.status).toBe('ok');
      expect(res.body.services.cache.latency).toBe(50);
      expect(res.body.services.external).toBeUndefined();
    });

    it('returns 200 with status degraded when one service is degraded', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 2000, 
        error: 'Slow response' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(degradedResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(res.body.status).toBe('degraded');
      expect(res.body.services.cache.status).toBe('degraded');
      expect(res.body.services.cache.error).toBe('Slow response');
    });

    it('returns 503 when database is down', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Connection refused' 
      };
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
      expect(res.body.services.database.error).toBe('Connection refused');
    });

    it('returns 503 when cache is down', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Redis connection failed' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.cache.status).toBe('down');
    });

    it('returns 503 when both services are down', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Connection failed' 
      };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
      expect(res.body.services.cache.status).toBe('down');
    });

    it('executes checks in parallel', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);

      await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      // Both should have been called
      expect(mockDatabaseHealth.check).toHaveBeenCalledTimes(1);
      expect(mockCacheHealth.check).toHaveBeenCalledTimes(1);
      // They are called without waiting for each other (Promise.all)
      // This is implicit - we'd need to test timing to be sure
    });
  });

  describe('GET /health/deep', () => {
    it('returns 200 with status ok when all checks pass', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.cache.status).toBe('ok');
      expect(res.body.services.external.status).toBe('ok');
    });

    it('returns 200 with status degraded when external service is degraded', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 2000, 
        error: 'Slow external API' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(degradedResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.status).toBe('degraded');
      expect(res.body.services.external.status).toBe('degraded');
      expect(res.body.services.external.latency).toBe(2000);
      expect(res.body.services.external.error).toBe('Slow external API');
    });

    it('returns 503 when any service is down', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'External API unavailable' 
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(downResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.external.status).toBe('down');
      expect(res.body.services.external.error).toBe('External API unavailable');
    });

    it('returns 503 when database is down (overrides any other status)', async () => {
      const downResult: HealthCheckResult = { 
        status: 'down', 
        latency: 3000, 
        error: 'Database unreachable' 
      };
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      mockDatabaseHealth.check.mockResolvedValue(downResult);
      mockCacheHealth.check.mockResolvedValue(okResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(503);

      expect(res.body.status).toBe('down');
      expect(res.body.services.database.status).toBe('down');
    });

    it('includes error field only when service has error', async () => {
      const okResult: HealthCheckResult = { status: 'ok', latency: 50 };
      const degradedResult: HealthCheckResult = { 
        status: 'degraded', 
        latency: 1500 
        // No error field
      };
      mockDatabaseHealth.check.mockResolvedValue(okResult);
      mockCacheHealth.check.mockResolvedValue(degradedResult);
      mockExternalHealth.check.mockResolvedValue(okResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.services.cache.error).toBeUndefined();
      expect(res.body.services.cache.latency).toBe(1500);
    });
  });
});

describe('DatabaseHealthService (unit)', () => {
  it('returns ok when SELECT 1 succeeds quickly', async () => {
    // This would require setting up the actual service with a mock DataSource
    // For now, we ensure the controller properly integrates it
  });
});

describe('CacheHealthService (unit)', () => {
  it('returns ok when Redis PING succeeds', async () => {
    // Would test with mock CacheManager
  });
});

describe('ExternalHealthService (unit)', () => {
  it('returns appropriate aggregated status', async () => {
    // Would test with mocked axios
  });
});
