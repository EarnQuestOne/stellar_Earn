import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { createLoggerConfig, LoggerConfig } from '../../config/logger.config';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  correlationId: string;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
}

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, any>;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
(global as any).__requestContext = requestContextStorage;

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly performanceLogger: winston.Logger;
  private defaultContext: string = 'Application';

  constructor() {
    this.logger = winston.createLogger(createLoggerConfig());
    this.performanceLogger = winston.createLogger(createLoggerConfig({ enableConsole: false }));
  }

  setContext(context: string): void {
    this.defaultContext = context;
  }

  private getCorrelationId(): string | undefined {
    return requestContextStorage.getStore()?.correlationId;
  }

  private getUserId(): string | undefined {
    return requestContextStorage.getStore()?.userId;
  }

  private formatMeta(context?: string, meta?: Record<string, any>): Record<string, any> {
    return {
      context: context || this.defaultContext,
      correlationId: this.getCorrelationId(),
      userId: this.getUserId(),
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  log(message: string, context?: string, meta?: Record<string, any>): void;
  log(message: string, ...optionalParams: any[]): void;
  log(message: string, contextOrParams?: string | any, meta?: Record<string, any>): void {
    const context = typeof contextOrParams === 'string' ? contextOrParams : undefined;
    const additionalMeta = typeof contextOrParams === 'object' ? contextOrParams : meta;
    
    this.logger.info(message, this.formatMeta(context, additionalMeta));
  }

  warn(message: string, context?: string, meta?: Record<string, any>): void;
  warn(message: string, ...optionalParams: any[]): void;
  warn(message: string, contextOrParams?: string | any, meta?: Record<string, any>): void {
    const context = typeof contextOrParams === 'string' ? contextOrParams : undefined;
    const additionalMeta = typeof contextOrParams === 'object' ? contextOrParams : meta;
    
    this.logger.warn(message, this.formatMeta(context, additionalMeta));
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void;
  error(message: string, ...optionalParams: any[]): void;
  error(
    message: string,
    traceOrParams?: string | any,
    context?: string,
    meta?: Record<string, any>,
  ): void {
    const trace = typeof traceOrParams === 'string' ? traceOrParams : undefined;
    const ctx = typeof traceOrParams === 'string' ? context : undefined;
    const additionalMeta = typeof traceOrParams === 'object' ? traceOrParams : meta;

    this.logger.error(message, {
      ...this.formatMeta(ctx, additionalMeta),
      stack: trace,
    });
  }

  debug(message: string, context?: string, meta?: Record<string, any>): void;
  debug(message: string, ...optionalParams: any[]): void;
  debug(message: string, contextOrParams?: string | any, meta?: Record<string, any>): void {
    const context = typeof contextOrParams === 'string' ? contextOrParams : undefined;
    const additionalMeta = typeof contextOrParams === 'object' ? contextOrParams : meta;
    
    this.logger.debug(message, this.formatMeta(context, additionalMeta));
  }

  verbose(message: string, context?: string, meta?: Record<string, any>): void;
  verbose(message: string, ...optionalParams: any[]): void;
  verbose(message: string, contextOrParams?: string | any, meta?: Record<string, any>): void {
    const context = typeof contextOrParams === 'string' ? contextOrParams : undefined;
    const additionalMeta = typeof contextOrParams === 'object' ? contextOrParams : meta;
    
    this.logger.verbose(message, this.formatMeta(context, additionalMeta));
  }

  http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, this.formatMeta('HTTP', meta));
  }

  performance(metric: PerformanceMetric): void {
    this.performanceLogger.info('Performance metric', {
      ...this.formatMeta('Performance'),
      type: 'performance',
      ...metric,
    });
  }

  startTimer(operation: string): () => void {
    const startTime = process.hrtime.bigint();
    return () => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      this.performance({
        operation,
        durationMs,
        success: true,
      });
    };
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    let success = true;
    
    try {
      return await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      this.performance({
        operation,
        durationMs,
        success,
        metadata,
      });
    }
  }

  static runWithContext<T>(context: Partial<RequestContext>, fn: () => T): T {
    const fullContext: RequestContext = {
      correlationId: context.correlationId || randomUUID(),
      ...context,
    };
    return requestContextStorage.run(fullContext, fn);
  }

  static getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore();
  }

  static setRequestContext(context: Partial<RequestContext>): void {
    const store = requestContextStorage.getStore();
    if (store) {
      Object.assign(store, context);
    }
  }

  static generateCorrelationId(): string {
    return randomUUID();
  }
}
