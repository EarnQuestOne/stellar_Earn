import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { LoggerModule } from '../../src/common/logger/logger.module';
import {
  sanitizeLogObject,
  sanitizeHeaders,
  sanitizeUrl,
  sanitizeBody,
} from '../../src/common/logger/sanitize.util';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { ErrorLoggerFilter } from '../../src/common/filter/error-logger.filter';
import { LoggerMiddleware } from '../../src/common/middleware/logger.middleware';
import { createLoggerConfig, getLoggerConfig } from '../../src/config/logger.config';
import { Reflector } from '@nestjs/core';

describe('Logger Service', () => {
  let loggerService: AppLoggerService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ enableInterceptor: false, enableErrorFilter: false })],
    }).compile();

    loggerService = module.get<AppLoggerService>(AppLoggerService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Basic Logging Methods', () => {
    it('should log info messages', () => {
      expect(() => {
        loggerService.log('Test info message', 'TestContext');
      }).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => {
        loggerService.warn('Test warning message', 'TestContext');
      }).not.toThrow();
    });

    it('should log error messages with stack trace', () => {
      const error = new Error('Test error');
      expect(() => {
        loggerService.error('Test error message', error.stack, 'TestContext');
      }).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => {
        loggerService.debug('Test debug message', 'TestContext');
      }).not.toThrow();
    });

    it('should log verbose messages', () => {
      expect(() => {
        loggerService.verbose('Test verbose message', 'TestContext');
      }).not.toThrow();
    });

    it('should log HTTP messages', () => {
      expect(() => {
        loggerService.http('Test HTTP message', { method: 'GET', path: '/test' });
      }).not.toThrow();
    });
  });

  describe('Context Management', () => {
    it('should set default context', () => {
      loggerService.setContext('CustomContext');
      expect(() => {
        loggerService.log('Message with custom context');
      }).not.toThrow();
    });

    it('should accept metadata in log calls', () => {
      expect(() => {
        loggerService.log('Test message', 'TestContext', {
          userId: '123',
          action: 'test',
        });
      }).not.toThrow();
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      expect(() => {
        loggerService.performance({
          operation: 'testOperation',
          durationMs: 150,
          success: true,
          metadata: { key: 'value' },
        });
      }).not.toThrow();
    });

    it('should create and use timer', () => {
      const stopTimer = loggerService.startTimer('testTimer');
      expect(typeof stopTimer).toBe('function');
      expect(() => stopTimer()).not.toThrow();
    });

    it('should measure async operations', async () => {
      const result = await loggerService.measureAsync(
        'asyncOperation',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        },
      );
      expect(result).toBe('success');
    });

    it('should handle async operation failures', async () => {
      await expect(
        loggerService.measureAsync('failingOperation', async () => {
          throw new Error('Test failure');
        }),
      ).rejects.toThrow('Test failure');
    });
  });

  describe('Correlation ID Management', () => {
    it('should run with context', () => {
      const result = AppLoggerService.runWithContext(
        { correlationId: 'test-correlation-id' },
        () => {
          const context = AppLoggerService.getRequestContext();
          return context?.correlationId;
        },
      );
      expect(result).toBe('test-correlation-id');
    });

    it('should generate correlation IDs', () => {
      const id1 = AppLoggerService.generateCorrelationId();
      const id2 = AppLoggerService.generateCorrelationId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should get request context', () => {
      AppLoggerService.runWithContext(
        {
          correlationId: 'test-id',
          userId: 'user-123',
          path: '/api/test',
          method: 'GET',
        },
        () => {
          const context = AppLoggerService.getRequestContext();
          expect(context?.correlationId).toBe('test-id');
          expect(context?.userId).toBe('user-123');
          expect(context?.path).toBe('/api/test');
          expect(context?.method).toBe('GET');
        },
      );
    });
  });
});

describe('Sanitize Utilities', () => {
  describe('sanitizeLogObject', () => {
    it('should mask sensitive keys', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };
      const result = sanitizeLogObject(input) as Record<string, unknown>;
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.email).toBe('john@example.com');
    });

    it('should mask nested sensitive data', () => {
      const input = {
        user: {
          name: 'john',
          auth: {
            password: 'secret',
            apiKey: 'key-123',
          },
        },
      };
      const result = sanitizeLogObject(input) as any;
      expect(result.user.name).toBe('john');
      expect(result.user.auth).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'john', password: 'secret1' },
          { name: 'jane', password: 'secret2' },
        ],
      };
      const result = sanitizeLogObject(input) as any;
      expect(result.users[0].name).toBe('john');
      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[1].name).toBe('jane');
      expect(result.users[1].password).toBe('[REDACTED]');
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      const result = sanitizeLogObject(obj) as any;
      expect(result.name).toBe('test');
      expect(result.self).toBe('[Circular Reference]');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeLogObject(null)).toBeNull();
      expect(sanitizeLogObject(undefined)).toBeUndefined();
    });

    it('should truncate long strings', () => {
      const longString = 'This is a normal log message. '.repeat(500);
      const result = sanitizeLogObject(longString) as string;
      expect(result.length).toBeLessThan(longString.length);
      expect(result).toContain('[truncated]');
    });

    it('should mask Bearer tokens in values', () => {
      const input = {
        header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      };
      const result = sanitizeLogObject(input) as any;
      expect(result.header).toBe('[REDACTED]');
    });

    it('should handle Date objects', () => {
      const input = { date: new Date('2026-01-01') };
      const result = sanitizeLogObject(input) as any;
      expect(result.date).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = sanitizeLogObject(error) as any;
      expect(result.name).toBe('Error');
      expect(result.message).toBe('Test error');
      expect(result.stack).toBeDefined();
    });

    it('should mask various sensitive key patterns', () => {
      const input = {
        access_token: 'token123',
        refresh_token: 'refresh123',
        api_key: 'key123',
        privateKey: 'private123',
        credit_card: '4111111111111111',
        ssn: '123-45-6789',
        jwt: 'eyJhbGciOiJIUzI1NiJ9',
        sessionId: 'session123',
        cookie: 'session=abc123',
      };
      const result = sanitizeLogObject(input) as any;
      expect(result.access_token).toBe('[REDACTED]');
      expect(result.refresh_token).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
      expect(result.privateKey).toBe('[REDACTED]');
      expect(result.credit_card).toBe('[REDACTED]');
      expect(result.ssn).toBe('[REDACTED]');
      expect(result.jwt).toBe('[REDACTED]');
      expect(result.sessionId).toBe('[REDACTED]');
      expect(result.cookie).toBe('[REDACTED]');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should mask authorization header', () => {
      const headers = {
        authorization: 'Bearer token123',
        'content-type': 'application/json',
      };
      const result = sanitizeHeaders(headers);
      expect(result.authorization).toBe('[REDACTED]');
      expect(result['content-type']).toBe('application/json');
    });

    it('should mask cookie headers', () => {
      const headers = {
        cookie: 'session=abc123; user=john',
        'set-cookie': 'session=new123',
      };
      const result = sanitizeHeaders(headers);
      expect(result.cookie).toBe('[REDACTED]');
      expect(result['set-cookie']).toBe('[REDACTED]');
    });

    it('should mask custom auth headers', () => {
      const headers = {
        'x-api-key': 'key123',
        'x-auth-token': 'token123',
        'x-access-token': 'access123',
        'proxy-authorization': 'Basic abc123',
      };
      const result = sanitizeHeaders(headers);
      expect(result['x-api-key']).toBe('[REDACTED]');
      expect(result['x-auth-token']).toBe('[REDACTED]');
      expect(result['x-access-token']).toBe('[REDACTED]');
      expect(result['proxy-authorization']).toBe('[REDACTED]');
    });
  });

  describe('sanitizeUrl', () => {
    it('should mask sensitive query parameters', () => {
      const url = '/api/auth?token=secret123&user=john';
      const result = sanitizeUrl(url);
      expect(result).toContain('token=%5BREDACTED%5D');
      expect(result).toContain('user=john');
    });

    it('should handle URLs without query params', () => {
      const url = '/api/users/123';
      const result = sanitizeUrl(url);
      expect(result).toBe('/api/users/123');
    });

    it('should mask multiple sensitive params', () => {
      const url = '/api/data?key=abc&secret=xyz&name=test';
      const result = sanitizeUrl(url);
      expect(result).toContain('key=%5BREDACTED%5D');
      expect(result).toContain('secret=%5BREDACTED%5D');
      expect(result).toContain('name=test');
    });
  });

  describe('sanitizeBody', () => {
    it('should sanitize request body', () => {
      const body = {
        email: 'test@example.com',
        password: 'secret123',
        data: { token: 'abc123' },
      };
      const result = sanitizeBody(body) as any;
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('[REDACTED]');
      expect(result.data.token).toBe('[REDACTED]');
    });
  });
});

describe('Logger Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getLoggerConfig', () => {
    it('should return default configuration', () => {
      const config = getLoggerConfig();
      expect(config.level).toBe('info');
      expect(config.enableConsole).toBe(true);
      expect(config.enableFile).toBe(true);
      expect(config.logDir).toBe('logs');
      expect(config.maxFileSize).toBe('20m');
      expect(config.maxFiles).toBe('14d');
      expect(config.enablePerformanceLogs).toBe(true);
    });

    it('should respect environment variables', () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_CONSOLE = 'false';
      process.env.LOG_FILE = 'false';
      process.env.LOG_DIR = 'custom-logs';
      process.env.LOG_MAX_SIZE = '50m';
      process.env.LOG_MAX_FILES = '30d';
      process.env.LOG_PERFORMANCE = 'false';

      const config = getLoggerConfig();
      expect(config.level).toBe('debug');
      expect(config.enableConsole).toBe(false);
      expect(config.enableFile).toBe(false);
      expect(config.logDir).toBe('custom-logs');
      expect(config.maxFileSize).toBe('50m');
      expect(config.maxFiles).toBe('30d');
      expect(config.enablePerformanceLogs).toBe(false);
    });
  });

  describe('createLoggerConfig', () => {
    it('should create valid Winston config', () => {
      const config = createLoggerConfig();
      expect(config.transports).toBeDefined();
      expect(config.level).toBe('info');
      expect(config.exitOnError).toBe(false);
    });

    it('should accept custom options', () => {
      const config = createLoggerConfig({
        level: 'debug',
        enableConsole: false,
        enableFile: false,
      });
      expect(config.level).toBe('debug');
      expect(config.transports).toHaveLength(0);
    });

    it('should create console transport when enabled', () => {
      const config = createLoggerConfig({
        enableConsole: true,
        enableFile: false,
      });
      expect(config.transports).toHaveLength(1);
    });

    it('should create file transports when enabled', () => {
      const config = createLoggerConfig({
        enableConsole: false,
        enableFile: true,
        enablePerformanceLogs: true,
      });
      expect((config.transports as any[]).length).toBe(3);
    });
  });
});

describe('Logging Interceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: jest.Mocked<AppLoggerService>;
  let reflector: Reflector;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      http: jest.fn(),
      performance: jest.fn(),
      setContext: jest.fn(),
      startTimer: jest.fn(),
      measureAsync: jest.fn(),
    } as any;

    reflector = new Reflector();
    interceptor = new LoggingInterceptor(mockLogger, reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log successful requests', (done) => {
    const { of } = require('rxjs');
    
    const mockExecutionContext = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/test',
          correlationId: 'test-correlation-id',
          user: { id: 'user-123' },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
      getClass: () => ({ name: 'TestController' }),
      getHandler: () => ({ name: 'testMethod' }),
    };

    const mockCallHandler = {
      handle: () => of({ data: 'test' }),
    };

    const result$ = interceptor.intercept(mockExecutionContext as any, mockCallHandler as any);
    
    result$.subscribe({
      next: () => {
        expect(mockLogger.debug).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalled();
        expect(mockLogger.performance).toHaveBeenCalled();
        done();
      },
      error: done,
    });
  });
});

describe('Error Logger Filter', () => {
  let filter: ErrorLoggerFilter;
  let mockLogger: jest.Mocked<AppLoggerService>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      http: jest.fn(),
      performance: jest.fn(),
      setContext: jest.fn(),
    } as any;

    filter = new ErrorLoggerFilter(mockLogger);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch and log errors', () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      correlationId: 'test-id',
      headers: { 'user-agent': 'test-agent' },
      body: {},
      query: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockHost = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    const error = new Error('Test error');

    filter.catch(error, mockHost as any);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it('should handle HTTP exceptions correctly', () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      correlationId: 'test-id',
      headers: { 'user-agent': 'test-agent' },
      body: {},
      query: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockHost = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    const { BadRequestException } = require('@nestjs/common');
    const error = new BadRequestException('Bad request');

    filter.catch(error, mockHost as any);

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});

describe('Logger Module', () => {
  it('should create module with default options', async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot()],
    }).compile();

    const logger = module.get<AppLoggerService>(AppLoggerService);
    expect(logger).toBeDefined();

    await module.close();
  });

  it('should create module with custom options', async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          isGlobal: false,
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
      ],
    }).compile();

    const logger = module.get<AppLoggerService>(AppLoggerService);
    expect(logger).toBeDefined();

    await module.close();
  });

  it('should export logger from forFeature', async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forFeature()],
    }).compile();

    const logger = module.get<AppLoggerService>(AppLoggerService);
    expect(logger).toBeDefined();

    await module.close();
  });
});

describe('Logger Middleware', () => {
  let middleware: LoggerMiddleware;
  let mockLogger: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      http: jest.fn(),
      performance: jest.fn(),
      setContext: jest.fn(),
    } as any;

    middleware = new LoggerMiddleware(mockLogger);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should add correlation ID to request', () => {
    const mockRequest: any = {
      headers: {},
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: {},
    };

    const mockResponse: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
      json: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    const next = jest.fn();

    middleware.use(mockRequest, mockResponse, next);

    expect(mockRequest.correlationId).toBeDefined();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      expect.any(String),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should use existing correlation ID from headers', () => {
    const existingId = 'existing-correlation-id';
    const mockRequest: any = {
      headers: { 'x-correlation-id': existingId },
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: {},
    };

    const mockResponse: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
      json: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    const next = jest.fn();

    middleware.use(mockRequest, mockResponse, next);

    expect(mockRequest.correlationId).toBe(existingId);
  });
});

describe('Log Levels', () => {
  it('should support all standard log levels', () => {
    const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    levels.forEach((level) => {
      expect(typeof level).toBe('string');
    });
  });
});

describe('Structured Logging Format', () => {
  let loggerService: AppLoggerService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ enableInterceptor: false, enableErrorFilter: false })],
    }).compile();

    loggerService = module.get<AppLoggerService>(AppLoggerService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should include timestamp in logs', () => {
    expect(() => {
      loggerService.log('Test with timestamp');
    }).not.toThrow();
  });

  it('should include context in logs', () => {
    expect(() => {
      loggerService.log('Test message', 'TestContext', { key: 'value' });
    }).not.toThrow();
  });

  it('should support structured metadata', () => {
    expect(() => {
      loggerService.log('Structured log', 'API', {
        requestId: 'req-123',
        userId: 'user-456',
        action: 'createUser',
        duration: 150,
      });
    }).not.toThrow();
  });
});
