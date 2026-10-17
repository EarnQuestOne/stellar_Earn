import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../../common/services/metrics.service';
import {
  DEFAULT_MODERATION_BLOCKED_KEYWORDS,
  ModerationConfigCacheService,
  ModerationConfigSnapshot,
} from './moderation-config-cache.service';

describe('ModerationConfigCacheService', () => {
  let source: Partial<ModerationConfigSnapshot>;
  let configService: jest.Mocked<Pick<ConfigService, 'get' | 'set'>>;
  let metrics: jest.Mocked<
    Pick<
      MetricsService,
      | 'registerCounter'
      | 'registerHistogram'
      | 'incrementCounter'
      | 'observeHistogram'
    >
  >;
  let service: ModerationConfigCacheService;

  beforeEach(() => {
    source = {
      blockOnHighSeverity: true,
      highThreshold: 0.85,
      mediumThreshold: 0.5,
      externalApiUrl: 'https://moderation.example/score',
      externalApiKey: 'secret',
      imageApiUrl: '',
      imageApiKey: '',
      blockedKeywords: ['Custom Term'],
      blockedImageHosts: ['Images.Example'],
    };

    configService = {
      get: jest.fn((key: string) =>
        key === 'moderation' ? source : undefined,
      ),
      set: jest.fn((key: string, value: unknown) => {
        const property = key.replace('moderation.', '');
        source = { ...source, [property]: value };
      }),
    };
    metrics = {
      registerCounter: jest.fn(),
      registerHistogram: jest.fn(),
      incrementCounter: jest.fn(),
      observeHistogram: jest.fn(),
    };

    service = new ModerationConfigCacheService(
      configService as unknown as ConfigService,
      metrics as unknown as MetricsService,
    );
  });

  it('loads the source once and serves subsequent reads from memory', () => {
    const first = service.getConfig();
    const second = service.getConfig();

    expect(first).toBe(second);
    expect(configService.get).toHaveBeenCalledTimes(1);
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'moderation_config_source_loads_total',
    );
  });

  it('normalizes configured lists and keeps the built-in keyword rules', () => {
    const config = service.getConfig();

    expect(config.blockedKeywords).toEqual(
      expect.arrayContaining([
        ...DEFAULT_MODERATION_BLOCKED_KEYWORDS,
        'custom term',
      ]),
    );
    expect(config.blockedImageHosts).toEqual(['images.example']);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.blockedKeywords)).toBe(true);
  });

  it('invalidates and reloads the cache after a config update', () => {
    const before = service.getConfig();
    const after = service.updateConfig({
      highThreshold: 0.92,
      blockedImageHosts: ['cdn.example'],
    });

    expect(before.highThreshold).toBe(0.85);
    expect(after.highThreshold).toBe(0.92);
    expect(after.blockedImageHosts).toEqual(['cdn.example']);
    expect(after).not.toBe(before);
    expect(configService.get).toHaveBeenCalledTimes(2);
    expect(configService.set).toHaveBeenCalledWith(
      'moderation.highThreshold',
      0.92,
    );
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'moderation_config_cache_invalidations_total',
    );
  });

  it('uses safe defaults when threshold values are missing or non-finite', () => {
    source = {
      highThreshold: Number.NaN,
      mediumThreshold: Number.POSITIVE_INFINITY,
    };

    expect(service.getConfig()).toEqual(
      expect.objectContaining({
        blockOnHighSeverity: true,
        highThreshold: 0.85,
        mediumThreshold: 0.5,
      }),
    );
  });
});
