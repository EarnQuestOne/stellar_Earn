import {
  Injectable,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QuotaConfig } from './entities/quota-config.entity';
import { QuotaUsage, QuotaResourceType } from './entities/quota-usage.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  private static readonly QUOTA_CACHE_TTL_SECONDS = 60;

  constructor(
    @InjectRepository(QuotaConfig)
    private readonly configRepo: Repository<QuotaConfig>,
    @InjectRepository(QuotaUsage)
    private readonly usageRepo: Repository<QuotaUsage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  /** Returns the quota config for a tenant, or null if none configured. */
  async getConfig(tenantId: string): Promise<QuotaConfig | null> {
    return this.configRepo.findOne({ where: { tenantId } });
  }

  /** Upserts a quota config for a tenant. */
  async setConfig(
    tenantId: string,
    config: Partial<
      Omit<QuotaConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<QuotaConfig> {
    const existing = await this.configRepo.findOne({ where: { tenantId } });
    if (existing) {
      Object.assign(existing, config);
      return this.configRepo.save(existing);
    }
    return this.configRepo.save(
      this.configRepo.create({ tenantId, ...config }),
    );
  }

  /** Computes the start of the current quota period for a given config. */
  getPeriodStart(config: QuotaConfig, now = new Date()): Date {
    const periodMs = config.periodSeconds * 1000;
    const periodStart = new Date(
      Math.floor(now.getTime() / periodMs) * periodMs,
    );
    return periodStart;
  }

  /**
   * Atomically checks and increments the quest creation quota for a tenant.
   *
   * Uses a single atomic UPDATE with a WHERE guard to eliminate the TOCTOU
   * race between the quota check and the increment. If the UPDATE affects 0
   * rows, the quota is exceeded.
   * Throws ForbiddenException if the limit is exceeded.
   */
  async enforceQuestCreationQuota(tenantId: string): Promise<void> {
    const config = await this.getConfig(tenantId);
    if (!config || config.maxQuestsPerPeriod === null) return;

    const periodStart = this.getPeriodStart(config);
    const limit = config.maxQuestsPerPeriod;

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(QuotaUsage)
      .values({ tenantId, resourceType: QuotaResourceType.QUEST, periodStart })
      .orIgnore()
      .execute();

    // Atomic increment with guard: only increments if under limit.
    const result = await this.dataSource
      .createQueryBuilder()
      .update(QuotaUsage)
      .set({ questCount: () => '"questCount" + 1' })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('resourceType = :rt', { rt: QuotaResourceType.QUEST })
      .andWhere('periodStart = :ps', { ps: periodStart })
      .andWhere('"questCount" < :limit', { limit })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `Tenant ${tenantId} exceeded quest quota (limit: ${limit})`,
      );
      throw new ForbiddenException(
        `Quest creation quota exceeded (${limit} per period)`,
      );
    }

    await this.updateCachedQuotaUsage(
      tenantId,
      QuotaResourceType.QUEST,
      periodStart,
    );
  }

  /**
   * Atomically checks and increments the payout quota for a tenant.
   *
   * The single-payout check is stateless and runs outside the transaction.
   * The period-total check and increment use a single atomic UPDATE with a
   * WHERE guard, eliminating the TOCTOU race.
   * Throws ForbiddenException if any limit is exceeded.
   */
  async enforcePayoutQuota(tenantId: string, amount: number): Promise<void> {
    const config = await this.getConfig(tenantId);
    if (!config) return;

    if (
      config.maxSinglePayoutAmount !== null &&
      amount > config.maxSinglePayoutAmount
    ) {
      throw new ForbiddenException(
        `Payout amount ${amount} exceeds single payout limit of ${config.maxSinglePayoutAmount}`,
      );
    }

    if (config.maxPayoutAmountPerPeriod === null) return;

    const periodStart = this.getPeriodStart(config);
    const limit = config.maxPayoutAmountPerPeriod;

    // Ensure the usage row exists.
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(QuotaUsage)
      .values({
        tenantId,
        resourceType: QuotaResourceType.PAYOUT,
        periodStart,
      })
      .orIgnore()
      .execute();

    // Atomic increment with guard: only adds amount if under limit.
    const result = await this.dataSource
      .createQueryBuilder()
      .update(QuotaUsage)
      .set({ payoutAmount: () => '"payoutAmount" + :amount' })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('resourceType = :rt', { rt: QuotaResourceType.PAYOUT })
      .andWhere('periodStart = :ps', { ps: periodStart })
      .andWhere('"payoutAmount" + :amount <= :limit', { amount, limit })
      .setParameter('amount', amount)
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `Tenant ${tenantId} exceeded payout quota (limit: ${limit})`,
      );
      throw new ForbiddenException(
        `Payout quota exceeded (period limit: ${limit})`,
      );
    }

    await this.updateCachedQuotaUsage(
      tenantId,
      QuotaResourceType.PAYOUT,
      periodStart,
    );
  }

  // ─── Redis-backed quota cache ──────────────────────────────────────────────

  /**
   * Build the Redis key for a specific quota period.
   */
  private buildQuotaCacheKey(
    tenantId: string,
    resourceType: QuotaResourceType,
    periodStart: Date,
  ): string {
    return `quota:${tenantId}:${resourceType}:${periodStart.getTime()}`;
  }

  /**
   * Check Redis for cached quota usage before falling back to DB.
   * Returns the cached usage row (with questCount / payoutAmount) or null.
   */
  async getCachedQuotaUsage(
    tenantId: string,
    resourceType: QuotaResourceType,
    periodStart: Date,
  ): Promise<QuotaUsage | null> {
    const key = this.buildQuotaCacheKey(tenantId, resourceType, periodStart);
    const cached = await this.cacheService.get<QuotaUsage>(key);
    if (cached) {
      this.logger.debug(`Quota cache hit for ${key}`);
      return cached;
    }

    this.logger.debug(`Quota cache miss for ${key}, falling back to DB`);
    const usage = await this.usageRepo.findOne({
      where: { tenantId, resourceType, periodStart },
    });

    if (usage) {
      await this.cacheService.set(
        key,
        usage,
        QuotaService.QUOTA_CACHE_TTL_SECONDS,
      );
    }

    return usage;
  }

  /**
   * Write-through: after a successful enforce, refresh the cached usage
   * so subsequent reads within the TTL window see the updated count.
   */
  private async updateCachedQuotaUsage(
    tenantId: string,
    resourceType: QuotaResourceType,
    periodStart: Date,
  ): Promise<void> {
    try {
      const usage = await this.usageRepo.findOne({
        where: { tenantId, resourceType, periodStart },
      });
      if (usage) {
        const key = this.buildQuotaCacheKey(
          tenantId,
          resourceType,
          periodStart,
        );
        await this.cacheService.set(
          key,
          usage,
          QuotaService.QUOTA_CACHE_TTL_SECONDS,
        );
      }
    } catch (err) {
      this.logger.warn('Failed to update quota cache after enforce', err);
    }
  }
}
