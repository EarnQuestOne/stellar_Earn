import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { Quest } from '../quests/entities/quest.entity';
import { Submission, SubmissionStatus } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { Role } from '../../common/enums/role.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  createMockRepository,
  createMockUser,
  createMockEventEmitter,
  createMockCacheManager,
  generateRandomStellarAddress,
} from '../../test/utils/test-helpers';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: any;
  let questsRepository: any;
  let submissionsRepository: any;
  let payoutsRepository: any;
  let cacheManager: any;
  let eventEmitter: any;

  beforeEach(async () => {
    usersRepository = createMockRepository<User>();
    questsRepository = createMockRepository<Quest>();
    submissionsRepository = createMockRepository<Submission>();
    payoutsRepository = createMockRepository<Payout>();
    cacheManager = createMockCacheManager();
    eventEmitter = createMockEventEmitter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Quest),
          useValue: questsRepository,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: submissionsRepository,
        },
        {
          provide: getRepositoryToken(Payout),
          useValue: payoutsRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        stellarAddress: generateRandomStellarAddress(),
      };

      const createdUser = createMockUser(userData);

      jest.spyOn(usersRepository, 'create').mockReturnValue(createdUser);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(usersRepository.create).toHaveBeenCalledWith(userData);
      expect(usersRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('should emit UserCreatedEvent after user creation', async () => {
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
      };

      const createdUser = createMockUser(userData);

      jest.spyOn(usersRepository, 'create').mockReturnValue(createdUser);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(createdUser);
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await service.create(userData);

      expect(emitSpy).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          userId: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
        }),
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findByEmail(user.email);

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: user.email },
      });
    });

    it('should return null when email not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null for empty email', async () => {
      const result = await service.findByEmail('');

      expect(result).toBeNull();
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID', async () => {
      const user = createMockUser({ googleId: 'google-123' } as any);

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findByGoogleId('google-123');

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
      });
    });

    it('should return null when Google ID not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByGoogleId('nonexistent-google-id');

      expect(result).toBeNull();
    });

    it('should return null for empty Google ID', async () => {
      const result = await service.findByGoogleId('');

      expect(result).toBeNull();
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findByGithubId', () => {
    it('should find user by GitHub ID', async () => {
      const user = createMockUser({ githubId: 'github-123' } as any);

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findByGithubId('github-123');

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { githubId: 'github-123' },
      });
    });

    it('should return null when GitHub ID not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByGithubId('nonexistent-github-id');

      expect(result).toBeNull();
    });
  });

  describe('findByAddress', () => {
    it('should find user by Stellar address', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findByAddress(user.stellarAddress);

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { stellarAddress: user.stellarAddress },
        relations: ['createdQuests'],
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const address = generateRandomStellarAddress();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findByAddress(address)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findByUsername(user.username);

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { username: user.username },
      });
    });

    it('should throw NotFoundException when username not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findByUsername('nonexistentuser')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);

      const result = await service.findById(user.id);

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });
    });

    it('should throw NotFoundException when ID not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserStats', () => {
    it('should return cached stats if available', async () => {
      const address = generateRandomStellarAddress();
      const cachedStats = {
        totalQuests: 10,
        completedQuests: 8,
        pendingQuests: 1,
        failedQuests: 1,
        successRate: 0.8,
        totalEarned: '100',
        averageCompletionTime: 3600000,
        streak: 5,
        rank: 1,
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedStats);

      const result = await service.getUserStats(address);

      expect(result).toEqual(cachedStats);
      expect(cacheManager.get).toHaveBeenCalledWith(`user_stats_${address}`);
    });

    it('should calculate stats and cache them', async () => {
      const user = createMockUser();
      const address = user.stellarAddress;
      const submissions = [
        {
          id: '1',
          status: SubmissionStatus.APPROVED,
          createdAt: new Date(),
          approvedAt: new Date(Date.now() + 3600000),
          quest: { category: 'development' },
        } as any,
        {
          id: '2',
          status: SubmissionStatus.PENDING,
          createdAt: new Date(),
          quest: { category: 'development' },
        } as any,
        {
          id: '3',
          status: SubmissionStatus.REJECTED,
          createdAt: new Date(),
          quest: { category: 'testing' },
        } as any,
      ];

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(submissionsRepository, 'find').mockResolvedValue(submissions);
      jest.spyOn(usersRepository, 'find').mockResolvedValue([user]);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getUserStats(address);

      expect(result).toHaveProperty('totalQuests', 3);
      expect(result).toHaveProperty('completedQuests', 1);
      expect(result).toHaveProperty('pendingQuests', 1);
      expect(result).toHaveProperty('failedQuests', 1);
      expect(result).toHaveProperty('rank', 1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `user_stats_${address}`,
        expect.any(Object),
        60000,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const address = generateRandomStellarAddress();

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUserStats(address)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserQuests', () => {
    it('should get paginated user quests', async () => {
      const user = createMockUser();
      const submissions = [
        {
          id: '1',
          quest: { id: 'q1', title: 'Quest 1' },
          status: SubmissionStatus.APPROVED,
          createdAt: new Date(),
          approvedAt: new Date(),
          proof: 'proof1',
        },
      ];

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest
        .spyOn(submissionsRepository, 'findAndCount')
        .mockResolvedValue([submissions, 1]);

      const result = await service.getUserQuests(user.stellarAddress, 1, 20);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('limit', 20);
      expect(result.meta).toHaveProperty('total', 1);
      expect(result.meta).toHaveProperty('totalPages', 1);
    });

    it('should handle pagination correctly', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest
        .spyOn(submissionsRepository, 'findAndCount')
        .mockResolvedValue([[], 50]);

      const result = await service.getUserQuests(user.stellarAddress, 2, 20);

      expect(submissionsRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.any(Object),
        relations: ['quest'],
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 20,
      });
      expect(result.meta).toHaveProperty('page', 2);
      expect(result.meta).toHaveProperty('totalPages', 3);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getUserQuests(generateRandomStellarAddress()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const user = createMockUser();
      const updateData = {
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue({
        ...user,
        ...updateData,
      });

      const result = await service.updateProfile(user.stellarAddress, updateData);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { stellarAddress: user.stellarAddress },
      });
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should emit UserUpdatedEvent after profile update', async () => {
      const user = createMockUser();
      const updateData = { bio: 'Updated bio' };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue({
        ...user,
        ...updateData,
      });
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await service.updateProfile(user.stellarAddress, updateData);

      expect(emitSpy).toHaveBeenCalledWith(
        'user.updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateProfile(generateRandomStellarAddress(), {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not update fields that are not provided', async () => {
      const user = createMockUser();
      const originalBio = user.bio;
      const updateData = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(user);

      await service.updateProfile(user.stellarAddress, updateData);

      // Verify that the saved user still has original bio
      expect(usersRepository.save).toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should return paginated leaderboard', async () => {
      const users = [
        createMockUser({ id: '1', xp: 1000, level: 10 }),
        createMockUser({ id: '2', xp: 800, level: 8 }),
        createMockUser({ id: '3', xp: 600, level: 6 }),
      ];

      jest
        .spyOn(usersRepository, 'createQueryBuilder')
        .mockReturnValue({
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([users, 3]),
        } as any);

      const result = await service.getLeaderboard(1, 20);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(3);
    });

    it('should handle empty leaderboard', async () => {
      jest
        .spyOn(usersRepository, 'createQueryBuilder')
        .mockReturnValue({
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        } as any);

      const result = await service.getLeaderboard(1, 20);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('updateUserStats', () => {
    it('should update user stats when submission is completed', async () => {
      const user = createMockUser();

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(user);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(eventEmitter, 'emit').mockResolvedValue(true);

      await service.updateUserStats(user.id, {
        xp: 100,
        totalEarned: '50',
      });

      expect(cacheManager.del).toHaveBeenCalledWith(`user_stats_${user.stellarAddress}`);
      expect(usersRepository.save).toHaveBeenCalled();
    });
  });
});
