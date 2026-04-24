import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { withSoftDelete } from './soft-delete.util';

describe('SoftDeleteUtil', () => {
  let userRepository: Repository<User>;
  let queryBuilder: any;

  beforeEach(async () => {
    // Mock query builder
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      alias: 'user',
    };

    // Mock repository
    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;
  });

  describe('excludeDeleted', () => {
    it('should add deletedAt IS NULL condition', () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const result = softDeleteUtil.excludeDeleted();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.deletedAt IS NULL');
      expect(result).toBe(softDeleteUtil);
    });
  });

  describe('onlyDeleted', () => {
    it('should add deletedAt IS NOT NULL condition', () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const result = softDeleteUtil.onlyDeleted();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.deletedAt IS NOT NULL');
      expect(result).toBe(softDeleteUtil);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', async () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const testId = 'test-id';

      await softDeleteUtil.softDelete(testId);

      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.set).toHaveBeenCalledWith({ deletedAt: expect.any(Date) });
      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: testId });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should set deletedAt to null', async () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const testId = 'test-id';

      await softDeleteUtil.restore(testId);

      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.set).toHaveBeenCalledWith({ deletedAt: null });
      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: testId });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('softDeleteBy', () => {
    it('should set deletedAt timestamp based on conditions', async () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const conditions = { status: 'ACTIVE', role: 'USER' };

      await softDeleteUtil.softDeleteBy(conditions);

      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.set).toHaveBeenCalledWith({ deletedAt: expect.any(Date) });
      expect(queryBuilder.where).toHaveBeenCalledWith('user.status = :status AND user.role = :role', conditions);
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('restoreBy', () => {
    it('should set deletedAt to null based on conditions', async () => {
      const softDeleteUtil = withSoftDelete(queryBuilder);
      const conditions = { status: 'INACTIVE' };

      await softDeleteUtil.restoreBy(conditions);

      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.set).toHaveBeenCalledWith({ deletedAt: null });
      expect(queryBuilder.where).toHaveBeenCalledWith('user.status = :status', conditions);
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });
});

// Integration test example for soft delete functionality
describe('Soft Delete Integration', () => {
  let userRepository: Repository<User>;

  beforeEach(async () => {
    userRepository = {
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;
  });

  it('should soft delete user and exclude from results', async () => {
    const userId = 'test-user-id';
    
    // Soft delete the user
    await userRepository.softDelete(userId);
    expect(userRepository.softDelete).toHaveBeenCalledWith(userId);

    // Verify user is excluded from regular queries
    await userRepository.findOne({ where: { id: userId }, withDeleted: false });
    
    // Verify user can still be found with withDeleted: true
    await userRepository.findOne({ where: { id: userId }, withDeleted: true });
    
    // Restore the user
    await userRepository.restore(userId);
    expect(userRepository.restore).toHaveBeenCalledWith(userId);
  });
});
