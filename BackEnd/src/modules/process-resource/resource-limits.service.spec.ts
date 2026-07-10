import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResourceLimitsService } from './resource-limits.service';

const mockConfigGet = jest.fn((key: string, defaultVal?: unknown) => {
  const map: Record<string, unknown> = {
    RESOURCE_MAX_HEAP_MB: 512,
    RESOURCE_MAX_RSS_MB: 768,
    RESOURCE_HEAP_WARN_PERCENT: 75,
    RESOURCE_HEAP_CRITICAL_PERCENT: 90,
    RESOURCE_EXIT_ON_HEAP_CRITICAL: 'false',
    RESOURCE_MONITOR_INTERVAL_MS: 60_000,
  };
  return key in map ? map[key] : defaultVal;
});

describe('ResourceLimitsService', () => {
  let service: ResourceLimitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceLimitsService,
        { provide: ConfigService, useValue: { get: mockConfigGet } },
      ],
    }).compile();

    service = module.get<ResourceLimitsService>(ResourceLimitsService);
    // Manually call init so the interval doesn't start in tests
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getMemorySnapshot returns all required fields', () => {
    const snap = service.getMemorySnapshot();
    expect(snap).toHaveProperty('rss');
    expect(snap).toHaveProperty('heapUsed');
    expect(snap).toHaveProperty('heapTotal');
    expect(snap).toHaveProperty('external');
    expect(snap).toHaveProperty('arrayBuffers');
    expect(snap).toHaveProperty('heapUsedPercent');
    expect(snap.heapUsedPercent).toBeGreaterThanOrEqual(0);
  });

  it('getCpuSnapshot returns user and system fields', () => {
    const snap = service.getCpuSnapshot();
    expect(snap).toHaveProperty('user');
    expect(snap).toHaveProperty('system');
  });

  it('getSnapshot returns a complete ResourceSnapshot', () => {
    const snap = service.getSnapshot();
    expect(snap).toHaveProperty('timestamp');
    expect(snap).toHaveProperty('pid');
    expect(snap).toHaveProperty('uptime');
    expect(snap).toHaveProperty('memory');
    expect(snap).toHaveProperty('cpu');
    expect(snap).toHaveProperty('limits');
    expect(snap).toHaveProperty('violations');
    expect(Array.isArray(snap.violations)).toBe(true);
  });

  it('triggerGc returns a result object', () => {
    const result = service.triggerGc();
    expect(result).toHaveProperty('triggered');
    expect(result).toHaveProperty('message');
    expect(typeof result.triggered).toBe('boolean');
  });
});
