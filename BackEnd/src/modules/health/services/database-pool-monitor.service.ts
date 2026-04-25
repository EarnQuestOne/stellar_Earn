import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { MetricsService } from '../../../common/services/metrics.service';

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

export interface PoolConfig {
  max: number;
  min: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
}

@Injectable()
export class DatabasePoolMonitorService implements OnModuleInit, OnModuleDestroy {
  private monitoringInterval: ReturnType<typeof setInterval> | undefined;
  private readonly POLL_INTERVAL_MS = 15_000; // 15 seconds

  private lastExhaustionAlert: number | undefined;
  private lastTimeoutAlert: number | undefined;
  private lastHighUtilizationAlert: number | undefined;

  // Rolling counters for connection acquisition metrics
  private acquisitionTimeSamples: number[] = [];
  private timeoutCount = 0;
  private failedConnectionCount = 0;
  private retryCount = 0;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: AppLoggerService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.registerMetrics();
    this.startMonitoring();
    this.logger.log('Database pool monitor initialized', 'DatabasePoolMonitorService');
  }

  onModuleDestroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Get current pool statistics */
  getPoolStats(): PoolStats {
    const driver = this.dataSource.driver as any;
    const pool = driver.master?.pool || driver.pool;

    if (!pool) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
      };
    }

    // TypeORM/pg pool structure
    const totalCount = pool.totalCount || 0;
    const idleCount = pool.idleCount || 0;
    const waitingCount = pool.waitingCount || 0;

    return {
      totalConnections: totalCount,
      activeConnections: totalCount - idleCount,
      idleConnections: idleCount,
      waitingRequests: waitingCount,
    };
  }

  /** Get pool configuration */
  getPoolConfig(): PoolConfig {
    const options = this.dataSource.options as any;
    const extra = options.extra || {};

    return {
      max: extra.max || 10,
      min: extra.min || 0,
      connectionTimeoutMillis: extra.connectionTimeoutMillis || 10000,
      idleTimeoutMillis: extra.idleTimeoutMillis || 30000,
    };
  }

  /** Calculate pool utilization percentage */
  getUtilizationPercentage(): number {
    const stats = this.getPoolStats();
    const config = this.getPoolConfig();
    if (config.max === 0) return 0;
    return (stats.totalConnections / config.max) * 100;
  }

  /** Record a connection acquisition time (in milliseconds) */
  recordAcquisitionTime(durationMs: number): void {
    this.acquisitionTimeSamples.push(durationMs);
    // Keep only last 100 samples
    if (this.acquisitionTimeSamples.length > 100) {
      this.acquisitionTimeSamples.shift();
    }
    this.metrics.observeHistogram('db_pool_acquire_duration_ms', durationMs);
  }

  /** Record a connection timeout event */
  recordTimeout(): void {
    this.timeoutCount++;
    this.metrics.incrementCounter('db_pool_timeout_total');
    this.logger.warn('Database connection timeout detected', 'DatabasePoolMonitorService', {
      timeoutCount: this.timeoutCount,
    });
  }

  /** Record a failed connection attempt */
  recordFailedConnection(): void {
    this.failedConnectionCount++;
    this.metrics.incrementCounter('db_pool_failed_connections_total');
    this.logger.error('Database connection failed', 'DatabasePoolMonitorService', {
      failedCount: this.failedConnectionCount,
    });
  }

  /** Record a connection retry attempt */
  recordRetry(): void {
    this.retryCount++;
    this.metrics.incrementCounter('db_pool_retry_total');
  }

  /** Get average acquisition time from recent samples */
  getAverageAcquisitionTime(): number {
    if (this.acquisitionTimeSamples.length === 0) return 0;
    const sum = this.acquisitionTimeSamples.reduce((a, b) => a + b, 0);
    return sum / this.acquisitionTimeSamples.length;
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  private registerMetrics(): void {
    // Pool connection metrics
    this.metrics.registerGauge('db_pool_active_connections', 'Number of active database connections');
    this.metrics.registerGauge('db_pool_idle_connections', 'Number of idle database connections');
    this.metrics.registerGauge('db_pool_total_connections', 'Total number of database connections');
    this.metrics.registerGauge('db_pool_waiting_requests', 'Number of requests waiting for a connection');
    this.metrics.registerGauge('db_pool_utilization_percent', 'Pool utilization as percentage of max connections');

    // Acquisition metrics
    this.metrics.registerHistogram('db_pool_acquire_duration_ms', 'Time to acquire a connection from pool (ms)');
    this.metrics.registerCounter('db_pool_timeout_total', 'Total connection timeout events');
    this.metrics.registerCounter('db_pool_failed_connections_total', 'Total failed connection attempts');
    this.metrics.registerCounter('db_pool_retry_total', 'Total connection retry attempts');
    this.metrics.registerCounter('db_pool_exhaustion_total', 'Total pool exhaustion events');
  }

  private startMonitoring(): void {
    const collect = () => {
      try {
        this.collectPoolMetrics();
        this.checkExhaustionConditions();
      } catch (error) {
        // Don't crash the app if monitoring fails
        this.logger.warn(
          'Failed to collect pool metrics',
          'DatabasePoolMonitorService',
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    };

    collect(); // Initial collection
    this.monitoringInterval = setInterval(collect, this.POLL_INTERVAL_MS);
    if (this.monitoringInterval && typeof this.monitoringInterval.unref === 'function') {
      this.monitoringInterval.unref();
    }
  }

  private collectPoolMetrics(): void {
    const stats = this.getPoolStats();
    const config = this.getPoolConfig();
    const utilization = this.getUtilizationPercentage();

    this.metrics.setGauge('db_pool_active_connections', stats.activeConnections);
    this.metrics.setGauge('db_pool_idle_connections', stats.idleConnections);
    this.metrics.setGauge('db_pool_total_connections', stats.totalConnections);
    this.metrics.setGauge('db_pool_waiting_requests', stats.waitingRequests);
    this.metrics.setGauge('db_pool_utilization_percent', utilization);

    // Log if waiting queue is growing
    if (stats.waitingRequests > 5) {
      this.logger.warn('Database pool waiting queue elevated', 'DatabasePoolMonitorService', {
        waitingRequests: stats.waitingRequests,
        activeConnections: stats.activeConnections,
        maxConnections: config.max,
      });
    }
  }

  private checkExhaustionConditions(): void {
    const stats = this.getPoolStats();
    const config = this.getPoolConfig();
    const utilization = this.getUtilizationPercentage();
    const now = Date.now();

    // Check for pool exhaustion (all connections in use + waiting requests)
    if (stats.totalConnections >= config.max && stats.waitingRequests > 0) {
      const cooldown = 5 * 60 * 1000; // 5 minutes
      if (!this.lastExhaustionAlert || now - this.lastExhaustionAlert > cooldown) {
        this.metrics.incrementCounter('db_pool_exhaustion_total');
        this.lastExhaustionAlert = now;
        this.logger.error('Database pool exhaustion detected', 'DatabasePoolMonitorService', {
          totalConnections: stats.totalConnections,
          maxConnections: config.max,
          waitingRequests: stats.waitingRequests,
          utilization: `${utilization.toFixed(1)}%`,
        });
      }
    }

    // Check for high utilization (> 90%)
    if (utilization > 90) {
      const cooldown = 5 * 60 * 1000; // 5 minutes
      if (!this.lastHighUtilizationAlert || now - this.lastHighUtilizationAlert > cooldown) {
        this.lastHighUtilizationAlert = now;
        this.logger.warn('Database pool utilization critical', 'DatabasePoolMonitorService', {
          utilization: `${utilization.toFixed(1)}%`,
          activeConnections: stats.activeConnections,
          maxConnections: config.max,
        });
      }
    }

    // Check for timeout spikes
    if (this.timeoutCount > 0) {
      const cooldown = 2 * 60 * 1000; // 2 minutes
      if (!this.lastTimeoutAlert || now - this.lastTimeoutAlert > cooldown) {
        this.lastTimeoutAlert = now;
        this.logger.error('Database connection timeout spike detected', 'DatabasePoolMonitorService', {
          timeoutCount: this.timeoutCount,
          avgAcquisitionTime: `${this.getAverageAcquisitionTime().toFixed(1)}ms`,
        });
        // Reset counter after alerting
        this.timeoutCount = 0;
      }
    }
  }
}
