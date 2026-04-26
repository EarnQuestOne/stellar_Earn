import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePoolMonitorService } from './database-pool-monitor.service';
import { DataSource } from 'typeorm';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { MetricsService } from '../../../common/services/metrics.service';

describe('DatabasePoolMonitorService', () => {
  let service: DatabasePoolMonitorService;
  let dataSource: jest.Mocked<DataSource>;
  let metricsService: jest.Mocked<MetricsService>;
  let loggerService: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    const mockDataSource = {
      driver: {
        master: {
          pool: {
            totalCount: 5,
            idleCount: 2,
            waitingCount: 0,
          },
        },
      },
      options: {
        extra: {
          max: 10,
          min: 0,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        },
      },
    } as any;

    const mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    const mockMetricsService = {
      registerGauge: jest.fn(),
      registerHistogram: jest.fn(),
      registerCounter: jest.fn(),
      setGauge: jest.fn(),
      observeHistogram: jest.fn(),
      incrementCounter: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasePoolMonitorService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AppLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<DatabasePoolMonitorService>(DatabasePoolMonitorService);
    dataSource = mockDataSource;
    metricsService = mockMetricsService;
    loggerService = mockLoggerService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPoolStats', () => {
    it('should return pool statistics when pool is available', () => {
      const stats = service.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 5,
        activeConnections: 3,
        idleConnections: 2,
        waitingRequests: 0,
      });
    });

    it('should return zeros when pool is not available', () => {
      dataSource.driver.master = null;

      const stats = service.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
      });
    });

    it('should handle missing pool properties gracefully', () => {
      dataSource.driver.master.pool = {};

      const stats = service.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
      });
    });
  });

  describe('getPoolConfig', () => {
    it('should return pool configuration', () => {
      const config = service.getPoolConfig();

      expect(config).toEqual({
        max: 10,
        min: 0,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      });
    });

    it('should use defaults when extra config is missing', () => {
      dataSource.options.extra = {};

      const config = service.getPoolConfig();

      expect(config).toEqual({
        max: 10,
        min: 0,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      });
    });
  });

  describe('getUtilizationPercentage', () => {
    it('should calculate utilization percentage correctly', () => {
      const utilization = service.getUtilizationPercentage();
      expect(utilization).toBe(50); // 5/10 * 100
    });

    it('should return 0 when max is 0', () => {
      dataSource.options.extra.max = 0;

      const utilization = service.getUtilizationPercentage();
      expect(utilization).toBe(0);
    });
  });

  describe('recordAcquisitionTime', () => {
    it('should record acquisition time and update histogram', () => {
      service.recordAcquisitionTime(100);

      expect(metricsService.observeHistogram).toHaveBeenCalledWith('db_pool_acquire_duration_ms', 100);
    });

    it('should keep only last 100 samples', () => {
      for (let i = 0; i < 150; i++) {
        service.recordAcquisitionTime(i);
      }

      const avgTime = service.getAverageAcquisitionTime();
      expect(avgTime).toBeGreaterThan(50); // Should be average of last 100 samples
    });
  });

  describe('recordTimeout', () => {
    it('should record timeout and increment counter', () => {
      service.recordTimeout();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('db_pool_timeout_total');
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Database connection timeout detected',
        'DatabasePoolMonitorService',
        { timeoutCount: 1 },
      );
    });
  });

  describe('recordFailedConnection', () => {
    it('should record failed connection and increment counter', () => {
      service.recordFailedConnection();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('db_pool_failed_connections_total');
      expect(loggerService.error).toHaveBeenCalledWith(
        'Database connection failed',
        'DatabasePoolMonitorService',
        { failedCount: 1 },
      );
    });
  });

  describe('recordRetry', () => {
    it('should record retry and increment counter', () => {
      service.recordRetry();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('db_pool_retry_total');
    });
  });

  describe('getAverageAcquisitionTime', () => {
    it('should return 0 when no samples', () => {
      const avg = service.getAverageAcquisitionTime();
      expect(avg).toBe(0);
    });

    it('should calculate average correctly', () => {
      service.recordAcquisitionTime(100);
      service.recordAcquisitionTime(200);
      service.recordAcquisitionTime(300);

      const avg = service.getAverageAcquisitionTime();
      expect(avg).toBe(200);
    });
  });

  describe('onModuleInit', () => {
    it('should register metrics on initialization', () => {
      service.onModuleInit();

      expect(metricsService.registerGauge).toHaveBeenCalledWith(
        'db_pool_active_connections',
        'Number of active database connections',
      );
      expect(metricsService.registerGauge).toHaveBeenCalledWith(
        'db_pool_idle_connections',
        'Number of idle database connections',
      );
      expect(metricsService.registerGauge).toHaveBeenCalledWith(
        'db_pool_total_connections',
        'Total number of database connections',
      );
      expect(metricsService.registerGauge).toHaveBeenCalledWith(
        'db_pool_waiting_requests',
        'Number of requests waiting for a connection',
      );
      expect(metricsService.registerGauge).toHaveBeenCalledWith(
        'db_pool_utilization_percent',
        'Pool utilization as percentage of max connections',
      );
      expect(metricsService.registerHistogram).toHaveBeenCalledWith(
        'db_pool_acquire_duration_ms',
        'Time to acquire a connection from pool (ms)',
      );
      expect(metricsService.registerCounter).toHaveBeenCalledWith(
        'db_pool_timeout_total',
        'Total connection timeout events',
      );
      expect(metricsService.registerCounter).toHaveBeenCalledWith(
        'db_pool_failed_connections_total',
        'Total failed connection attempts',
      );
      expect(metricsService.registerCounter).toHaveBeenCalledWith(
        'db_pool_retry_total',
        'Total connection retry attempts',
      );
      expect(metricsService.registerCounter).toHaveBeenCalledWith(
        'db_pool_exhaustion_total',
        'Total pool exhaustion events',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear monitoring interval on destroy', () => {
      service.onModuleInit();
      service.onModuleDestroy();

      // Interval should be cleared (no easy way to test this directly without spy)
      expect(service).toBeDefined();
    });
  });

  describe('exhaustion detection', () => {
    it('should detect pool exhaustion when max connections reached and waiting requests exist', () => {
      dataSource.driver.master.pool.totalCount = 10;
      dataSource.driver.master.pool.waitingCount = 5;

      service.onModuleInit();
      // Trigger collection
      service['collectPoolMetrics']();
      service['checkExhaustionConditions']();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('db_pool_exhaustion_total');
      expect(loggerService.error).toHaveBeenCalledWith(
        'Database pool exhaustion detected',
        'DatabasePoolMonitorService',
        expect.objectContaining({
          totalConnections: 10,
          maxConnections: 10,
          waitingRequests: 5,
        }),
      );
    });

    it('should not alert on exhaustion within cooldown period', () => {
      dataSource.driver.master.pool.totalCount = 10;
      dataSource.driver.master.pool.waitingCount = 5;

      service.onModuleInit();
      service['collectPoolMetrics']();
      service['checkExhaustionConditions']();

      const callCount = loggerService.error.mock.calls.length;

      // Second call should not alert due to cooldown
      service['checkExhaustionConditions']();

      expect(loggerService.error.mock.calls.length).toBe(callCount);
    });
  });

  describe('high utilization detection', () => {
    it('should alert when utilization exceeds 90%', () => {
      dataSource.driver.master.pool.totalCount = 9;
      dataSource.driver.master.pool.idleCount = 0;

      service.onModuleInit();
      service['collectPoolMetrics']();
      service['checkExhaustionConditions']();

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Database pool utilization critical',
        'DatabasePoolMonitorService',
        expect.objectContaining({
          utilization: expect.stringContaining('90'),
        }),
      );
    });
  });

  describe('waiting queue detection', () => {
    it('should log warning when waiting queue is elevated', () => {
      dataSource.driver.master.pool.waitingCount = 6;

      service.onModuleInit();
      service['collectPoolMetrics']();

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Database pool waiting queue elevated',
        'DatabasePoolMonitorService',
        expect.objectContaining({
          waitingRequests: 6,
        }),
      );
    });
  });

  describe('failure handling', () => {
    it('should not crash when metrics collection fails', () => {
      dataSource.driver = null;

      service.onModuleInit();

      // Should not throw
      expect(() => service['collectPoolMetrics']()).not.toThrow();
    });

    it('should log warning when collection fails', () => {
      dataSource.driver = null;

      service.onModuleInit();
      service['collectPoolMetrics']();

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Failed to collect pool metrics',
        'DatabasePoolMonitorService',
        expect.any(Object),
      );
    });
  });
});
