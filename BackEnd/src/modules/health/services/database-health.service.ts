import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthCheckResult, ServiceStatus } from '../types/health.types';

const DATABASE_TIMEOUT_MS = 3000;
const DATABASE_DEGRADED_THRESHOLD_MS = 500; // Mark as degraded if query takes > 500ms

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Use a timeout wrapper to prevent hanging
      const result = await Promise.race([
        this.dataSource.query('SELECT 1'),
        this.timeoutPromise(DATABASE_TIMEOUT_MS),
      ]);

      if (result === null) {
        // Timeout occurred
        const latency = Date.now() - startTime;
        this.logger.warn(`Database health check timed out after ${DATABASE_TIMEOUT_MS}ms`);
        return {
          status: 'degraded',
          latency,
          error: `Health check timed out after ${DATABASE_TIMEOUT_MS}ms`,
        };
      }

      const latency = Date.now() - startTime;
      
      if (latency > DATABASE_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(`Database health check slow: ${latency}ms (threshold: ${DATABASE_DEGRADED_THRESHOLD_MS}ms)`);
        return {
          status: 'degraded',
          latency,
          error: `Response time ${latency}ms exceeds threshold of ${DATABASE_DEGRADED_THRESHOLD_MS}ms`,
        };
      }

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database health check failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      return {
        status: 'down',
        latency,
        error: errorMessage,
      };
    }
  }

  private timeoutPromise(ms: number): Promise<null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), ms);
    });
  }
}
