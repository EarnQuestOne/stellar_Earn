import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsReport, ReportType, ReportFormat, ReportStatus } from '../entities/analytics-report.entity';
import { User as AnalyticsUser } from '../entities/user.entity';
import { PlatformAnalyticsService } from '../services/platform-analytics.service';
import { QuestAnalyticsService } from '../services/quest-analytics.service';
import { UserAnalyticsService } from '../services/user-analytics.service';
import { BaseAnalyticsExporter, ExportOptions, ExportResult } from '../exporters/base-exporter';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

export interface ReportGenerationOptions {
  type: ReportType;
  format: ReportFormat;
  parameters: Record<string, any>;
  filters?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  generatedBy: AnalyticsUser;
}

export interface ReportQueryOptions {
  type?: ReportType;
  status?: ReportStatus;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Analytics Report Service
 * Handles report generation, storage, and retrieval
 */
@Injectable()
export class AnalyticsReportService {
  private readonly logger = new Logger(AnalyticsReportService.name);

  constructor(
    @InjectRepository(AnalyticsReport)
    private reportRepository: Repository<AnalyticsReport>,
    private platformAnalyticsService: PlatformAnalyticsService,
    private questAnalyticsService: QuestAnalyticsService,
    private userAnalyticsService: UserAnalyticsService,
    private baseExporter: BaseAnalyticsExporter,
  ) {}

  /**
   * Generate a new analytics report
   */
  async generateReport(options: ReportGenerationOptions): Promise<AnalyticsReport> {
    const report = this.reportRepository.create({
      name: this.generateReportName(options.type),
      description: this.generateReportDescription(options),
      type: options.type,
      format: options.format,
      parameters: options.parameters,
      filters: options.filters,
      startDate: options.startDate,
      endDate: options.endDate,
      status: ReportStatus.GENERATING,
      generatedBy: options.generatedBy,
      generatedById: options.generatedBy.id,
    });

    const savedReport = await this.reportRepository.save(report);

    // Generate report asynchronously
    this.generateReportData(savedReport).catch(error => {
      this.logger.error(`Failed to generate report ${savedReport.id}: ${error.message}`, error.stack);
      this.updateReportStatus(savedReport.id, ReportStatus.FAILED, error.message);
    });

    return savedReport;
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<AnalyticsReport> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['generatedBy'],
    });

    if (!report) {
      throw new Error(`Report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Query reports with filters
   */
  async queryReports(options: ReportQueryOptions = {}): Promise<{
    reports: AnalyticsReport[];
    total: number;
  }> {
    const query = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.generatedBy', 'generatedBy');

    if (options.type) {
      query.andWhere('report.type = :type', { type: options.type });
    }

    if (options.status) {
      query.andWhere('report.status = :status', { status: options.status });
    }

    if (options.generatedBy) {
      query.andWhere('report.generatedById = :generatedBy', { generatedBy: options.generatedBy });
    }

    if (options.startDate) {
      query.andWhere('report.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('report.createdAt <= :endDate', { endDate: options.endDate });
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.offset) {
      query.offset(options.offset);
    }

    query.orderBy('report.createdAt', 'DESC');

    const [reports, total] = await query.getManyAndCount();

    return { reports, total };
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<void> {
    const report = await this.getReportById(id);

    // TODO: Delete associated file if it exists

    await this.reportRepository.remove(report);
  }

  /**
   * Export report data
   */
  async exportReport(id: string, format: ReportFormat): Promise<ExportResult> {
    const report = await this.getReportById(id);

    if (report.status !== ReportStatus.COMPLETED) {
      throw new Error(`Report ${id} is not ready for export. Status: ${report.status}`);
    }

    if (!report.data) {
      throw new Error(`Report ${id} has no data to export`);
    }

    const exportOptions: ExportOptions = {
      format,
      includeHeaders: true,
    };

    return this.baseExporter.export(report.data, exportOptions);
  }

  /**
   * Generate report data based on type
   */
  private async generateReportData(report: AnalyticsReport): Promise<void> {
    const startTime = Date.now();

    try {
      let data: any;

      const query: AnalyticsQueryDto = {
        startDate: report.startDate.toISOString().split('T')[0],
        endDate: report.endDate.toISOString().split('T')[0],
        granularity: 'daily',
      };

      switch (report.type) {
        case ReportType.PLATFORM_OVERVIEW:
          data = await this.platformAnalyticsService.getPlatformStats(query);
          break;

        case ReportType.QUEST_PERFORMANCE:
          data = await this.questAnalyticsService.getQuestAnalytics({
            ...query,
            questId: report.parameters.questId,
          });
          break;

        case ReportType.USER_ENGAGEMENT:
          data = await this.userAnalyticsService.getUserAnalytics({
            ...query,
            userId: report.parameters.userId,
          });
          break;

        case ReportType.PAYOUT_ANALYTICS:
          data = await this.generatePayoutAnalyticsReport(query, report.parameters);
          break;

        case ReportType.REVENUE_TRACKING:
          data = await this.generateRevenueTrackingReport(query, report.parameters);
          break;

        case ReportType.RETENTION_ANALYSIS:
          data = await this.generateRetentionAnalysisReport(query, report.parameters);
          break;

        case ReportType.GEOGRAPHIC_DISTRIBUTION:
          data = await this.generateGeographicDistributionReport(query, report.parameters);
          break;

        case ReportType.TIME_TO_COMPLETION:
          data = await this.generateTimeToCompletionReport(query, report.parameters);
          break;

        case ReportType.CUSTOM:
          data = await this.generateCustomReport(query, report.parameters);
          break;

        default:
          throw new Error(`Unsupported report type: ${report.type}`);
      }

      const generationTime = Date.now() - startTime;

      // Export data to file format
      const exportOptions: ExportOptions = {
        format: report.format,
        includeHeaders: true,
      };

      const exportResult = await this.baseExporter.export(data, exportOptions);

      // Update report with results
      await this.reportRepository.update(report.id, {
        status: ReportStatus.COMPLETED,
        data,
        fileUrl: `reports/${report.id}.${report.format}`,
        fileSize: exportResult.size,
        generationTimeMs: generationTime,
        completedAt: new Date(),
      });

      this.logger.log(`Report ${report.id} generated successfully in ${generationTime}ms`);

    } catch (error) {
      const generationTime = Date.now() - startTime;

      await this.reportRepository.update(report.id, {
        status: ReportStatus.FAILED,
        errorMessage: error.message,
        generationTimeMs: generationTime,
      });

      throw error;
    }
  }

  /**
   * Update report status
   */
  private async updateReportStatus(
    id: string,
    status: ReportStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.reportRepository.update(id, {
      status,
      errorMessage,
      ...(status === ReportStatus.COMPLETED && { completedAt: new Date() }),
    });
  }

  /**
   * Generate report name based on type
   */
  private generateReportName(type: ReportType): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const typeNames = {
      [ReportType.PLATFORM_OVERVIEW]: 'Platform Overview',
      [ReportType.QUEST_PERFORMANCE]: 'Quest Performance',
      [ReportType.USER_ENGAGEMENT]: 'User Engagement',
      [ReportType.PAYOUT_ANALYTICS]: 'Payout Analytics',
      [ReportType.REVENUE_TRACKING]: 'Revenue Tracking',
      [ReportType.RETENTION_ANALYSIS]: 'Retention Analysis',
      [ReportType.GEOGRAPHIC_DISTRIBUTION]: 'Geographic Distribution',
      [ReportType.TIME_TO_COMPLETION]: 'Time to Completion',
      [ReportType.CUSTOM]: 'Custom Report',
    };

    return `${typeNames[type]} - ${timestamp}`;
  }

  /**
   * Generate report description
   */
  private generateReportDescription(options: ReportGenerationOptions): string {
    const dateRange = `${options.startDate.toISOString().split('T')[0]} to ${options.endDate.toISOString().split('T')[0]}`;
    return `Analytics report generated on ${new Date().toISOString()} for date range: ${dateRange}`;
  }

  // Placeholder methods for specialized report generation
  private async generatePayoutAnalyticsReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement payout analytics report generation
    return { message: 'Payout analytics report - placeholder implementation' };
  }

  private async generateRevenueTrackingReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement revenue tracking report generation
    return { message: 'Revenue tracking report - placeholder implementation' };
  }

  private async generateRetentionAnalysisReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement retention analysis report generation
    return { message: 'Retention analysis report - placeholder implementation' };
  }

  private async generateGeographicDistributionReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement geographic distribution report generation
    return { message: 'Geographic distribution report - placeholder implementation' };
  }

  private async generateTimeToCompletionReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement time to completion report generation
    return { message: 'Time to completion report - placeholder implementation' };
  }

  private async generateCustomReport(query: AnalyticsQueryDto, parameters: any): Promise<any> {
    // TODO: Implement custom report generation
    return { message: 'Custom report - placeholder implementation' };
  }
}