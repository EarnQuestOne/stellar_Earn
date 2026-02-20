import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthCheckError, TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '../../src/modules/health/health.controller';
import { DatabaseIndicator } from '../../src/modules/health/indicators/database.indicator';
import { RedisIndicator } from '../../src/modules/health/indicators/redis.indicator';

const mockDatabaseIndicator = {
  isHealthy: jest.fn(),
};

const mockRedisIndicator = {
  isHealthy: jest.fn(),
};

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, ConfigModule.forRoot({ isGlobal: true })],
      controllers: [HealthController],
      providers: [
        { provide: DatabaseIndicator, useValue: mockDatabaseIndicator },
        { provide: RedisIndicator, useValue: mockRedisIndicator },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns 200 with status up when all checks pass', async () => {
      mockDatabaseIndicator.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: 'up' },
      });

      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.info.database.status).toBe('up');
      expect(res.body.info.redis.status).toBe('up');
    });

    it('returns 503 when database is down', async () => {
      mockDatabaseIndicator.isHealthy.mockRejectedValue(
        new HealthCheckError('Database check failed', {
          database: { status: 'down', message: 'Connection refused' },
        }),
      );
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: 'up' },
      });

      const res = await request(app.getHttpServer()).get('/health').expect(503);

      expect(res.body.status).toBe('error');
    });

    it('returns 503 when Redis is down', async () => {
      mockDatabaseIndicator.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });
      mockRedisIndicator.isHealthy.mockRejectedValue(
        new HealthCheckError('Redis check failed', {
          redis: { status: 'down', message: 'ECONNREFUSED' },
        }),
      );

      const res = await request(app.getHttpServer()).get('/health').expect(503);

      expect(res.body.status).toBe('error');
    });

    it('returns 200 with redis skipped when CACHE_TYPE is memory', async () => {
      mockDatabaseIndicator.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: 'up', status_detail: 'skipped' },
      });

      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 when all checks pass (ready to serve traffic)', async () => {
      mockDatabaseIndicator.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: 'up' },
      });

      const res = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(res.body.status).toBe('ok');
    });

    it('returns 503 when not ready due to database failure', async () => {
      mockDatabaseIndicator.isHealthy.mockRejectedValue(
        new HealthCheckError('Database check failed', {
          database: { status: 'down' },
        }),
      );
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: 'up' },
      });

      await request(app.getHttpServer()).get('/health/ready').expect(503);
    });
  });
});

const createMockHealthIndicatorService = () => ({
  check: (key: string) => ({
    up: (data?: Record<string, unknown>) => ({
      [key]: { status: 'up', ...data },
    }),
    down: (data?: Record<string, unknown>): never => {
      throw new Error(
        `check failed: ${JSON.stringify({ [key]: { status: 'down', ...data } })}`,
      );
    },
  }),
});

describe('DatabaseIndicator (unit)', () => {
  it('returns healthy when SELECT 1 succeeds', async () => {
    const mockDataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const { DatabaseIndicator: Indicator } =
      await import('../../src/modules/health/indicators/database.indicator');
    const indicator = new Indicator(
      createMockHealthIndicatorService() as any,
      mockDataSource as any,
    );
    const result = await indicator.isHealthy('database');
    expect(result.database.status).toBe('up');
  });

  it('throws when query fails', async () => {
    const mockDataSource = {
      query: jest.fn().mockRejectedValue(new Error('Connection refused')),
    };
    const { DatabaseIndicator: Indicator } =
      await import('../../src/modules/health/indicators/database.indicator');
    const indicator = new Indicator(
      createMockHealthIndicatorService() as any,
      mockDataSource as any,
    );
    await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(Error);
  });
});

describe('RedisIndicator (unit)', () => {
  it('returns skipped status when CACHE_TYPE is memory', async () => {
    const mockConfigService = { get: jest.fn().mockReturnValue('memory') };
    const { RedisIndicator: Indicator } =
      await import('../../src/modules/health/indicators/redis.indicator');
    const indicator = new Indicator(
      createMockHealthIndicatorService() as any,
      mockConfigService as any,
    );
    const result = await indicator.isHealthy('redis');
    expect(result.redis.status).toBe('up');
    expect((result.redis as any).note).toContain('skipped');
  });
});
