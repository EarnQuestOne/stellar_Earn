import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ProfilingService } from './profiling.service';

const mockConfigGet = jest.fn((key: string, defaultVal?: unknown) => {
  const map: Record<string, unknown> = {
    PROFILING_ENABLED: 'false',
    PROFILING_DIR: '/tmp/test-profiles',
    PROFILING_MAX_DURATION_MS: 30_000,
  };
  return key in map ? map[key] : defaultVal;
});

describe('ProfilingService', () => {
  let service: ProfilingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilingService,
        { provide: ConfigService, useValue: { get: mockConfigGet } },
      ],
    }).compile();

    service = module.get<ProfilingService>(ProfilingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isEnabled returns false when PROFILING_ENABLED=false', () => {
    expect(service.isEnabled()).toBe(false);
  });

  it('takeHeapSnapshot throws when profiling is disabled', () => {
    expect(() => service.takeHeapSnapshot()).toThrow(BadRequestException);
  });

  it('getHeapStatistics returns a valid heap info object', () => {
    const stats = service.getHeapStatistics();
    expect(stats).toHaveProperty('total_heap_size');
    expect(stats).toHaveProperty('used_heap_size');
    expect(stats).toHaveProperty('heap_size_limit');
  });

  it('getHeapSpaceStatistics returns an array of spaces', () => {
    const spaces = service.getHeapSpaceStatistics();
    expect(Array.isArray(spaces)).toBe(true);
    expect(spaces.length).toBeGreaterThan(0);
    expect(spaces[0]).toHaveProperty('space_name');
    expect(spaces[0]).toHaveProperty('space_used_size');
  });

  it('listSessions returns empty array initially', () => {
    expect(service.listSessions()).toEqual([]);
  });
});
