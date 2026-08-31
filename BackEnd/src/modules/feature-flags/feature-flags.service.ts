import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import {
  FeatureFlag,
  RolloutStrategy,
  FlagStatus,
} from './entities/feature-flag.entity';
import {
  FeatureFlagAuditLog,
  AuditAction,
} from './entities/feature-flag-audit.entity';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CacheService } from '../cache/cache.service';

// Cache tags for feature flags to enable tag-based invalidation
export const FeatureFlagCacheTags = {
  flag: (key: string) => `ff:${key}`,
  allFlags: () => 'ff:all',
};

/** Per-request flag evaluation cache stored in AsyncLocalStorage. */
const requestFlagCache = new AsyncLocalStorage<Map<string, boolean>>();

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepository: Repository<FeatureFlag>,
    @InjectRepository(FeatureFlagAuditLog)
    private readonly auditLogRepository: Repository<FeatureFlagAuditLog>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Check if a feature flag is enabled for a specific user
   *
   * @param flagKey - The key of the feature flag
   * @param userId - Optional user ID for user-based targeting
   * @param userContext - Optional user context for segment-based targeting
   * @returns boolean - Whether the flag is enabled for the user
   */
  async isEnabled(
    flagKey: string,
    userId?: string,
    userContext?: {
      role?: string;
      level?: number;
      xp?: number;
      custom?: Record<string, any>;
    },
  ): Promise<boolean> {
    try {
      // Check request-scoped cache first (zero-cost lookup within same request)
      const reqCache = requestFlagCache.getStore();
      const reqCacheKey = userId ? `${flagKey}:${userId}` : flagKey;
      if (reqCache?.has(reqCacheKey)) {
        return reqCache.get(reqCacheKey)!;
      }

      // Check shared Redis cache
      const cacheKey = userId ? `ff:${flagKey}:${userId}` : `ff:${flagKey}`;
      const cached = await this.cacheManager.get<boolean>(cacheKey);
      if (cached !== undefined) {
        reqCache?.set(reqCacheKey, cached);
        return cached;
      }

      const flag = await this.featureFlagRepository.findOne({
        where: { key: flagKey },
      });

      if (!flag) {
        this.logger.warn(`Feature flag "${flagKey}" not found`);
        return false;
      }

      // Check if flag is globally disabled
      if (!flag.enabled || flag.status !== FlagStatus.ACTIVE) {
        await this.cacheService.set(
          cacheKey,
          false,
          this.CACHE_TTL,
          [FeatureFlagCacheTags.flag(flagKey)],
        );
        reqCache?.set(reqCacheKey, false);
        return false;
      }

      // Check scheduled activation/deactivation
      const now = new Date();
      if (flag.scheduledActivationAt && now < flag.scheduledActivationAt) {
        await this.cacheService.set(
          cacheKey,
          false,
          this.CACHE_TTL,
          [FeatureFlagCacheTags.flag(flagKey)],
        );
        reqCache?.set(reqCacheKey, false);
        return false;
      }
      if (flag.scheduledDeactivationAt && now > flag.scheduledDeactivationAt) {
        await this.cacheService.set(
          cacheKey,
          false,
          this.CACHE_TTL,
          [FeatureFlagCacheTags.flag(flagKey)],
        );
        reqCache?.set(reqCacheKey, false);
        return false;
      }

      // Evaluate based on rollout strategy
      let result = false;
      switch (flag.rolloutStrategy) {
        case RolloutStrategy.BOOLEAN:
          result = true;
          break;

        case RolloutStrategy.PERCENTAGE:
          result = this.evaluatePercentageRollout(
            flag.rolloutPercentage,
            userId,
          );
          break;

        case RolloutStrategy.USER_WHITELIST:
          result = userId ? flag.whitelistedUsers?.includes(userId) : false;
          break;

        case RolloutStrategy.USER_BLACKLIST:
          result = userId ? !flag.blacklistedUsers?.includes(userId) : true;
          break;

        case RolloutStrategy.SEGMENT_BASED:
          result = this.evaluateSegmentRules(flag.segmentRules, userContext);
          break;

        default:
          result = false;
      }

      await this.cacheService.set(
        cacheKey,
        result,
        this.CACHE_TTL,
        [FeatureFlagCacheTags.flag(flagKey)],
      );
      reqCache?.set(reqCacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Error checking flag "${flagKey}": ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate percentage-based rollout
   * Uses consistent hashing based on user ID to ensure consistent results
   */
  private evaluatePercentageRollout(
    percentage: number,
    userId?: string,
  ): boolean {
    if (!userId) {
      return Math.random() * 100 < percentage;
    }

    // Consistent hashing using user ID
    const hash = this.hashString(userId);
    const scaledHash = (hash % 100) + 1;
    return scaledHash <= percentage;
  }

  /**
   * Evaluate segment-based rules
   */
  private evaluateSegmentRules(
    rules: any,
    userContext?: {
      role?: string;
      level?: number;
      xp?: number;
      custom?: Record<string, any>;
    },
  ): boolean {
    if (!rules || !userContext) {
      return true;
    }

    // Check role
    if (rules.role && rules.role.length > 0) {
      if (!userContext.role || !rules.role.includes(userContext.role)) {
        return false;
      }
    }

    // Check level
    if (rules.level && userContext.level !== undefined) {
      if (
        rules.level.min !== undefined &&
        userContext.level < rules.level.min
      ) {
        return false;
      }
      if (
        rules.level.max !== undefined &&
        userContext.level > rules.level.max
      ) {
        return false;
      }
    }

    // Check XP
    if (rules.xp && userContext.xp !== undefined) {
      if (rules.xp.min !== undefined && userContext.xp < rules.xp.min) {
        return false;
      }
      if (rules.xp.max !== undefined && userContext.xp > rules.xp.max) {
        return false;
      }
    }

    // Check custom rules
    if (rules.custom && userContext.custom) {
      for (const [key, value] of Object.entries(rules.custom)) {
        if (userContext.custom[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Simple hash function for consistent hashing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Create a new feature flag
   */
  async create(
    createDto: CreateFeatureFlagDto,
    performedBy: string,
    ipAddress?: string,
    reason?: string,
  ): Promise<FeatureFlag> {
    // Check if flag with same key already exists
    const existing = await this.featureFlagRepository.findOne({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new BadRequestException(
        `Feature flag with key "${createDto.key}" already exists`,
      );
    }

    const flag = this.featureFlagRepository.create({
      ...createDto,
      createdBy: performedBy,
    });

    const saved = await this.featureFlagRepository.save(flag);

    // Log audit (do this before cache invalidation to ensure audit is recorded)
    try {
      await this.auditLogRepository.save({
        flagId: saved.id,
        flagKey: saved.key,
        action: AuditAction.CREATED,
        newValue: saved,
        performedBy,
        reason,
        ipAddress,
      });
    } catch (error) {
      this.logger.error(
        `Failed to save audit log for flag creation: ${saved.key}`,
        error,
      );
      // Don't throw; audit failure should not prevent flag creation
    }

    // Invalidate all related caches to prevent stale reads
    await this.invalidateFlagCaches(saved.key);

    this.logger.log(`Created feature flag: ${saved.key}`);
    return saved;
  }

  /**
   * Update an existing feature flag
   */
  async update(
    id: string,
    updateDto: UpdateFeatureFlagDto,
    performedBy: string,
    ipAddress?: string,
    reason?: string,
  ): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findOne({ where: { id } });

    if (!flag) {
      throw new NotFoundException(`Feature flag with ID "${id}" not found`);
    }

    const previousValue = { ...flag };
    const flagKeyBeforeUpdate = flag.key;

    Object.assign(flag, updateDto, { updatedBy: performedBy });

    const saved = await this.featureFlagRepository.save(flag);

    // Determine audit action based on what changed
    let action = AuditAction.UPDATED;
    if (previousValue.enabled !== saved.enabled) {
      action = saved.enabled ? AuditAction.ACTIVATED : AuditAction.DEACTIVATED;
    } else if (previousValue.rolloutPercentage !== saved.rolloutPercentage) {
      action = AuditAction.ROLLOUT_CHANGED;
    } else if (
      JSON.stringify(previousValue.whitelistedUsers) !==
        JSON.stringify(saved.whitelistedUsers) ||
      JSON.stringify(previousValue.blacklistedUsers) !==
        JSON.stringify(saved.blacklistedUsers)
    ) {
      action = AuditAction.USER_LIST_CHANGED;
    } else if (
      JSON.stringify(previousValue.segmentRules) !==
      JSON.stringify(saved.segmentRules)
    ) {
      action = AuditAction.SEGMENT_CHANGED;
    }

    // Log audit BEFORE cache invalidation to ensure audit trail is complete
    try {
      await this.auditLogRepository.save({
        flagId: saved.id,
        flagKey: saved.key,
        action,
        previousValue,
        newValue: saved,
        performedBy,
        reason,
        ipAddress,
      });
    } catch (error) {
      this.logger.error(
        `Failed to save audit log for flag update: ${saved.key}`,
        error,
      );
      // Don't throw; audit failure should not prevent flag update
    }

    // Invalidate all related caches to prevent stale reads
    await this.invalidateFlagCaches(flagKeyBeforeUpdate);

    this.logger.log(`Updated feature flag: ${saved.key}`);
    return saved;
  }

  /**
   * Delete a feature flag
   */
  async delete(
    id: string,
    performedBy: string,
    ipAddress?: string,
    reason?: string,
  ): Promise<void> {
    const flag = await this.featureFlagRepository.findOne({ where: { id } });

    if (!flag) {
      throw new NotFoundException(`Feature flag with ID "${id}" not found`);
    }

    await this.featureFlagRepository.remove(flag);

    // Log audit BEFORE cache invalidation to ensure audit trail is complete
    try {
      await this.auditLogRepository.save({
        flagId: flag.id,
        flagKey: flag.key,
        action: AuditAction.DELETED,
        previousValue: flag,
        performedBy,
        reason,
        ipAddress,
      });
    } catch (error) {
      this.logger.error(
        `Failed to save audit log for flag deletion: ${flag.key}`,
        error,
      );
      // Don't throw; audit failure should not prevent flag deletion
    }

    // Invalidate all related caches to prevent stale reads
    await this.invalidateFlagCaches(flag.key);

    this.logger.log(`Deleted feature flag: ${flag.key}`);
  }

  /**
   * Get all feature flags
   */
  async findAll(): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific feature flag
   */
  async findOne(id: string): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findOne({ where: { id } });

    if (!flag) {
      throw new NotFoundException(`Feature flag with ID "${id}" not found`);
    }

    return flag;
  }

  /**
   * Get a feature flag by key
   */
  async findByKey(key: string): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findOne({ where: { key } });

    if (!flag) {
      throw new NotFoundException(`Feature flag with key "${key}" not found`);
    }

    return flag;
  }

  /**
   * Get audit logs for a specific flag
   */
  async getAuditLogs(flagId: string): Promise<FeatureFlagAuditLog[]> {
    return this.auditLogRepository.find({
      where: { flagId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Invalidate all cache entries related to a feature flag.
   * Clears both the global flag cache and all user-specific variants using tag-based invalidation.
   * @param flagKey - The feature flag key to invalidate
   */
  private async invalidateFlagCaches(flagKey: string): Promise<void> {
    try {
      // Use CacheService tag-based invalidation to clear all variants
      const tag = FeatureFlagCacheTags.flag(flagKey);
      await this.cacheService.invalidateTag(tag);

      // Also invalidate the global flag list cache
      await this.cacheService.invalidateTag(FeatureFlagCacheTags.allFlags());

      this.logger.debug(
        `Invalidated all cache entries for feature flag: ${flagKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for flag ${flagKey}`,
        error,
      );
      // Don't throw; cache invalidation failure should not prevent operations
    }
  }

  /**
   * Clear all flag caches (use with caution)
   */
  async clearAllCaches(): Promise<void> {
    try {
      await this.cacheService.invalidateTag(FeatureFlagCacheTags.allFlags());
      this.logger.warn('Cleared all feature flag caches');
    } catch (error) {
      this.logger.error('Failed to clear all feature flag caches', error);
    }
  }
}
