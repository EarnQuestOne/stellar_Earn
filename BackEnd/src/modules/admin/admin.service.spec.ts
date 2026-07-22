import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.module';
import { User } from '../users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

describe('AdminService', () => {
  let service: AdminService;

  const mockUserRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const page = 1;
      const limit = 10;
      const users = [{ id: '1', username: 'test' }] as User[];
      const total = 1;

      mockUserRepo.findAndCount.mockResolvedValue([users, total]);

      const result = await service.getUsers(page, limit);

      expect(result).toEqual({ users, total, page, limit });
      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const userId = '1';
      const user = { id: userId, username: 'test' } as User;

      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.getUserById(userId);

      expect(result).toEqual(user);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw ForbiddenException if user not found', async () => {
      const userId = '1';
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserById(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform stats', async () => {
      const totalUsers = 10;
      const adminCount = 2;

      mockUserRepo.count.mockImplementation((options) => {
        if (
          options &&
          'where' in options &&
          options.where &&
          'role' in options.where &&
          options.where.role === Role.ADMIN
        ) {
          return Promise.resolve(adminCount);
        }
        return Promise.resolve(totalUsers);
      });

      const result = await service.getPlatformStats();

      expect(result).toEqual({ totalUsers, adminCount });
    });
  });
});
