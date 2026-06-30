import { Test, TestingModule } from '@nestjs/testing';
import { StartupReadinessService } from './startup-readiness.service';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

describe('StartupReadinessService', () => {
  let service: StartupReadinessService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    } as any;

    mockCacheManager = {
      stores: [
        {
          getClient: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue('PONG'),
          })),
        },
      ],
    } as any;

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupReadinessService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StartupReadinessService>(StartupReadinessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkEnvironmentVariables', () => {
    it('should return ok when all required keys are present', async () => {
      process.env.DATABASE_URL = 'postgres://localhost/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.STELLAR_NETWORK_PASSPHRASE =
        'Test SDF Network ; September 2015';

      const result = await service['checkEnvironmentVariables']();

      expect(result.component).toBe('Environment Variables (Keys)');
      expect(result.status).toBe('ok');
      expect(result.details?.requiredKeys).toBe(2);

      delete process.env.REDIS_URL;
      delete process.env.STELLAR_NETWORK_PASSPHRASE;
    });

    it('should return down when required keys are missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      const result = await service['checkEnvironmentVariables']();

      expect(result.component).toBe('Environment Variables (Keys)');
      expect(result.status).toBe('down');
      expect(result.error).toContain('Missing required keys');
    });

    it('should return degraded when only optional keys are missing', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.JWT_SECRET = 'test-secret-key';
      delete process.env.REDIS_URL;

      const result = await service['checkEnvironmentVariables']();

      expect(result.component).toBe('Environment Variables (Keys)');
      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Missing optional keys');
    });
  });

  describe('checkDatabase', () => {
    it('should return ok when database is accessible', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await service['checkDatabase']();

      expect(result.component).toBe('Database (PostgreSQL)');
      expect(result.status).toBe('ok');
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return down when database query times out', async () => {
      mockDataSource.query.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      const result = await service['checkDatabase']();

      expect(result.component).toBe('Database (PostgreSQL)');
      expect(result.status).toBe('down');
      expect(result.error).toContain('timeout');
    }, 6000);

    it('should return down when database query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await service['checkDatabase']();

      expect(result.component).toBe('Database (PostgreSQL)');
      expect(result.status).toBe('down');
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('checkCache', () => {
    it('should return ok when Redis is accessible', async () => {
      const result = await service['checkCache']();

      expect(result.component).toBe('Redis/Cache');
      expect(result.status).toBe('ok');
    });

    it('should return degraded when Redis client is not available', async () => {
      mockCacheManager.stores = [];

      const result = await service['checkCache']();

      expect(result.component).toBe('Redis/Cache');
      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Redis client not available');
    });

    it('should return degraded when Redis ping times out', async () => {
      (mockCacheManager as any).stores = [
        {
          getClient: jest.fn(() => ({
            ping: jest.fn(
              () => new Promise((resolve) => setTimeout(resolve, 10000)),
            ),
          })),
        },
      ];

      const result = await service['checkCache']();

      expect(result.component).toBe('Redis/Cache');
      expect(result.status).toBe('degraded');
      expect(result.error).toContain('timeout');
    }, 6000);
  });

  describe('checkQueue', () => {
    it('should return ok when queue backend is accessible', async () => {
      const result = await service['checkQueue']();

      expect(result.component).toBe('Queue (BullMQ)');
      expect(result.status).toBe('ok');
      expect(result.details?.backend).toBe('Redis');
    });

    it('should return degraded when Redis client is not available', async () => {
      mockCacheManager.stores = [];

      const result = await service['checkQueue']();

      expect(result.component).toBe('Queue (BullMQ)');
      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Redis client not available');
    });
  });

  describe('runStartupReadinessCheck', () => {
    it('should return ready status when all checks pass', async () => {
      process.env.DATABASE_URL = 'postgres://localhost/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.STELLAR_NETWORK_PASSPHRASE =
        'Test SDF Network ; September 2015';

      const report = await service.runStartupReadinessCheck();

      expect(report.overallStatus).toBe('ready');
      expect(report.checks).toHaveLength(4);
      expect(report.checks.every((c) => c.status === 'ok')).toBe(true);

      delete process.env.REDIS_URL;
      delete process.env.STELLAR_NETWORK_PASSPHRASE;
    });

    it('should return degraded status when some checks are degraded', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.JWT_SECRET = 'test-secret-key';
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);
      mockCacheManager.stores = [];

      const report = await service.runStartupReadinessCheck();

      expect(report.overallStatus).toBe('degraded');
      expect(report.checks.some((c) => c.status === 'degraded')).toBe(true);
    });

    it('should throw error when critical checks fail', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      await expect(service.runStartupReadinessCheck()).rejects.toThrow(
        'Startup readiness check failed',
      );
    });

    it('should include all required fields in report', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.JWT_SECRET = 'test-secret-key';
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const report = await service.runStartupReadinessCheck();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('totalDurationMs');
    });
  });

  describe('calculateOverallStatus', () => {
    it('should return ready when all checks are ok', () => {
      const checks = [
        { component: 'Test', status: 'ok' as const },
        { component: 'Test2', status: 'ok' as const },
      ];

      const status = service['calculateOverallStatus'](checks);
      expect(status).toBe('ready');
    });

    it('should return degraded when some checks are degraded', () => {
      const checks = [
        { component: 'Test', status: 'ok' as const },
        { component: 'Test2', status: 'degraded' as const },
      ];

      const status = service['calculateOverallStatus'](checks);
      expect(status).toBe('degraded');
    });

    it('should return not_ready when any check is down', () => {
      const checks = [
        { component: 'Test', status: 'ok' as const },
        { component: 'Test2', status: 'down' as const },
      ];

      const status = service['calculateOverallStatus'](checks);
      expect(status).toBe('not_ready');
    });
  });
});
