import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User, PrivacyLevel } from './entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTags, CacheTtl } from '../cache/cache-tags';

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
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Anonymize a user's PII in place (right-to-erasure).
   *
   * Email / stellarAddress / profile fields are replaced with per-user
   * tombstone values, but the row itself is retained so aggregate stats and
   * foreign keys (submissions, payouts, …) remain valid. Returns the
   * pre-anonymization identifiers so the caller can re-point retained
   * financial/audit records at the tombstone.
   *
   * Runs on the provided transaction manager when called from the erasure
   * pipeline (so the whole erasure is atomic); otherwise uses its own
   * repository manager.
   */
  async anonymizeForErasure(
    userId: string,
    manager?: EntityManager,
  ): Promise<{ stellarAddress: string | null; email: string | null }> {
    const em = manager ?? this.usersRepository.manager;
    const repo = em.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const tombstone = `erased:${userId}`;
    // The entity types the nullable profile columns as `string` (matching the
    // rest of the codebase), so the null-out payload is cast to satisfy the
    // query types — TypeORM maps `null` to SQL NULL for these columns.
    await repo.update(userId, {
      // Tombstone values must satisfy the unique constraints — the user id
      // suffix keeps them collision-free across erased accounts.
      email: `${tombstone}@erased.invalid`,
      stellarAddress: tombstone,
      username: null,
      googleId: null,
      githubId: null,
      avatarUrl: null,
      bio: null,
      socialLinks: null,
      pushToken: null,
      webhookUrl: null,
      privacyLevel: PrivacyLevel.PRIVATE,
    } as any);

    return { stellarAddress: user.stellarAddress, email: user.email };
  }

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
    // Drop every cached read derived from this user on a write (#2159).
    await this.cacheService.invalidateTag(CacheTags.user(id));
    return user;
  }

  async findById(id: string): Promise<User | null> {
    // Cache-aside read tagged per user so `update()` can invalidate it (#2159).
    return this.cacheService.getOrSet(
      CacheKeys.userById(id),
      CacheTtl.user,
      [CacheTags.user(id)],
      () => this.usersRepository.findOne({ where: { id } }),
    );
  }

  async findByGoogleId(_googleId: string): Promise<User | null> {
    return this.findByAddress('dummy');
  }

  async findByGithubId(_githubId: string): Promise<User | null> {
    return null;
  }

  async findByEmail(_email: string): Promise<User | null> {
    return null;
  }

  async create(dto: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(dto as any);
    return (await this.usersRepository.save(user)) as unknown as User;
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
   * Batch-fetch reputation / stats for multiple users in a single query,
   * eliminating the N+1 pattern on user-list endpoints.
   *
   * Returns a Map keyed by userId for O(1) lookups.
   */
  async getBatchUserStats(userIds: string[]): Promise<Map<string, any>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id AS id',
        'user.xp AS xp',
        'user.level AS level',
        'user.questsCompleted AS "questsCompleted"',
        'user.failedQuests AS "failedQuests"',
        'user.successRate AS "successRate"',
        'user.totalEarned AS "totalEarned"',
        'user.lastActiveAt AS "lastActiveAt"',
      ])
      .where('user.id IN (:...ids)', { ids: userIds })
      .getRawMany();

    const statsMap = new Map<string, any>();
    for (const row of rows) {
      statsMap.set(row.id, {
        id: row.id,
        xp: row.xp,
        level: row.level,
        questsCompleted: row.questsCompleted,
        failedQuests: row.failedQuests,
        successRate: row.successRate,
        totalEarned: row.totalEarned,
        lastActiveAt: row.lastActiveAt,
      });
    }

    return statsMap;
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
