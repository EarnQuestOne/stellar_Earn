import { SetMetadata } from '@nestjs/common';
import { AppLoggerService } from '../logger/logger.service';

export const LOG_CONTEXT_KEY = 'log:context';
export const LOG_OPERATION_KEY = 'log:operation';

export interface LogContextOptions {
  /** Logical context label for the log entry (defaults to class name) */
  context?: string;
  /** Operation name for performance tracking (defaults to ClassName.methodName) */
  operation?: string;
  /** Track execution time via measureAsync (default: true) */
  trackPerformance?: boolean;
  /** Log argument keys on entry (default: false — avoid logging sensitive data) */
  logArgs?: boolean;
}

/**
 * Method decorator that adds structured log context and optional performance tracking.
 *
 * The decorated method's class must expose `this.logger` as an AppLoggerService instance.
 *
 * @example
 * \@LogContext({ operation: 'quest.create', trackPerformance: true })
 * async createQuest(dto: CreateQuestDto) { ... }
 */
export function LogContext(options: LogContextOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (...a: unknown[]) => unknown;
    const methodName = String(propertyKey);
    const className = (target as { constructor: { name: string } }).constructor.name;

    descriptor.value = async function (
      this: { logger?: AppLoggerService },
      ...args: unknown[]
    ) {
      const logger = this.logger;
      const operation = options.operation ?? `${className}.${methodName}`;
      const context = options.context ?? className;

      if (!logger) {
        return originalMethod.apply(this, args);
      }

      if (options.logArgs) {
        logger.debug(`Entering ${operation}`, context, {
          argKeys: args.map((a) =>
            typeof a === 'object' && a !== null ? Object.keys(a as object) : typeof a,
          ),
        });
      }

      if (options.trackPerformance !== false) {
        return logger.measureAsync(
          operation,
          () => originalMethod.apply(this, args) as Promise<unknown>,
          { context },
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Shorthand: tracks performance for the decorated method.
 * Uses `ClassName.methodName` as the operation name.
 *
 * @example
 * \@TrackPerformance()
 * async expensiveOperation() { ... }
 */
export function TrackPerformance(context?: string): MethodDecorator {
  return LogContext({ context, trackPerformance: true });
}

/** Attach an operation name as metadata for logging interceptors. */
export const LogOperation = (operation: string) =>
  SetMetadata(LOG_OPERATION_KEY, operation);

/** Attach a context label as metadata for logging interceptors. */
export const LogContextMeta = (context: string) =>
  SetMetadata(LOG_CONTEXT_KEY, context);
