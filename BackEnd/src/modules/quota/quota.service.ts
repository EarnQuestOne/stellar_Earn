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

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    @InjectRepository(QuotaConfig)
    private readonly configRepo: Repository<QuotaConfig>,
    @InjectRepository(QuotaUsage)
    private readonly usageRepo: Repository<QuotaUsage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
   * Uses a database transaction with a pessimistic write lock (SELECT FOR UPDATE)
   * to eliminate the TOCTOU race between the quota check and the increment.
   * Throws ForbiddenException if the limit is exceeded.
   */
  async enforceQuestCreationQuota(tenantId: string): Promise<void> {
    const config = await this.getConfig(tenantId);
    if (!config || config.maxQuestsPerPeriod === null) return;

    const periodStart = this.getPeriodStart(config);
    const limit = config.maxQuestsPerPeriod;

    await this.dataSource.transaction(async (manager) => {
      // Ensure the usage row exists before acquiring the lock.
      // ON CONFLICT DO NOTHING is safe under concurrent inserts.
      await manager
        .createQueryBuilder()
        .insert()
        .into(QuotaUsage)
        .values({ tenantId, resourceType: QuotaResourceType.QUEST, periodStart })
        .orIgnore()
        .execute();

      // Acquire a row-level write lock. Concurrent transactions block here
      // until this transaction commits, closing the check-then-increment gap.
      const usage = await manager.findOne(QuotaUsage, {
        where: { tenantId, resourceType: QuotaResourceType.QUEST, periodStart },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usage) {
        throw new InternalServerErrorException(
          'Failed to lock quota usage row after insert',
        );
      }

      if (usage.questCount >= limit) {
        this.logger.warn(
          `Tenant ${tenantId} exceeded quest quota: ${usage.questCount}/${limit}`,
        );
        throw new ForbiddenException(
          `Quest creation quota exceeded (${limit} per period)`,
        );
      }

      await manager.increment(QuotaUsage, { id: usage.id }, 'questCount', 1);
    });
  }

  /**
   * Atomically checks and increments the payout quota for a tenant.
   *
   * The single-payout check is stateless and runs outside the transaction.
   * The period-total check and increment are wrapped in a transaction with a
   * pessimistic write lock to prevent concurrent requests from both passing
   * the same stale balance check.
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

    await this.dataSource.transaction(async (manager) => {
      await manager
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

      const usage = await manager.findOne(QuotaUsage, {
        where: {
          tenantId,
          resourceType: QuotaResourceType.PAYOUT,
          periodStart,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usage) {
        throw new InternalServerErrorException(
          'Failed to lock quota usage row after insert',
        );
      }

      const currentTotal = Number(usage.payoutAmount);
      if (currentTotal + amount > limit) {
        this.logger.warn(
          `Tenant ${tenantId} exceeded payout quota: ${currentTotal + amount}/${limit}`,
        );
        throw new ForbiddenException(
          `Payout quota exceeded (period limit: ${limit})`,
        );
      }

      await manager
        .createQueryBuilder()
        .update(QuotaUsage)
        .set({ payoutAmount: () => `"payoutAmount" + ${amount}` })
        .where('id = :id', { id: usage.id })
        .execute();
    });
  }
}
