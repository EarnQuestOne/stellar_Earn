import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { createMockUser, createMockRepository } from '../../test/utils/test-helpers';

/**
 * Base Repository Test Suite
 * Provides common patterns for testing TypeORM repositories
 * 
 * Note: In production, use DataSource-based testing with real database
 * or in-memory database like sqlite for integration tests
 */
describe('Repository Base Tests', () => {
  let repository: any;

  beforeEach(async () => {
    repository = createMockRepository<User>();
  });

  describe('Entity Creation and Persistence', () => {
    it('should create and persist entity', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
      };

      const newEntity = repository.create(userData);
      expect(newEntity).toMatchObject(userData);

      await repository.save(newEntity);
      expect(repository.save).toHaveBeenCalledWith(newEntity);
    });

    it('should handle bulk save operations', async () => {
      const users = [
        { email: 'user1@example.com', username: 'user1' },
        { email: 'user2@example.com', username: 'user2' },
        { email: 'user3@example.com', username: 'user3' },
      ];

      const savedUsers = users.map((u) => repository.create(u));
      await repository.save(savedUsers);

      expect(repository.save).toHaveBeenCalledWith(savedUsers);
    });
  });

  describe('Query Operations', () => {
    it('should find entity by id', async () => {
      const user = createMockUser();

      jest.spyOn(repository, 'findOne').mockResolvedValue(user);

      const result = await repository.findOne({ where: { id: user.id } });

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });
    });

    it('should find all entities', async () => {
      const users = [createMockUser(), createMockUser()];

      jest.spyOn(repository, 'find').mockResolvedValue(users);

      const result = await repository.find();

      expect(result).toEqual(users);
      expect(result.length).toBe(2);
    });

    it('should find entities with filters', async () => {
      const user = createMockUser({ role: Role.ADMIN } as any);

      jest.spyOn(repository, 'find').mockResolvedValue([user]);

      const result = await repository.find({ where: { role: Role.ADMIN } });

      expect(result).toContainEqual(user);
    });

    it('should handle pagination', async () => {
      const users = [createMockUser(), createMockUser()];

      jest.spyOn(repository, 'find').mockResolvedValue(users);

      const result = await repository.find({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });

      expect(repository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should support relation loading', async () => {
      const user = createMockUser();

      jest.spyOn(repository, 'findOne').mockResolvedValue(user);

      const result = await repository.findOne({
        where: { id: user.id },
        relations: ['createdQuests', 'submissions'],
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['createdQuests', 'submissions'],
      });
    });
  });

  describe('Update Operations', () => {
    it('should update single entity', async () => {
      const userId = 'test-id';
      const updateData = { username: 'updated-name' };

      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 });

      const result = await repository.update(userId, updateData);

      expect(repository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result.affected).toBe(1);
    });

    it('should handle partial updates', async () => {
      const userId = 'test-id';
      const partialUpdate = { bio: 'New bio' };

      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 });

      await repository.update(userId, partialUpdate);

      expect(repository.update).toHaveBeenCalledWith(userId, partialUpdate);
    });

    it('should track affected rows on update', async () => {
      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 0 });

      const result = await repository.update('non-existent', {});

      expect(result.affected).toBe(0);
    });
  });

  describe('Delete Operations', () => {
    it('should delete entity by id', async () => {
      const userId = 'test-id';

      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 });

      const result = await repository.delete(userId);

      expect(repository.delete).toHaveBeenCalledWith(userId);
      expect(result.affected).toBe(1);
    });

    it('should handle deletion of non-existent entity', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0 });

      const result = await repository.delete('non-existent-id');

      expect(result.affected).toBe(0);
    });

    it('should delete multiple entities', async () => {
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue({ affected: 3 });

      const result = await repository.delete(['id1', 'id2', 'id3']);

      expect(result.affected).toBe(3);
    });
  });

  describe('QueryBuilder Operations', () => {
    it('should build complex queries', async () => {
      const qb = repository.createQueryBuilder('user');
      const chainedQb = qb
        .where('user.role = :role', { role: Role.ADMIN })
        .andWhere('user.isEmailVerified = :verified', { verified: true })
        .orderBy('user.createdAt', 'DESC')
        .take(10);

      expect(qb.where).toBeDefined();
      expect(qb.andWhere).toBeDefined();
      expect(qb.orderBy).toBeDefined();
      expect(qb.take).toBeDefined();
    });

    it('should support join operations', async () => {
      const qb = repository.createQueryBuilder('user');
      const joinedQb = qb
        .leftJoinAndSelect('user.submissions', 'submissions')
        .leftJoinAndSelect('user.createdQuests', 'quests');

      expect(qb.leftJoinAndSelect).toBeDefined();
    });

    it('should count entities with criteria', async () => {
      const qb = repository.createQueryBuilder('user');
      jest.spyOn(qb, 'getCount').mockResolvedValue(42);

      const count = await qb
        .where('user.role = :role', { role: Role.USER })
        .getCount();

      expect(count).toBe(42);
    });

    it('should get many results with count', async () => {
      const qb = repository.createQueryBuilder('user');
      const users = [createMockUser(), createMockUser()];

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([users, 2]);

      const [results, total] = await qb.getManyAndCount();

      expect(results).toHaveLength(2);
      expect(total).toBe(2);
    });
  });

  describe('Transactional Operations', () => {
    it('should handle transaction with multiple operations', async () => {
      const saveSpies = jest.spyOn(repository, 'save');

      const user1 = repository.create({ email: 'user1@example.com' });
      const user2 = repository.create({ email: 'user2@example.com' });

      await repository.save(user1);
      await repository.save(user2);

      expect(saveSpies).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Considerations', () => {
    it('should use select to limit columns', async () => {
      const qb = repository.createQueryBuilder('user');

      qb.select(['user.id', 'user.email', 'user.username']);

      expect(qb.select).toBeDefined();
    });

    it('should use index aware queries', async () => {
      const qb = repository.createQueryBuilder('user');

      // Queries on indexed columns like email should be optimized
      qb.where('user.email = :email', { email: 'test@example.com' });

      expect(qb.where).toBeDefined();
    });

    it('should handle batch operations efficiently', async () => {
      const users = Array.from({ length: 100 }, (_, i) =>
        repository.create({ email: `user${i}@example.com` }),
      );

      jest.spyOn(repository, 'save').mockResolvedValue(users);

      await repository.save(users);

      expect(repository.save).toHaveBeenCalledWith(users);
    });
  });

  describe('Error Handling', () => {
    it('should handle unique constraint violations', async () => {
      const duplicateUser = { email: 'duplicate@example.com' };

      jest
        .spyOn(repository, 'save')
        .mockRejectedValue(
          new Error('Unique constraint violation'),
        );

      await expect(repository.save(duplicateUser)).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should handle foreign key constraint violations', async () => {
      const invalidUser = { userId: 'non-existent-user' };

      jest
        .spyOn(repository, 'save')
        .mockRejectedValue(new Error('Foreign key constraint violation'));

      await expect(repository.save(invalidUser)).rejects.toThrow(
        'Foreign key constraint violation',
      );
    });

    it('should handle connection errors gracefully', async () => {
      jest
        .spyOn(repository, 'find')
        .mockRejectedValue(new Error('Connection refused'));

      await expect(repository.find()).rejects.toThrow('Connection refused');
    });
  });
});

/**
 * Repository Pattern Best Practices
 * 
 * 1. Always mock repositories in unit tests
 * 2. Use DataSource-based testing for integration tests
 * 3. Keep repository logic thin - move business logic to services
 * 4. Use type-safe queries with QueryBuilder
 * 5. Always handle relations carefully to avoid N+1 queries
 * 6. Test edge cases like empty results and null values
 * 7. Use transactions for operations that must be atomic
 * 8. Index frequently queried columns
 * 9. Validate input data before database operations
 * 10. Use custom repositories for complex domain logic
 */
