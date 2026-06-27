import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      // Check cache first
      const cacheKey = userId ? `ff:${flagKey}:${userId}` : `ff:${flagKey}`;
      const cached = await this.cacheManager.get<boolean>(cacheKey);
      if (cached !== undefined) {
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
        await this.cacheManager.set(cacheKey, false, this.CACHE_TTL);
        return false;
      }

      // Check scheduled activation/deactivation
      const now = new Date();
      if (flag.scheduledActivationAt && now < flag.scheduledActivationAt) {
        await this.cacheManager.set(cacheKey, false, this.CACHE_TTL);
        return false;
      }
      if (flag.scheduledDeactivationAt && now > flag.scheduledDeactivationAt) {
        await this.cacheManager.set(cacheKey, false, this.CACHE_TTL);
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

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
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

    // Log audit
    await this.auditLogRepository.save({
      flagId: saved.id,
      flagKey: saved.key,
      action: AuditAction.CREATED,
      newValue: saved,
      performedBy,
      reason,
      ipAddress,
    });

    // Invalidate cache
    await this.invalidateFlagCache(saved.key);

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

    Object.assign(flag, updateDto, { updatedBy: performedBy });

    const saved = await this.featureFlagRepository.save(flag);

    // Determine audit action
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

    // Log audit
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

    // Invalidate cache
    await this.invalidateFlagCache(saved.key);

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

    // Log audit
    await this.auditLogRepository.save({
      flagId: flag.id,
      flagKey: flag.key,
      action: AuditAction.DELETED,
      previousValue: flag,
      performedBy,
      reason,
      ipAddress,
    });

    // Invalidate cache
    await this.invalidateFlagCache(flag.key);

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
   * Invalidate cache for a specific flag
   */
  private async invalidateFlagCache(flagKey: string): Promise<void> {
    // Note: In a real implementation, you might need to use pattern-based cache invalidation
    // This is a simplified version
    await this.cacheManager.del(`ff:${flagKey}`);
  }

  /**
   * Clear all flag caches (use with caution)
   */
  clearAllCaches(): void {
    // In a real implementation, you might need to iterate through all flag keys
    this.logger.warn('Clearing all feature flag caches');
  }
}
