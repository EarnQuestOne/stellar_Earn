import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestsService } from './quests.service';
import { Quest } from './entities/quest.entity';
import { CacheService } from '../cache/cache.service';
import { ModerationService } from '../moderation/moderation.service';
import { QuotaService } from '../quota/quota.service';

// Closes #1964: regression coverage for the GET /quests Redis caching layer.
describe('QuestsService list caching', () => {
  let service: QuestsService;
  let cache: any;
  let repo: any;

  beforeEach(async () => {
    cache = { get: jest.fn(), set: jest.fn(), deletePattern: jest.fn() };
    repo = { createQueryBuilder: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: getRepositoryToken(Quest), useValue: repo },
        { provide: CacheService, useValue: cache },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ModerationService, useValue: {} },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();
    service = module.get(QuestsService);
  });

  it('returns the cached response without querying the DB on a cache hit', async () => {
    const cached = { data: [], limit: 10 };
    cache.get.mockResolvedValue(cached);
    const result = await service.findAll({ limit: 10 } as any);
    expect(result).toBe(cached);
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('queries the DB and populates the cache on a miss', async () => {
    cache.get.mockResolvedValue(null);
    const qb = { andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    repo.createQueryBuilder.mockReturnValue(qb);
    await service.findAll({ limit: 10 } as any);
    expect(cache.set).toHaveBeenCalled();
  });
});
