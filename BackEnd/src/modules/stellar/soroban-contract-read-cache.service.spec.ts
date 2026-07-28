import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../../common/services/metrics.service';
import { SorobanContractReadCacheService } from './soroban-contract-read-cache.service';

describe('SorobanContractReadCacheService', () => {
  let service: SorobanContractReadCacheService;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };
  let metrics: { registerCounter: jest.Mock; incrementCounter: jest.Mock };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    metrics = {
      registerCounter: jest.fn(),
      incrementCounter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanContractReadCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'SOROBAN_READ_CACHE_ENABLED') return 'true';
              if (key === 'SOROBAN_READ_CACHE_TTL_SECONDS') return 15;
              return defaultValue;
            }),
          },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get(SorobanContractReadCacheService);
    service.onModuleInit();
  });

  it('builds stable keys from contract id, function, and args', () => {
    const key = service.buildKey('C123', 'get_quest', ['QUEST_1']);
    expect(key).toContain('soroban_read');
    expect(key).toContain('C123');
    expect(key).toContain('get_quest');
  });

  it('stores envelopes with configured TTL', async () => {
    await service.setEnvelope('key-1', {
      kind: 'user_stats',
      data: { xp: '10', level: 1, quests_completed: 0 },
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      'key-1',
      expect.objectContaining({ kind: 'user_stats' }),
      15,
    );
  });

  it('invalidates quest and user stats keys after writes', async () => {
    await service.invalidateAfterWrite('C123', 'QUEST_1', 'GUSER');
    expect(cacheService.delete).toHaveBeenCalledTimes(2);
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'soroban_contract_read_cache_invalidations_total',
      expect.objectContaining({ reason: 'contract_write' }),
    );
  });

  it('invalidates from contract events when topics include quest and user', async () => {
    await service.invalidateFromContractEvent(
      'C123',
      'stellar.contract.event.sub_appr',
      ['sub_appr', 'QUEST_1', 'GUSER1234567890123456789012345678901234567890123456789012345'],
    );
    expect(cacheService.delete).toHaveBeenCalledTimes(2);
  });
});
