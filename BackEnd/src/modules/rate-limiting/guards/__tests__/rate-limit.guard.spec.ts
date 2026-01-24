import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../rate-limit.guard';
import { IpRateLimitService } from '../../services/ip-rate-limit.service';
import { UserRateLimitService } from '../../services/user-rate-limit.service';
import { RATE_LIMIT_KEY } from '../../decorators/rate-limit.decorator';
import { jest } from '@jest/globals'; // Import jest here

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let ipService: IpRateLimitService;
  let userService: UserRateLimitService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitGuard, IpRateLimitService, UserRateLimitService, Reflector],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    ipService = module.get<IpRateLimitService>(IpRateLimitService);
    userService = module.get<UserRateLimitService>(UserRateLimitService);
    reflector = module.get<Reflector>(Reflector);
  });

  const mockExecutionContext = (
    clientIp = '192.168.1.1',
    rateLimitOptions = null,
    user = null,
  ) => {
    const mockRequest = {
      headers: { 'x-forwarded-for': clientIp },
      socket: { remoteAddress: clientIp },
      route: { path: '/api/test' },
      method: 'GET',
      url: '/api/test',
      user,
    };

    const mockResponse = {
      setHeader: jest.fn(),
    };

    const context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;

    if (rateLimitOptions) {
      jest.spyOn(reflector, 'get').mockReturnValue(rateLimitOptions);
    } else {
      jest.spyOn(reflector, 'get').mockReturnValue(null);
    }

    return { context, request: mockRequest, response: mockResponse };
  };

  it('should pass when no rate limit metadata', () => {
    const { context } = mockExecutionContext();
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow requests within IP rate limit', () => {
    const rateLimitOptions = { limit: 5, windowMs: 60000, type: 'ip' as const };
    const { context, response } = mockExecutionContext('192.168.1.1', rateLimitOptions);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
  });

  it('should throw when IP rate limit exceeded', () => {
    const rateLimitOptions = { limit: 2, windowMs: 60000, type: 'ip' as const };
    const { context } = mockExecutionContext('192.168.1.1', rateLimitOptions);

    // Make requests up to limit
    guard.canActivate(context);
    guard.canActivate(context);

    // This should exceed the limit
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('should track different IPs separately', () => {
    const rateLimitOptions = { limit: 2, windowMs: 60000, type: 'ip' as const };

    const { context: context1 } = mockExecutionContext('192.168.1.1', rateLimitOptions);
    const { context: context2 } = mockExecutionContext('192.168.1.2', rateLimitOptions);

    guard.canActivate(context1);
    guard.canActivate(context1);
    // context1 is now at limit

    // context2 should be allowed
    const result = guard.canActivate(context2);
    expect(result).toBe(true);
  });

  it('should allow authenticated users within user rate limit', () => {
    const rateLimitOptions = { limit: 5, windowMs: 60000, type: 'user' as const };
    const user = { id: 1, name: 'Test User' };
    const { context, response } = mockExecutionContext('192.168.1.1', rateLimitOptions, user);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
  });

  it('should add rate limit headers to response', () => {
    const rateLimitOptions = { limit: 5, windowMs: 60000, type: 'ip' as const };
    const { context, response } = mockExecutionContext('192.168.1.1', rateLimitOptions);

    guard.canActivate(context);

    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });
});
