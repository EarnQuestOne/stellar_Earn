import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConflictException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../services/idempotency.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyService: jest.Mocked<IdempotencyService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRequest = (overrides: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = {};
    if (overrides.idempotencyKey) {
      headers['idempotency-key'] = overrides.idempotencyKey as string;
    }
    return {
      method: 'POST',
      url: '/payouts/claim',
      originalUrl: '/payouts/claim',
      headers,
      body: {
        submissionId: '550e8400-e29b-41d4-a716-446655440001',
        stellarAddress:
          'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      },
      ...overrides,
    };
  };

  const mockResponse = () => {
    const res: { statusCode: number; setHeader: jest.Mock } = {
      statusCode: 200,
      setHeader: jest.fn(),
    };
    return res;
  };

  const mockExecutionContext = (
    req: Record<string, unknown>,
    res?: Record<string, unknown>,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res ?? mockResponse(),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  const mockCallHandler = (response?: unknown) => ({
    handle: jest.fn(() =>
      of(response ?? { id: 'payout-1', status: 'processing' }),
    ),
  });

  beforeEach(async () => {
    const mockIdempotencyService = {
      computeFingerprint: jest.fn().mockReturnValue('mock-fingerprint'),
      computeBodyHash: jest.fn().mockReturnValue('mock-body-hash'),
      findByKey: jest.fn(),
      findCompletedByFingerprint: jest.fn(),
      tryAcquire: jest.fn(),
      complete: jest.fn(),
      remove: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    idempotencyService = module.get(IdempotencyService);
    reflector = module.get(Reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('when endpoint is not idempotent', () => {
    it('should pass through without idempotency check', (done) => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = mockExecutionContext(mockRequest());
      const next = mockCallHandler({ data: 'ok' });

      interceptor.intercept(context, next).subscribe((result) => {
        expect(next.handle).toHaveBeenCalled();
        expect(idempotencyService.findByKey).not.toHaveBeenCalled();
        expect(result).toEqual({ data: 'ok' });
        done();
      });
    });
  });

  describe('when endpoint is idempotent', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should process normally when no existing record', (done) => {
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({ acquired: true });

      const context = mockExecutionContext(mockRequest());
      const next = mockCallHandler({ id: 'payout-1', status: 'processing' });

      interceptor.intercept(context, next).subscribe((result) => {
        expect(idempotencyService.tryAcquire).toHaveBeenCalled();
        expect(result).toEqual({ id: 'payout-1', status: 'processing' });
        done();
      });
    });

    it('should return cached response on duplicate idempotency key', (done) => {
      const existingRecord = {
        key: 'dup-key',
        fingerprint: 'mock-fingerprint',
        requestBodyHash: 'mock-body-hash',
        locked: false,
        completedAt: new Date(),
        responseStatusCode: 200,
        responseBody: { id: 'payout-1', status: 'processing' },
      };

      idempotencyService.findByKey.mockResolvedValue(existingRecord);

      const context = mockExecutionContext(
        mockRequest({ idempotencyKey: 'dup-key' }),
      );
      const next = mockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(next.handle).not.toHaveBeenCalled();
        expect(result).toEqual({ id: 'payout-1', status: 'processing' });
        done();
      });
    });

    it('should throw ConflictException when request is still processing', (done) => {
      const existingRecord = {
        key: 'processing-key',
        fingerprint: 'mock-fingerprint',
        requestBodyHash: 'mock-body-hash',
        locked: true,
        completedAt: null,
        responseStatusCode: null,
        responseBody: null,
      };

      idempotencyService.findByKey.mockResolvedValue(existingRecord);

      const context = mockExecutionContext(
        mockRequest({ idempotencyKey: 'processing-key' }),
      );
      const next = mockCallHandler();

      interceptor.intercept(context, next).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(ConflictException);
          expect(error.message).toContain('already being processed');
          done();
        },
      });
    });

    it('should throw ConflictException on body hash mismatch', (done) => {
      const existingRecord = {
        key: 'body-mismatch-key',
        fingerprint: 'mock-fingerprint',
        requestBodyHash: 'different-body-hash',
        locked: false,
        completedAt: new Date(),
        responseStatusCode: null,
        responseBody: null,
      };

      idempotencyService.findByKey.mockResolvedValue(existingRecord);

      const context = mockExecutionContext(
        mockRequest({ idempotencyKey: 'body-mismatch-key' }),
      );
      const next = mockCallHandler();

      interceptor.intercept(context, next).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(ConflictException);
          expect(error.message).toContain('different request body');
          done();
        },
      });
    });

    it('should complete idempotency record after successful processing', (done) => {
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({ acquired: true });

      const res = mockResponse();
      const context = mockExecutionContext(mockRequest(), res);
      const next = mockCallHandler({ id: 'payout-1', status: 'processing' });

      interceptor.intercept(context, next).subscribe(() => {
        expect(idempotencyService.complete).toHaveBeenCalledWith(
          'mock-fingerprint',
          200,
          { id: 'payout-1', status: 'processing' },
        );
        done();
      });
    });

    it('should store error response on failure', (done) => {
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({ acquired: true });

      const res = mockResponse();
      const context = mockExecutionContext(mockRequest(), res);
      const next = {
        handle: jest.fn(() =>
          throwError(() => new ConflictException('Submission already claimed')),
        ),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(idempotencyService.complete).toHaveBeenCalledWith(
            'mock-fingerprint',
            409,
            { error: 'Submission already claimed' },
          );
          done();
        },
      });
    });
  });

  describe('when GET request', () => {
    it('should pass through without processing', (done) => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = mockExecutionContext(mockRequest({ method: 'GET' }));
      const next = mockCallHandler({ data: 'ok' });

      interceptor.intercept(context, next).subscribe((result) => {
        expect(next.handle).toHaveBeenCalled();
        expect(idempotencyService.findByKey).not.toHaveBeenCalled();
        expect(result).toEqual({ data: 'ok' });
        done();
      });
    });
  });
});
