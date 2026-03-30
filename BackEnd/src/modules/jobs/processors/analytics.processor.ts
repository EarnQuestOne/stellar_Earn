import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AnalyticsAggregatePayload, MetricsCollectPayload, JobResult } from '../job.types';
import { JobLogService } from '../services/job-log.service';
import { AnalyticsAggregationService } from '../../analytics/services/aggregation.service';
import { AnalyticsReportService, ReportGenerationOptions } from '../../analytics/services/report.service';
import { ReportType, ReportFormat } from '../../analytics/entities/analytics-report.entity';
import { SnapshotType } from '../../analytics/entities/analytics-snapshot.entity';

/**
 * Analytics Processor
 * Handles analytics aggregation and metrics collection
 */
@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private readonly jobLogService: JobLogService,
    private readonly analyticsAggregationService: AnalyticsAggregationService,
    private readonly analyticsReportService: AnalyticsReportService,
  ) {}

  /**
   * Process analytics aggregation job
   */
  async processAggregation(job: Job<AnalyticsAggregatePayload>): Promise<JobResult> {
    const { organizationId, aggregationType, metricsType, dateRange, specificIds } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing analytics aggregation job ${job.id}: org=${organizationId}, aggregationType=${aggregationType}`,
      );

      // Validation
      if (!aggregationType) {
        throw new Error('Missing required aggregationType');
      }

      const validAggregationTypes = ['hourly', 'daily', 'weekly', 'monthly'];
      if (!validAggregationTypes.includes(aggregationType)) {
        throw new Error(`Invalid aggregation type: ${aggregationType}`);
      }

      await job.updateProgress(20);

      // Determine date range
      const { startDate, endDate } = dateRange ?
        { startDate: new Date(dateRange.start), endDate: new Date(dateRange.end) } :
        this.getDefaultDateRange(aggregationType);

      const aggregationOptions = {
        startDate,
        endDate,
        granularity: aggregationType as 'hourly' | 'daily' | 'weekly' | 'monthly',
        organizationId,
      };

      await job.updateProgress(30);

      let processed = 0;
      let skipped = 0;

      // Determine which types to aggregate
      const typesToAggregate = metricsType && metricsType.length > 0 ?
        metricsType.map(type => this.mapMetricTypeToSnapshotType(type)).filter(Boolean) :
        [SnapshotType.PLATFORM, SnapshotType.QUEST, SnapshotType.USER];

      // Run batch aggregation
      const batchResult = await this.analyticsAggregationService.runBatchAggregation({
        ...aggregationOptions,
        types: typesToAggregate,
      });

      processed = batchResult.processed;
      skipped = batchResult.skipped;

      await job.updateProgress(80);

      // If specific IDs are provided, aggregate those individually
      if (specificIds && specificIds.length > 0) {
        for (const id of specificIds) {
          if (id.startsWith('quest_')) {
            const questProcessed = await this.analyticsAggregationService.aggregateQuestData(
              id.replace('quest_', ''),
              aggregationOptions,
            );
            processed += questProcessed;
          } else if (id.startsWith('user_')) {
            const userProcessed = await this.analyticsAggregationService.aggregateUserData(
              id.replace('user_', ''),
              aggregationOptions,
            );
            processed += userProcessed;
          }
        }
      }

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          organizationId,
          aggregationType,
          dateRange: { start: startDate, end: endDate },
          typesAggregated: typesToAggregate,
          processed,
          skipped,
          specificIdsProcessed: specificIds?.length || 0,
          aggregatedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(
        `Analytics aggregated: ${processed} snapshots processed, ${skipped} skipped`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error aggregating analytics for org ${organizationId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Process report generation job
   */
  async processReportGeneration(job: Job<any>): Promise<JobResult> {
    const { reportType, reportFormat, parameters, filters, startDate, endDate, generatedById } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(`Processing report generation job ${job.id}: type=${reportType}`);

      // Get user (simplified - in real implementation, fetch from database)
      const generatedBy = { id: generatedById, email: 'system@stellarearn.com' };

      const reportOptions: ReportGenerationOptions = {
        type: reportType,
        format: reportFormat,
        parameters: parameters || {},
        filters: filters || {},
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        generatedBy,
      };

      await job.updateProgress(50);

      const report = await this.analyticsReportService.generateReport(reportOptions);

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          reportId: report.id,
          reportType,
          reportFormat,
          status: report.status,
          generatedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Report generation completed: ${report.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error generating report: ${error.message}`, error.stack);
      throw error;
    }
  }
  async collectMetrics(job: Job<MetricsCollectPayload>): Promise<JobResult> {
    const { metricsToCollect, timeWindow } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing metrics collection job ${job.id}: metrics=${metricsToCollect?.length}`,
      );

      if (!metricsToCollect || metricsToCollect.length === 0) {
        throw new Error('No metrics specified for collection');
      }

      await job.updateProgress(20);

      // TODO: Collect system and application metrics
      // This would involve:
      // 1. Query application performance metrics (response times, error rates)
      // 2. Query infrastructure metrics (CPU, memory, disk)
      // 3. Query business metrics (conversions, revenue)
      // 4. Store metrics in time-series DB (InfluxDB, Prometheus)
      // 5. Calculate percentiles and aggregations

      const window = timeWindow || 'last_hour';
      const collectedMetrics: Record<string, any> = {};

      for (const metric of metricsToCollect) {
        collectedMetrics[metric] = {
          value: Math.floor(Math.random() * 1000),
          timestamp: new Date(),
          unit: this.getMetricUnit(metric),
        };
      }

      // Simulate metric collection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await job.updateProgress(50);

      // Simulate storage
      await new Promise((resolve) => setTimeout(resolve, 500));

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          metricsCount: metricsToCollect.length,
          timeWindow: window,
          collectedMetrics,
          collectedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Metrics collected: ${metricsToCollect.length} metrics`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error collecting metrics: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  // Helper methods

  private getDefaultDateRange(
    aggregationType: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);

    switch (aggregationType) {
      case 'hourly':
        start.setHours(start.getHours() - 1);
        break;
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return { start, end: now };
  }

  private mapMetricTypeToSnapshotType(metricType: string): SnapshotType | null {
    const mapping: Record<string, SnapshotType> = {
      platform: SnapshotType.PLATFORM,
      quest: SnapshotType.QUEST,
      user: SnapshotType.USER,
    };

    return mapping[metricType] || null;
  }

  private getMetricUnit(metric: string): string {
    const unitMap: Record<string, string> = {
      response_time: 'ms',
      error_rate: '%',
      cpu_usage: '%',
      memory_usage: 'MB',
      request_count: 'count',
      user_count: 'count',
      conversion_rate: '%',
    };

    return unitMap[metric] || 'unit';
  }
}
