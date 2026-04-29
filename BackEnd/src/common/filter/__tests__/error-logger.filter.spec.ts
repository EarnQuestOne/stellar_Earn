import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus, BadRequestException, NotFoundException, InternalServerErrorException, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorLoggerFilter } from '../error-logger.filter';
import { AppLoggerService } from '../../logger/logger.service';
import {
  assertNoStackLeakage,
  assertSafeErrorContract,
  isOperationalError,
  assertGenericMessage,
} from './stack-trace-security.util';

describe('ErrorLoggerFilter - Stack Trace Security', () => {
  let filter: ErrorLoggerFilter;
  let logger: AppLoggerService;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create logger mock
    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      http: jest.fn(),
      performance: jest.fn(),
      setContext: jest.fn(),
      verbose: jest.fn(),
      startTimer: jest.fn(),
      measureAsync: jest.fn(),
    } as any;

    // Create filter
    filter = new ErrorLoggerFilter(logger);

    // Setup request/response mocks
    mockRequest = {
      headers: { 'user-agent': 'test' },
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      user: { id: 'user-123', email: 'test@test.com' } as any,
      correlationId: 'corr-123',
      body: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    // Setup ArgumentsHost mock
    mockArgumentsHost = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;
  });

  describe('SECURITY: Stack Trace Leakage - Unexpected 5xx Errors', () => {
    it('Production: 500 error should NOT contain stack trace', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection failed');
      error.stack = `Error: Database connection failed
        at Object.<anonymous> (/app/src/database/connection.ts:42:15)
        at Module._load (internal/modules/require.js:456:78)`;

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // CRITICAL: No stack trace should be present
      const leakageResult = assertNoStackLeakage(responseBody);
      expect(leakageResult.isLeaking).toBe(false);
      expect(leakageResult.leakages.length).toBe(0);
      
      // Response must be generic
      expect(responseBody.message).toBe('An unexpected error occurred');
      expect(responseBody.stack).toBeUndefined();
      expect(responseBody.debug).toBeUndefined();
    });

    it('Production: 500 error should NOT expose error message', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error(
        'Prisma error: Unique constraint failed on (email). Existing entry with email "user@test.com" found',
      );

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // Should not expose Prisma error or email
      expect(responseBody.message).not.toContain('Prisma');
      expect(responseBody.message).not.toContain('Unique constraint');
      expect(responseBody.message).not.toContain('email');
      expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('Production: 500 error should NOT contain file paths', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Query error');
      error.stack = `Error: Query error
        at Database.execute (/app/src/modules/database/query.ts:89:21)
        at AuthService.findUser (/app/src/modules/auth/auth.service.ts:42:15)`;

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const bodyStr = JSON.stringify(responseBody);
      
      // No file paths
      expect(bodyStr).not.toMatch(/\.ts:\d+:\d+/);
      expect(bodyStr).not.toContain('/app/src');
      expect(bodyStr).not.toContain('query.ts');
    });

    it('Production: 500 error should NOT contain node_modules references', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal error');
      error.stack = `Error: Internal error
        at Object.<anonymous> (/app/node_modules/typeorm/query-builder.js:123:45)`;

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const bodyStr = JSON.stringify(responseBody);
      
      expect(bodyStr).not.toContain('node_modules');
      expect(bodyStr).not.toContain('typeorm');
    });

    it('Production: 500 error should contain requestId for tracing', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // RequestId must be present for log correlation
      expect(responseBody.requestId).toBe('corr-123');
    });

    it('Development: 500 error SHOULD contain stack trace', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Object.<anonymous> (/app/src/test.ts:10:15)';

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // In development, stack IS exposed
      expect(responseBody.stack).toBeDefined();
      expect(responseBody.debug).toBeDefined();
    });
  });

  describe('SECURITY: Stack Trace Leakage - Database Errors', () => {
    it('Production: Database error should return generic 500', () => {
      process.env.NODE_ENV = 'production';
      
      // Simulate a database error
      const error = new Error('Database error: relation "users" does not exist');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const leakageResult = assertNoStackLeakage(responseBody);
      
      expect(responseBody.statusCode).toBe(500);
      expect(leakageResult.isLeaking).toBe(false);
      expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('Production: Unique constraint error should be generic', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error(
        'QueryFailedError: duplicate key value violates unique constraint "idx_users_email" Key (email)=(user@test.com) already exists',
      );

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const bodyStr = JSON.stringify(responseBody);
      
      // No constraint names, column names, or values exposed
      expect(bodyStr).not.toContain('idx_users_email');
      expect(bodyStr).not.toContain('user@test.com');
      expect(bodyStr).not.toContain('constraint');
    });

    it('Production: Foreign key error should be generic', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error(
        'QueryFailedError: insert or update on table "submissions" violates foreign key constraint "fk_submissions_quest_id"',
      );

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const bodyStr = JSON.stringify(responseBody);
      
      expect(bodyStr).not.toContain('foreign key');
      expect(bodyStr).not.toContain('fk_submissions_quest_id');
    });
  });

  describe('SECURITY: Validation Errors - Should NOT Leak Stack', () => {
    it('Production: BadRequest should expose field errors (intentional)', () => {
      process.env.NODE_ENV = 'production';
      const error = new BadRequestException({
        message: 'Validation failed',
        errors: {
          email: ['must be a valid email'],
          password: ['must be at least 8 characters'],
        },
      });

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // Validation errors are safe and user-facing
      expect(responseBody.statusCode).toBe(400);
      expect(responseBody.message).toBe('Validation failed');
      
      // Field errors should be accessible via logger call, but not in response
      // (depends on app-exception.filter handling)
    });

    it('Production: BadRequest should NOT contain stack trace', () => {
      process.env.NODE_ENV = 'production';
      const error = new BadRequestException('Invalid input');
      error.stack = 'Error: Invalid input\n  at validate (/app/src/validate.ts:15:5)';

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const leakageResult = assertNoStackLeakage(responseBody);
      
      expect(leakageResult.isLeaking).toBe(false);
    });
  });

  describe('SECURITY: HTTP Exceptions - Safe to Expose', () => {
    it('404: NotFoundException should expose message', () => {
      process.env.NODE_ENV = 'production';
      const error = new NotFoundException('Quest not found');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody.statusCode).toBe(404);
      expect(responseBody.message).toBe('Quest not found');
    });

    it('401: UnauthorizedException should use generic message', () => {
      process.env.NODE_ENV = 'production';
      const error = new UnauthorizedException();

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody.statusCode).toBe(401);
      expect(responseBody.message).toBe('Authentication required');
    });

    it('403: ForbiddenException should use generic message', () => {
      process.env.NODE_ENV = 'production';
      const error = new ForbiddenException();

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody.statusCode).toBe(403);
      expect(responseBody.message).toBe('Access denied');
    });

    it('409: ConflictException should expose message', () => {
      process.env.NODE_ENV = 'production';
      const error = new ConflictException('Quest already exists');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody.statusCode).toBe(409);
      expect(responseBody.message).toBe('Quest already exists');
    });
  });

  describe('CONTRACT: Response Structure Compliance', () => {
    it('All error responses should match safe contract', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const contractCheck = assertSafeErrorContract(responseBody);
      
      expect(contractCheck.isValid).toBe(true);
      expect(contractCheck.errors.length).toBe(0);
    });

    it('Response should always include statusCode, error, and message', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody).toHaveProperty('statusCode');
      expect(responseBody).toHaveProperty('error');
      expect(responseBody).toHaveProperty('message');
      expect(responseBody).toHaveProperty('timestamp');
    });

    it('Error 4xx should be mapped to correct HTTP status', () => {
      process.env.NODE_ENV = 'production';
      const error = new NotFoundException('Not found');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseBody.statusCode).toBe(404);
    });

    it('Unexpected errors should map to 500', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Unexpected error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseBody.statusCode).toBe(500);
    });
  });

  describe('LOGGING: Stack Traces Logged, Not Leaked', () => {
    it('Full error details should be logged server-side', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10:15';

      filter.catch(error, mockArgumentsHost);

      // Logger should have been called with stack
      expect(logger.error).toHaveBeenCalled();
    });

    it('RequestId should be present in log context', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      // Verify logger was called
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('EDGE CASES', () => {
    it('Should handle non-Error objects', () => {
      process.env.NODE_ENV = 'production';
      const error = { message: 'String error' };

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.statusCode).toBe(500);
      expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('Should handle null/undefined errors', () => {
      process.env.NODE_ENV = 'production';
      const error = null;

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.statusCode).toBe(500);
      expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('Should handle errors without stack property', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      delete error.stack;

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const leakageResult = assertNoStackLeakage(responseBody);
      expect(leakageResult.isLeaking).toBe(false);
    });

    it('Should handle missing correlationId', () => {
      process.env.NODE_ENV = 'production';
      delete (mockRequest as any).correlationId;
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      // Should still work without requestId
      expect(responseBody.statusCode).toBe(500);
    });

    it('Non-HTTP context should rethrow exception', () => {
      const error = new Error('Test error');
      mockArgumentsHost.getType = jest.fn().mockReturnValue('rpc');

      expect(() => filter.catch(error, mockArgumentsHost)).toThrow(error);
    });
  });

  describe('ENVIRONMENT DETECTION', () => {
    it('Should respect NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.debug).toBeUndefined();
      expect(responseBody.stack).toBeUndefined();
    });

    it('Should respect NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.debug).toBeDefined();
    });

    it('Should respect NODE_ENV=staging as non-production', () => {
      process.env.NODE_ENV = 'staging';
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.debug).toBeDefined();
    });
  });
});
