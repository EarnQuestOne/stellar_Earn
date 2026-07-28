import { Test, TestingModule } from '@nestjs/testing';
import { PayloadStorageService } from './payload-storage.service';
import { CacheService } from '../../cache/cache.service';

const mockCacheService = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('PayloadStorageService', () => {
  let service: PayloadStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayloadStorageService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<PayloadStorageService>(PayloadStorageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldOffload', () => {
    it('should return false for small payloads', () => {
      expect(service.shouldOffload({ a: 1 })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.shouldOffload(null)).toBe(false);
      expect(service.shouldOffload(undefined)).toBe(false);
    });

    it('should return true for large payloads (over 50 KB)', () => {
      const largeData = { data: 'x'.repeat(60000) };
      expect(service.shouldOffload(largeData)).toBe(true);
    });
  });

  describe('storePayload / retrievePayload', () => {
    it('should store payload with correct key prefix', async () => {
      const payload = { rows: [1, 2, 3] };
      const key = await service.storePayload('job-123', payload);

      expect(key).toBe('job_payload:job-123');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'job_payload:job-123',
        payload,
        86400,
      );
    });

    it('should retrieve payload by job ID', async () => {
      const payload = { rows: [1, 2, 3] };
      mockCacheService.get.mockResolvedValueOnce(payload);

      const result = await service.retrievePayload('job-123');
      expect(result).toEqual(payload);
      expect(mockCacheService.get).toHaveBeenCalledWith('job_payload:job-123');
    });

    it('should return undefined when payload not found', async () => {
      mockCacheService.get.mockResolvedValueOnce(undefined);
      const result = await service.retrievePayload('job-missing');
      expect(result).toBeUndefined();
    });
  });

  describe('evictPayload', () => {
    it('should delete the payload from cache', async () => {
      await service.evictPayload('job-123');
      expect(mockCacheService.del).toHaveBeenCalledWith('job_payload:job-123');
    });
  });

  describe('buildLightweightData', () => {
    it('should preserve __trace and __jobType', () => {
      const data = {
        heavyObject: { rows: Array.from({ length: 1000 }, (_, i) => ({ id: i })) },
        userId: 'u1',
        __trace: { traceId: 'abc', spanId: 'def' },
        __jobType: 'payout:process',
      };

      const result = service.buildLightweightData(data, 'job-1', 'job_payload:job-1');

      expect(result.__trace).toEqual(data.__trace);
      expect(result.__jobType).toBe('payout:process');
      expect(result.__payloadRef).toBe('job_payload:job-1');
      expect(result.userId).toBe('u1');
      // Objects are stripped from inline metadata (they live in cache)
      expect(result.heavyObject).toBeUndefined();
    });

    it('should preserve primitive values from rest', () => {
      const data = {
        name: 'test',
        count: 42,
        nested: { deep: true },
        __jobType: 'email:send',
      };

      const result = service.buildLightweightData(data, 'job-2', 'job_payload:job-2');

      expect(result.name).toBe('test');
      expect(result.count).toBe(42);
      expect(result.nested).toBeUndefined();
      expect(result.__payloadRef).toBe('job_payload:job-2');
    });
  });

  describe('hasPayloadRef / getPayloadRefKey', () => {
    it('should detect payload ref', () => {
      const data = { __payloadRef: 'job_payload:job-1' };
      expect(service.hasPayloadRef(data)).toBe(true);
      expect(service.getPayloadRefKey(data)).toBe('job_payload:job-1');
    });

    it('should return false when no payload ref', () => {
      const data = { name: 'test' };
      expect(service.hasPayloadRef(data)).toBe(false);
      expect(service.getPayloadRefKey(data)).toBeUndefined();
    });
  });
});
