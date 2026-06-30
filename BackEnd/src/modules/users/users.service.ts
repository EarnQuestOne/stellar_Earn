import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface ReputationUpdateResult {
  userId: string;
  oldXp: number;
  newXp: number;
  oldLevel: number;
  newLevel: number;
  deltaXp: number;
}

export interface ReputationAtomicSideEffects {
  /**
   * Runs inside the same DB transaction as the reputation update.
   * Throwing aborts the transaction (no user update, no side effects).
   */
  persist?: (
    manager: EntityManager,
    result: ReputationUpdateResult,
  ) => Promise<void>;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Minimal implementations for server startup
  async findByAddress(stellarAddress: string): Promise<User | null> {
    // Return dummy user for now
    return {
      id: 'dummy-id',
      stellarAddress,
      username: 'dummy-user',
      email: 'dummy@example.com',
      googleId: '',
      githubId: '',
      role: 'USER' as any,
      xp: 0,
      level: 1,
      questsCompleted: 0,
      badges: [],
      avatarUrl: '',
      bio: '',
      socialLinks: {},
      privacyLevel: 'PUBLIC',
      failedQuests: 0,
      successRate: 0,
      totalEarned: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
      lastSyncedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: new Date(),
      lastActiveAt: new Date(),
      pushToken: '',
      webhookUrl: '',
      submissions: [],
      createdQuests: [],
      calculateLevel: () => 1,
      calculateSuccessRate: () => 0,
      updateStatistics: () => {},
    } as User;
  }

  async update(id: string, user: User): Promise<User> {
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(_googleId: string): Promise<User | null> {
    return this.findByAddress('dummy');
  }

  /**
   * Atomically updates user XP/level in one DB transaction.
   * Used by cross-service reputation workflows to guarantee consistency.
   */
  async applyReputationDeltaAtomic(
    userId: string,
    deltaXp: number,
    sideEffects: ReputationAtomicSideEffects = {},
  ): Promise<ReputationUpdateResult> {
    return this.usersRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const user = await repo.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User not found: ${userId}`);
      }

      const oldXp = user.xp || 0;
      const oldLevel = user.level || 1;
      const newXp = oldXp + deltaXp;

      user.xp = newXp;
      user.level = Math.max(1, user.calculateLevel());
      user.lastActiveAt = new Date();

      await repo.save(user);

      const result: ReputationUpdateResult = {
        userId,
        oldXp,
        newXp,
        oldLevel,
        newLevel: user.level,
        deltaXp,
      };

      if (sideEffects.persist) {
        // Ensure cross-service consistency by persisting related effects (e.g. event store)
        // inside the same DB transaction.
        await sideEffects.persist(manager, result);
      }

      return result;
    });
  }

  /**
   * Compensating transaction for workflows that fail after DB update but before
   * all downstream side effects complete.
   */
  async revertReputationAtomic(
    userId: string,
    oldXp: number,
    oldLevel: number,
  ): Promise<void> {
    await this.usersRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const user = await repo.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(
          `User not found during rollback: ${userId}`,
        );
      }

      user.xp = oldXp;
      user.level = oldLevel;
      user.lastActiveAt = new Date();
      await repo.save(user);
    });
  }
}
