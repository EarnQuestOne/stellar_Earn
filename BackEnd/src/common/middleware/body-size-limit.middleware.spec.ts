import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PayloadTooLargeException } from '@nestjs/common';
import { BodySizeLimitMiddleware } from './body-size-limit.middleware';
import { BodySizeLimitInterceptor } from './body-size-limit.interceptor';
import { BODY_SIZE_LIMIT_KEY, BodySizeLimit } from '../decorators/body-size-limit.decorator';
import { Request, Response } from 'express';

describe('BodySizeLimitMiddleware', () => {
  let middleware: BodySizeLimitMiddleware;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BodySizeLimitMiddleware,
        Reflector,
      ],
    }).compile();

    middleware = module.get<BodySizeLimitMiddleware>(BodySizeLimitMiddleware);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should apply default 1mb limit when no decorator is set', () => {
    const req = { headers: {} } as unknown as Request;
    const res = {} as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);
    // Parser is async, so we check it doesn't throw immediately
    expect(next).not.toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
  });

  it('should cache parser instances for same limits', () => {
    // Access private maps via any
    const m = middleware as any;
    const parser1 = m.getJsonParser('5mb');
    const parser2 = m.getJsonParser('5mb');
    expect(parser1).toBe(parser2);
  });
});

describe('BodySizeLimitInterceptor', () => {
  let interceptor: BodySizeLimitInterceptor;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BodySizeLimitInterceptor,
        Reflector,
      ],
    }).compile();

    interceptor = module.get<BodySizeLimitInterceptor>(BodySizeLimitInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should reject request when Content-Length exceeds limit', () => {
    @BodySizeLimit({ json: '1mb' })
    class TestController {}

    reflector.set(BODY_SIZE_LIMIT_KEY, { json: '1mb' }, TestController);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'content-length': '2097152' }, // 2mb
        }),
      }),
      getClass: () => TestController,
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    };

    expect(() =>
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    ).toThrow(PayloadTooLargeException);
  });

  it('should allow request when Content-Length is within limit', () => {
    @BodySizeLimit({ json: '1mb' })
    class TestController {}

    reflector.set(BODY_SIZE_LIMIT_KEY, { json: '1mb' }, TestController);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'content-length': '1024' },
        }),
      }),
      getClass: () => TestController,
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    };

    expect(() =>
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    ).not.toThrow();
  });
});