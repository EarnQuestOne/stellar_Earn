import { Test, TestingModule } from '@nestjs/testing';
import { IpRateLimitService } from '../ip-rate-limit.service';

describe('IpRateLimitService', () => {
  let service: IpRateLimitService;
  const testIp = '192.168.1.1';
  const testKey = 'GET:/api/test';
  const limit = 5;
  const windowMs = 60000;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpRateLimitService],
    }).compile();

    service = module.get<IpRateLimitService>(IpRateLimitService);
  });

  it('should initialize increment counter', () => {
    const result = service.increment(testIp, testKey, limit, windowMs);
    expect(result.count).toBe(1);
    expect(result.remaining).toBe(limit - 1);
  });

  it('should increment counter on multiple calls', () => {
    service.increment(testIp, testKey, limit, windowMs);
    service.increment(testIp, testKey, limit, windowMs);
    const result = service.increment(testIp, testKey, limit, windowMs);
    expect(result.count).toBe(3);
  });

  it('should detect rate limit exceeded', () => {
    for (let i = 0; i < limit; i++) {
      service.increment(testIp, testKey, limit, windowMs);
    }
    const isLimited = service.isLimited(testIp, testKey, limit, windowMs);
    expect(isLimited).toBe(true);
  });

  it('should track separate IPs independently', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';

    service.increment(ip1, testKey, limit, windowMs);
    service.increment(ip1, testKey, limit, windowMs);
    const result1 = service.increment(ip1, testKey, limit, windowMs);

    const result2 = service.increment(ip2, testKey, limit, windowMs);

    expect(result1.count).toBe(3);
    expect(result2.count).toBe(1);
  });

  it('should reset counter for specific IP and key', () => {
    service.increment(testIp, testKey, limit, windowMs);
    service.increment(testIp, testKey, limit, windowMs);
    service.reset(testIp, testKey);

    const result = service.increment(testIp, testKey, limit, windowMs);
    expect(result.count).toBe(1);
  });

  it('should reset all keys for an IP', () => {
    service.increment(testIp, 'key1', limit, windowMs);
    service.increment(testIp, 'key2', limit, windowMs);
    service.reset(testIp);

    const result1 = service.increment(testIp, 'key1', limit, windowMs);
    const result2 = service.increment(testIp, 'key2', limit, windowMs);

    expect(result1.count).toBe(1);
    expect(result2.count).toBe(1);
  });
});
