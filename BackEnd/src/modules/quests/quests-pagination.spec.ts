import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestsService } from './quests.service';
import { Quest } from './entities/quest.entity';
import { CacheService } from '../cache/cache.service';
import { ModerationService } from '../moderation/moderation.service';
import { QuotaService } from '../quota/quota.service';

// Closes #1965: regression coverage for keyset (cursor) pagination.
const q = (id: string, d: Date) => ({ id, title: id, description: 'd', rewardAmount: 1, status: 'ACTIVE', createdBy: 'u', createdAt: d, updatedAt: d });

describe('QuestsService cursor pagination', () => {
  let service: QuestsService;
  let qb: any;

  beforeEach(async () => {
    qb = { andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: getRepositoryToken(Quest), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
        { provide: CacheService, useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), deletePattern: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ModerationService, useValue: {} },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();
    service = module.get(QuestsService);
  });

  it('sets nextCursor when more rows exist than the limit', async () => {
    qb.getMany.mockResolvedValue([q('1', new Date('2026-01-03')), q('2', new Date('2026-01-02')), q('3', new Date('2026-01-01'))]);
    const result = await service.findAll({ limit: 2 } as any);
    expect(result.data).toHaveLength(2);
    expect(result.nextCursor).toBe(new Date('2026-01-02').toISOString());
  });

  it('omits nextCursor on the last page', async () => {
    qb.getMany.mockResolvedValue([q('1', new Date('2026-01-01'))]);
    expect((await service.findAll({ limit: 5 } as any)).nextCursor).toBeUndefined();
  });

  it('applies the cursor as a createdAt filter, not an offset', async () => {
    qb.getMany.mockResolvedValue([]);
    await service.findAll({ cursor: '2026-01-01T00:00:00.000Z', limit: 10 } as any);
    expect(qb.andWhere).toHaveBeenCalledWith('quest.createdAt < :cursor', { cursor: '2026-01-01T00:00:00.000Z' });
  });
});
