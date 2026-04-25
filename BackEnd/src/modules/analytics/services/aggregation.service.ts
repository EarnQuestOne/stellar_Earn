import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsSnapshot, SnapshotType } from '../entities/analytics-snapshot.entity';
import { QuestAnalyticsAggregator } from '../aggregators/quest-aggregator';
import { UserAnalyticsAggregator } from '../aggregators/user-aggregator';
import { PlatformAnalyticsAggregator } from '../aggregators/platform-aggregator';
import { AggregationOptions } from '../aggregators/base-aggregator';

export interface BatchAggregationOptions extends AggregationOptions {
  types?: SnapshotType[];
  includeHistorical?: boolean;
}

/**
 * Analytics Aggregation Service
 * Coordinates aggregation of analytics data across different types
 */
@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private snapshotRepository: Repository<AnalyticsSnapshot>,
    private questAggregator: QuestAnalyticsAggregator,
    private userAggregator: UserAnalyticsAggregator,
    private platformAggregator: PlatformAnalyticsAggregator,
  ) {}

  /**
   * Run batch aggregation for multiple types
   */
  async runBatchAggregation(options: BatchAggregationOptions): Promise<{
    processed: number;
    skipped: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const types = options.types || [SnapshotType.PLATFORM, SnapshotType.QUEST, SnapshotType.USER];

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    this.logger.log(`Starting batch aggregation for types: ${types.join(', ')}`);

    for (const type of types) {
      try {
        const result = await this.aggregateByType(type, options);
        processed += result.processed;
        skipped += result.skipped;

        this.logger.log(`Completed aggregation for ${type}: ${result.processed} processed, ${result.skipped} skipped`);
      } catch (error) {
        errors++;
        this.logger.error(`Failed to aggregate ${type}: ${error.message}`, error.stack);
      }
    }

    const duration = Date.now() - startTime;

    this.logger.log(`Batch aggregation completed: ${processed} processed, ${skipped} skipped, ${errors} errors in ${duration}ms`);

    return { processed, skipped, errors, duration };
  }

  /**
   * Aggregate data for a specific type
   */
  async aggregateByType(
    type: SnapshotType,
    options: AggregationOptions,
  ): Promise<{ processed: number; skipped: number }> {
    switch (type) {
      case SnapshotType.PLATFORM:
        const platformResults = await this.platformAggregator.aggregatePlatformMetrics(options);
        return { processed: platformResults.length, skipped: 0 };

      case SnapshotType.QUEST:
        const questResults = await this.questAggregator.aggregateQuestMetrics(options);
        return { processed: questResults.length, skipped: 0 };

      case SnapshotType.USER:
        const userResults = await this.userAggregator.aggregateUserMetrics(options);
        return { processed: userResults.length, skipped: 0 };

      default:
        throw new Error(`Unsupported aggregation type: ${type}`);
    }
  }

  /**
   * Aggregate data for a specific quest
   */
  async aggregateQuestData(questId: string, options: AggregationOptions): Promise<number> {
    const results = await this.questAggregator.aggregateQuestMetricsById(questId, options);
    return results.length;
  }

  /**
   * Aggregate data for a specific user
   */
  async aggregateUserData(userId: string, options: AggregationOptions): Promise<number> {
    const results = await this.userAggregator.aggregateUserMetricsById(userId, options);
    return results.length;
  }

  /**
   * Get aggregated data for a date range
   */
  async getAggregatedData(
    type: SnapshotType,
    startDate: Date,
    endDate: Date,
    referenceId?: string,
  ): Promise<AnalyticsSnapshot[]> {
    const query = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.type = :type', { type })
      .andWhere('snapshot.date BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    if (referenceId) {
      query.andWhere('snapshot.referenceId = :referenceId', { referenceId });
    }

    query.orderBy('snapshot.date', 'ASC');

    return query.getMany();
  }

  /**
   * Get latest snapshot for a type
   */
  async getLatestSnapshot(type: SnapshotType, referenceId?: string): Promise<AnalyticsSnapshot | null> {
    const query = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.type = :type', { type })
      .orderBy('snapshot.date', 'DESC')
      .limit(1);

    if (referenceId) {
      query.andWhere('snapshot.referenceId = :referenceId', { referenceId });
    }

    return query.getOne();
  }

  /**
   * Clean up old snapshots
   */
  async cleanupOldSnapshots(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.snapshotRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old snapshots older than ${olderThanDays} days`);

    return result.affected || 0;
  }

  /**
   * Get aggregation statistics
   */
  async getAggregationStats(): Promise<{
    totalSnapshots: number;
    snapshotsByType: Record<string, number>;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  }> {
    const [totalSnapshots, snapshotsByType, oldestResult, newestResult] = await Promise.all([
      this.snapshotRepository.count(),
      this.getSnapshotsByType(),
      this.snapshotRepository
        .createQueryBuilder('snapshot')
        .select('MIN(snapshot.date)', 'oldest')
        .getRawOne(),
      this.snapshotRepository
        .createQueryBuilder('snapshot')
        .select('MAX(snapshot.date)', 'newest')
        .getRawOne(),
    ]);

    return {
      totalSnapshots,
      snapshotsByType,
      oldestSnapshot: oldestResult?.oldest ? new Date(oldestResult.oldest) : null,
      newestSnapshot: newestResult?.newest ? new Date(newestResult.newest) : null,
    };
  }

  /**
   * Get snapshot count by type
   */
  private async getSnapshotsByType(): Promise<Record<string, number>> {
    const results = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .select('snapshot.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('snapshot.type')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.type] = parseInt(result.count);
    });

    return stats;
  }
}