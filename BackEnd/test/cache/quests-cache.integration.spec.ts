import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestsService } from '#src/modules/quests/quests.service';
import { CacheService } from '#src/modules/cache/cache.service';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CACHE_KEYS, CACHE_TTL } from '#src/config/cache.config';
import { QuestStatus } from '#src/modules/quests/enums/quest-status.enum';

describe('QuestsService with Caching', () => {
  let service: QuestsService;
  let questRepository: Repository<Quest>;
  let _cacheService: CacheService;
  let cacheManager: any;

  const mockQuest = {
    id: '1',
    title: 'Test Quest',
    description: 'A test quest',
    createdBy: 'user123',
    status: 'ACTIVE',
    rewardAmount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        getKeys: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        CacheService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<QuestsService>(QuestsService);
    questRepository = module.get<Repository<Quest>>(getRepositoryToken(Quest));
    _cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne with caching', () => {
    it('should cache quest data on first call', async () => {
      cacheManager.get.mockResolvedValueOnce(undefined);
      (questRepository.findOne as jest.Mock).mockResolvedValue(mockQuest);

      await service.findOne('1');

      expect(cacheManager.get).toHaveBeenCalledWith(
        `${CACHE_KEYS.QUEST_DETAIL}:1`,
      );
      expect(cacheManager.set).toHaveBeenCalled();
      expect(questRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return cached quest on second call', async () => {
      const cachedResponse = { id: '1', title: 'Cached Quest' };
      cacheManager.get.mockResolvedValueOnce(cachedResponse);

      const result = await service.findOne('1');

      expect(result).toEqual(cachedResponse);
      expect(questRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if quest not found', async () => {
      cacheManager.get.mockResolvedValueOnce(undefined);
      (questRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Quest with ID nonexistent not found',
      );
    });
  });

  describe('findAll with caching', () => {
    it('should cache paginated results', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ ...mockQuest }], 1]),
      };

      (questRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      cacheManager.get.mockResolvedValueOnce(undefined);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: QuestStatus.ACTIVE,
      });

      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('create with cache invalidation', () => {
    it('should invalidate quest list cache after creating', async () => {
      (questRepository.create as jest.Mock).mockReturnValue(mockQuest);
      (questRepository.save as jest.Mock).mockResolvedValue(mockQuest);
      cacheManager.store.getKeys.mockResolvedValue([
        `${CACHE_KEYS.QUESTS}:page_1`,
        `${CACHE_KEYS.QUESTS}:page_2`,
      ]);

      await service.create(
        { title: 'New Quest', description: 'Test', rewardAmount: 10 },
        'user123',
      );

      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('update with cache invalidation', () => {
    it('should invalidate relevant caches after update', async () => {
      (questRepository.findOne as jest.Mock).mockResolvedValue(mockQuest);
      (questRepository.save as jest.Mock).mockResolvedValue({
        ...mockQuest,
        title: 'Updated Quest',
      });
      cacheManager.store.getKeys.mockResolvedValue([
        `${CACHE_KEYS.QUESTS}:filter_1`,
      ]);

      await service.update('1', { title: 'Updated Quest' }, 'user123');

      expect(cacheManager.del).toHaveBeenCalledWith(
        `${CACHE_KEYS.QUEST_DETAIL}:1`,
      );
    });
  });

  describe('remove with cache invalidation', () => {
    it('should invalidate caches after deletion', async () => {
      (questRepository.findOne as jest.Mock).mockResolvedValue(mockQuest);
      cacheManager.store.getKeys.mockResolvedValue([
        `${CACHE_KEYS.QUESTS}:filter_1`,
      ]);

      await service.remove('1', 'user123');

      expect(cacheManager.del).toHaveBeenCalledWith(
        `${CACHE_KEYS.QUEST_DETAIL}:1`,
      );
      expect(questRepository.remove).toHaveBeenCalled();
    });
  });

  describe('cache TTL', () => {
    it('should use correct TTL for quest detail cache', async () => {
      cacheManager.get.mockResolvedValueOnce(undefined);
      (questRepository.findOne as jest.Mock).mockResolvedValue(mockQuest);

      await service.findOne('1');

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        CACHE_TTL.LONG * 1000,
      );
    });

    it('should use correct TTL for quest list cache', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockQuest], 1]),
      };

      (questRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      cacheManager.get.mockResolvedValueOnce(undefined);

      await service.findAll({});

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        CACHE_TTL.MEDIUM * 1000,
      );
    });
  });
});
