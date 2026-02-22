import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: string;
  maxFiles: string;
  enablePerformanceLogs: boolean;
}

export const getLoggerConfig = (): LoggerConfig => ({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE !== 'false',
  logDir: process.env.LOG_DIR || 'logs',
  maxFileSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  enablePerformanceLogs: process.env.LOG_PERFORMANCE !== 'false',
});

const addCorrelationId = winston.format((info) => {
  if (!info.correlationId && typeof global !== 'undefined') {
    const asyncLocalStorage = (global as any).__requestContext;
    if (asyncLocalStorage) {
      const store = asyncLocalStorage.getStore();
      if (store?.correlationId) {
        info.correlationId = store.correlationId;
      }
    }
  }
  return info;
});

const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  addCorrelationId(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  addCorrelationId(),
  winston.format.errors({ stack: true }),
  nestWinstonModuleUtilities.format.nestLike('StellarEarn', {
    colors: true,
    prettyPrint: true,
  }),
);

export const createLoggerConfig = (config?: Partial<LoggerConfig>): winston.LoggerOptions => {
  const finalConfig = { ...getLoggerConfig(), ...config };
  const transports: winston.transport[] = [];

  if (finalConfig.enableConsole) {
    transports.push(
      new winston.transports.Console({
        level: finalConfig.level,
        format: consoleFormat,
      }),
    );
  }

  if (finalConfig.enableFile) {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: `${finalConfig.logDir}/application-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: finalConfig.maxFileSize,
        maxFiles: finalConfig.maxFiles,
        level: finalConfig.level,
        format: structuredFormat,
      }),
    );

    transports.push(
      new winston.transports.DailyRotateFile({
        filename: `${finalConfig.logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: finalConfig.maxFileSize,
        maxFiles: '30d',
        level: 'error',
        format: structuredFormat,
      }),
    );

    if (finalConfig.enablePerformanceLogs) {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${finalConfig.logDir}/performance-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: finalConfig.maxFileSize,
          maxFiles: '7d',
          level: 'info',
          format: structuredFormat,
        }),
      );
    }
  }

  return {
    level: finalConfig.level,
    transports,
    exitOnError: false,
  };
};

export const loggerConfig = createLoggerConfig();
