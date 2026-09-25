import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User, PrivacyLevel } from './entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { CacheTags } from '../cache/cache-tags';
import { Submission } from '../submissions/entities/submission.entity';
import { Quest } from '../quests/entities/quest.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { UserMapper } from './mappers/user.mapper';

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
    @Optional()
    private readonly cacheService?: CacheService,
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cacheManager?: Cache,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    @InjectRepository(Quest)
    private readonly questsRepository?: Repository<Quest>,
    @Optional()
    @InjectRepository(Submission)
    private readonly submissionsRepository?: Repository<Submission>,
    @Optional()
    @InjectRepository(Payout)
    private readonly payoutsRepository?: Repository<Payout>,
  ) {}

  private async getCache<T>(key: string): Promise<T | undefined> {
    if (this.cacheService) {
      return this.cacheService.get<T>(key);
    }
    return this.cacheManager?.get<T>(key);
  }

  private async setCache<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.set(key, value, ttlSeconds);
      return;
    }
    await this.cacheManager?.set(key, value, (ttlSeconds ?? 0) * 1000);
  }

  private async delCache(key: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.del(key);
      return;
    }
    await this.cacheManager?.del(key);
  }

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
    const user = await this.usersRepository.findOne({
      where: { stellarAddress },
      relations: ['createdQuests'],
    });
    if (!user) {
      throw new NotFoundException(`User not found: ${stellarAddress}`);
    }
    return user;
  }

  async update(id: string, user: User): Promise<User> {
    // Drop every cached read derived from this user on a write (#2159).
    if (this.cacheService) {
      await this.cacheService.invalidateTag(CacheTags.user(id));
    }
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User not found: ${username}`);
    }
    return user;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    if (!googleId) return null;
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    if (!githubId) return null;
    return this.usersRepository.findOne({ where: { githubId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(dto: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(dto as any);
    const saved = (await this.usersRepository.save(user)) as unknown as User;
    this.eventEmitter?.emit('user.created', {
      userId: saved.id,
      username: saved.username,
      email: saved.email,
    });
    return saved;
  }

  async getUserStats(stellarAddress: string): Promise<any> {
    const cacheKey = `user_stats_${stellarAddress}`;
    const cached = await this.getCache<any>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findOne({
      where: { stellarAddress },
    });
    if (!user) {
      throw new NotFoundException(`User not found: ${stellarAddress}`);
    }

    const submissions = this.submissionsRepository
      ? await this.submissionsRepository.find({
          where: { userId: user.id },
        })
      : [];

    const totalSubmissions = submissions.length;
    const approvedSubmissions = submissions.filter(
      (submission) => String(submission.status) === 'APPROVED',
    ).length;
    const rejectedSubmissions = submissions.filter(
      (submission) => String(submission.status) === 'REJECTED',
    ).length;
    const completedQuests = approvedSubmissions;
    const pendingQuests = submissions.filter(
      (submission) => String(submission.status) === 'PENDING',
    ).length;
    const failedQuests = rejectedSubmissions;
    const totalQuests = totalSubmissions;
    const totalRewardsEarned = Number(user.totalEarned ?? 0);
    const approvalRate =
      totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
    const averageCompletionTime = 0;
    const streak = 0;
    const rank = 1;

    const stats = {
      totalQuests,
      completedQuests,
      pendingQuests,
      failedQuests,
      successRate: totalQuests > 0 ? completedQuests / totalQuests : 0,
      totalEarned: user.totalEarned ?? '0',
      averageCompletionTime,
      streak,
      rank,
      totalXp: user.xp,
      level: user.level,
      xpToNextLevel: Math.max(0, (user.level + 1) * 100 - user.xp),
      questsCompleted: user.questsCompleted,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      approvalRate,
      totalRewardsEarned,
      currentStreak: streak,
      longestStreak: streak,
    };

    await this.setCache(cacheKey, stats, 60);
    return stats;
  }

  async getUserQuests(
    stellarAddress: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; meta: any }> {
    const user = await this.usersRepository.findOne({
      where: { stellarAddress },
    });
    if (!user) {
      throw new NotFoundException(`User not found: ${stellarAddress}`);
    }

    const skip = (page - 1) * limit;
    const [quests, total] = await this.submissionsRepository!.findAndCount({
      where: { userId: user.id },
      relations: ['quest'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: quests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateProfile(
    stellarAddress: string,
    updateData: Partial<User>,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { stellarAddress },
    });
    if (!user) {
      throw new NotFoundException(`User not found: ${stellarAddress}`);
    }

    Object.assign(user, updateData);
    const saved = await this.usersRepository.save(user);
    this.eventEmitter?.emit('user.updated', {
      userId: saved.id,
      stellarAddress: saved.stellarAddress,
    });
    return saved;
  }

  async getLeaderboard(
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; meta: any }> {
    const skip = (page - 1) * limit;
    const [users, total] = await this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.xp', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users.map((user, index) =>
        UserMapper.toLeaderboardDto(user, skip + index + 1),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateUserStats(
    userId: string,
    updateData: Partial<Pick<User, 'xp' | 'totalEarned' | 'questsCompleted'>>,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    Object.assign(user, updateData);
    const saved = await this.usersRepository.save(user);
    await this.delCache(`user_stats_${saved.stellarAddress}`);
    this.eventEmitter?.emit('user.stats.updated', { userId: saved.id });
    return saved;
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
