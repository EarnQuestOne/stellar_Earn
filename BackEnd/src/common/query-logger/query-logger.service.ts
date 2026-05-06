import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface QueryMetrics {
  query: string;
  parameters?: any[];
  executionTime: number;
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  affectedRows?: number;
}

export interface SlowQueryAlert {
  query: string;
  executionTime: number;
  threshold: number;
  parameters?: any[];
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class QueryLoggerService {
  private readonly logger = new AppLoggerService();
  private readonly slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');
  private readonly criticalQueryThreshold = parseInt(process.env.CRITICAL_QUERY_THRESHOLD || '5000');
  private readonly queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.setContext('QueryLogger');
  }

  logQuery(query: string, parameters?: any[], executionTime?: number, affectedRows?: number): void {
    const metrics: QueryMetrics = {
      query: query.trim(),
      parameters,
      executionTime: executionTime || 0,
      timestamp: new Date(),
      correlationId: this.getCurrentCorrelationId(),
      userId: this.getCurrentUserId(),
      affectedRows,
    };

    this.addToMetrics(metrics);
    this.checkSlowQuery(metrics);
    this.emitQueryEvent(metrics);
  }

  logQueryError(error: string, query: string, parameters?: any[]): void {
    this.logger.error('Database Query Error', error, 'Database', {
      query: query.trim(),
      parameters,
      type: 'query_error',
      correlationId: this.getCurrentCorrelationId(),
      userId: this.getCurrentUserId(),
    });

    this.eventEmitter.emit('query.error', {
      error,
      query: query.trim(),
      parameters,
      timestamp: new Date(),
      correlationId: this.getCurrentCorrelationId(),
      userId: this.getCurrentUserId(),
    });
  }

  logSlowQuery(executionTime: number, query: string, parameters?: any[]): void {
    const alert: SlowQueryAlert = {
      query: query.trim(),
      executionTime,
      threshold: this.slowQueryThreshold,
      parameters,
      timestamp: new Date(),
      correlationId: this.getCurrentCorrelationId(),
      userId: this.getCurrentUserId(),
      severity: this.calculateSeverity(executionTime),
    };

    this.logger.warn('Slow Query Detected', 'Database', {
      ...alert,
      type: 'slow_query',
    });

    this.eventEmitter.emit('query.slow', alert);
  }

  getQueryMetrics(limit: number = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  getSlowQueries(threshold?: number): QueryMetrics[] {
    const queryThreshold = threshold || this.slowQueryThreshold;
    return this.queryMetrics.filter(metric => metric.executionTime > queryThreshold);
  }

  getQueryStatistics(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueriesCount: number;
    slowQueriesPercentage: number;
    criticalQueriesCount: number;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueriesCount: 0,
        slowQueriesPercentage: 0,
        criticalQueriesCount: 0,
      };
    }

    const totalQueries = this.queryMetrics.length;
    const totalExecutionTime = this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / totalQueries;
    const slowQueries = this.getSlowQueries();
    const criticalQueries = this.getSlowQueries(this.criticalQueryThreshold);

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      slowQueriesCount: slowQueries.length,
      slowQueriesPercentage: Math.round((slowQueries.length / totalQueries) * 100 * 100) / 100,
      criticalQueriesCount: criticalQueries.length,
    };
  }

  clearMetrics(): void {
    this.queryMetrics.length = 0;
    this.logger.info('Query metrics cleared', 'QueryLogger');
  }

  private addToMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.splice(0, this.queryMetrics.length - this.maxMetricsHistory);
    }
  }

  private checkSlowQuery(metrics: QueryMetrics): void {
    if (metrics.executionTime > this.slowQueryThreshold) {
      this.logSlowQuery(metrics.executionTime, metrics.query, metrics.parameters);
    }
  }

  private emitQueryEvent(metrics: QueryMetrics): void {
    this.eventEmitter.emit('query.executed', metrics);
  }

  private calculateSeverity(executionTime: number): SlowQueryAlert['severity'] {
    if (executionTime > this.criticalQueryThreshold) {
      return 'critical';
    } else if (executionTime > this.slowQueryThreshold * 3) {
      return 'high';
    } else if (executionTime > this.slowQueryThreshold * 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getCurrentCorrelationId(): string | undefined {
    return AppLoggerService.getRequestContext()?.correlationId;
  }

  private getCurrentUserId(): string | undefined {
    return AppLoggerService.getRequestContext()?.userId;
  }
}
