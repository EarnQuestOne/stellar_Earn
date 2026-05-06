import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { Quest } from './entities/quest.entity';
import { CacheService } from '../cache/cache.service';
import { ModerationService } from '../moderation/moderation.service';

const mockScan = { shouldBlock: false, keywordHits: [] };

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockCache = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  deletePattern: jest.fn().mockResolvedValue(undefined),
});

const mockModeration = () => ({
  scanText: jest.fn().mockResolvedValue(mockScan),
  saveQuestModerationItem: jest.fn().mockResolvedValue(undefined),
});

describe('QuestsService', () => {
  let service: QuestsService;
  let repo: ReturnType<typeof mockRepo>;
  let cache: ReturnType<typeof mockCache>;
  let moderation: ReturnType<typeof mockModeration>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    repo = mockRepo();
    cache = mockCache();
    moderation = mockModeration();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: getRepositoryToken(Quest), useValue: repo },
        { provide: CacheService, useValue: cache },
        { provide: EventEmitter2, useValue: emitter },
        { provide: ModerationService, useValue: moderation },
      ],
    }).compile();

    service = module.get<QuestsService>(QuestsService);
  });

  afterEach(() => jest.clearAllMocks());

  // â”€â”€â”€ create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('create', () => {
    const dto = { title: 'Test Quest', description: 'desc', rewardAmount: 10 };
    const creator = 'GABC123';

    it('saves and returns a quest', async () => {
      const entity = { id: 'q1', ...dto, createdBy: creator, rewardAmount: 10 };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      jest.spyOn(require('./dto'), 'QuestResponseDto' as any, 'get').mockReturnValue({ fromEntity: (e: any) => e }).mockRestore?.();

      // patch static method via prototype
      const { QuestResponseDto } = require('./dto');
      const spy = jest.spyOn(QuestResponseDto, 'fromEntity').mockReturnValue(entity as any);

      const result = await service.create(dto as any, creator);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(emitter.emit).toHaveBeenCalledWith('quest.created', expect.anything());
      expect(cache.deletePattern).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('throws BadRequestException when end date is before start date', async () => {
      const bad = {
        ...dto,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-05-01'),
      };
      await expect(service.create(bad as any, creator)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when moderation blocks content', async () => {
      moderation.scanText.mockResolvedValue({ shouldBlock: true, keywordHits: ['spam'] });
      repo.create.mockReturnValue({ id: 'q1', ...dto, createdBy: creator });
      repo.save.mockResolvedValue({ id: 'q1', ...dto, createdBy: creator });
      await expect(service.create(dto as any, creator)).rejects.toThrow(BadRequestException);
    });
  });

  // â”€â”€â”€ findOne â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('findOne', () => {
    it('returns cached value when available', async () => {
      const cached = { id: 'q1', title: 'cached' };
      cache.get.mockResolvedValue(cached);
      const result = await service.findOne('q1');
      expect(result).toEqual(cached);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when quest does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // â”€â”€â”€ update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('update', () => {
    const existing = {
      id: 'q1',
      title: 'Old',
      description: 'old desc',
      createdBy: 'GABC',
      status: 'DRAFT',
      rewardAmount: 5,
    };

    it('throws NotFoundException when quest does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('q1', {}, 'GABC')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the creator', async () => {
      repo.findOne.mockResolvedValue(existing);
      await expect(service.update('q1', {}, 'OTHER')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException on invalid status transition', async () => {
      repo.findOne.mockResolvedValue({ ...existing, status: 'COMPLETED' });
      await expect(
        service.update('q1', { status: 'DRAFT' } as any, 'GABC'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // â”€â”€â”€ remove â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('remove', () => {
    it('throws NotFoundException when quest does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('q1', 'GABC')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the creator', async () => {
      repo.findOne.mockResolvedValue({ id: 'q1', createdBy: 'GABC' });
      await expect(service.remove('q1', 'OTHER')).rejects.toThrow(ForbiddenException);
    });

    it('soft-deletes and emits event', async () => {
      const entity = { id: 'q1', createdBy: 'GABC' };
      repo.findOne.mockResolvedValue(entity);
      repo.softDelete.mockResolvedValue(undefined);
      await service.remove('q1', 'GABC');
      expect(repo.softDelete).toHaveBeenCalledWith('q1');
      expect(emitter.emit).toHaveBeenCalledWith('quest.deleted', expect.anything());
    });
  });

  // â”€â”€â”€ validateStatusTransition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('validateStatusTransition', () => {
    it.each([
      ['DRAFT', 'ACTIVE'],
      ['DRAFT', 'ARCHIVED'],
      ['ACTIVE', 'COMPLETED'],
      ['ACTIVE', 'ARCHIVED'],
      ['COMPLETED', 'ARCHIVED'],
    ])('allows %s -> %s', (from, to) => {
      expect(() => service.validateStatusTransition(from, to)).not.toThrow();
    });

    it.each([
      ['ARCHIVED', 'ACTIVE'],
      ['COMPLETED', 'DRAFT'],
      ['ACTIVE', 'DRAFT'],
    ])('rejects %s -> %s', (from, to) => {
      expect(() => service.validateStatusTransition(from, to)).toThrow(BadRequestException);
    });
  });
});