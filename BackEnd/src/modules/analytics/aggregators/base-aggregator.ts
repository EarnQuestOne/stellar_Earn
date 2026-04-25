import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AnalyticsSnapshot, SnapshotType } from '../entities/analytics-snapshot.entity';
import { Quest } from '../entities/quest.entity';
import { Submission } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import { User as AnalyticsUser } from '../entities/user.entity';

export interface AggregationOptions {
  startDate: Date;
  endDate: Date;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  organizationId?: string;
}

export interface AggregationResult {
  date: Date;
  metrics: Record<string, number | string>;
  type: SnapshotType;
  referenceId?: string;
}

/**
 * Base Analytics Aggregator
 * Provides common aggregation functionality for different analytics types
 */
@Injectable()
export class BaseAnalyticsAggregator {
  constructor(
    @InjectRepository(AnalyticsSnapshot)
    protected snapshotRepository: Repository<AnalyticsSnapshot>,
    @InjectRepository(Quest)
    protected questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    protected submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    protected payoutRepository: Repository<Payout>,
    @InjectRepository(AnalyticsUser)
    protected userRepository: Repository<AnalyticsUser>,
  ) {}

  /**
   * Generate date ranges based on granularity
   */
  protected generateDateRanges(
    startDate: Date,
    endDate: Date,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ): Date[] {
    const ranges: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      ranges.push(new Date(current));

      switch (granularity) {
        case 'hourly':
          current.setHours(current.getHours() + 1);
          break;
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return ranges;
  }

  /**
   * Get date range for a specific period
   */
  protected getDateRange(date: Date, granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    switch (granularity) {
      case 'hourly':
        end.setHours(end.getHours() + 1);
        break;
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
    }

    return { start, end };
  }

  /**
   * Save aggregation result to snapshot
   */
  protected async saveSnapshot(result: AggregationResult): Promise<void> {
    const snapshot = this.snapshotRepository.create({
      date: result.date,
      type: result.type,
      referenceId: result.referenceId,
      metrics: result.metrics,
    });

    await this.snapshotRepository.save(snapshot);
  }

  /**
   * Check if snapshot already exists
   */
  protected async snapshotExists(
    date: Date,
    type: SnapshotType,
    referenceId?: string,
  ): Promise<boolean> {
    const query = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.date = :date', { date })
      .andWhere('snapshot.type = :type', { type });

    if (referenceId) {
      query.andWhere('snapshot.referenceId = :referenceId', { referenceId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Get common query conditions
   */
  protected getCommonConditions(options: AggregationOptions) {
    const conditions: any = {
      createdAt: Between(options.startDate, options.endDate),
    };

    if (options.organizationId) {
      conditions.organizationId = options.organizationId;
    }

    return conditions;
  }
}