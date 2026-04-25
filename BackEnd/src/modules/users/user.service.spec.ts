import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { Quest } from '../quests/entities/quest.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: any;
  let submissionsRepo: any;
  let cache: any;
  let countCalls: number;
  let countCalledWith: Array<{ sql: string; params: any }>;

  beforeEach(async () => {
    countCalls = 0;
    countCalledWith = [];

    usersRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        stellarAddress: 'GABC',
        xp: 1500,
        successRate: 80,
        totalEarned: '0',
        createdQuests: [],
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => {
        const builder: any = {
          where: jest.fn((sql: string, params: any) => {
            countCalledWith.push({ sql, params });
            return builder;
          }),
          getCount: jest.fn().mockImplementation(() => {
            countCalls += 1;
            return Promise.resolve(7);
          }),
        };
        return builder;
      }),
    };

    submissionsRepo = {
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Quest), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Submission), useValue: submissionsRepo },
        { provide: getRepositoryToken(Payout), useValue: { find: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getUserStats (rank N+1 prevention)', () => {
    it('computes rank with a single COUNT query, not by loading every user', async () => {
      const stats = await service.getUserStats('GABC');

      // Loading every user just to find one user's rank used to scale O(n)
      // with the user table size; that path must no longer be taken.
      expect(usersRepo.find).not.toHaveBeenCalled();

      expect(usersRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(countCalls).toBe(1);
      expect(countCalledWith[0]).toEqual({
        sql: 'user.xp > :xp',
        params: { xp: 1500 },
      });

      // 7 users have higher XP, so the requested user is ranked 8th.
      expect(stats.rank).toBe(8);
    });
  });
});
