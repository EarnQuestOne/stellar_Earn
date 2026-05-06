import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataExportPayload, ReportGeneratePayload, JobResult } from '../job.types';
import { JobLogService } from '../services/job-log.service';
import { DataExport, DataExportStatus } from '../../users/entities/data-export.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataExportCompletedEvent } from '../../../events/dto/data-export-completed.event';
import { DataExportFailedEvent } from '../../../events/dto/data-export-failed.event';

/**
 * Data Export Processor
 * Handles data export and report generation jobs
 */
@Injectable()
export class DataExportProcessor {
  private readonly logger = new Logger(DataExportProcessor.name);

  constructor(
    private readonly jobLogService: JobLogService,
    @InjectRepository(DataExport)
    private readonly dataExportRepo: Repository<DataExport>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process data export job
   */
  async processExport(job: Job<DataExportPayload>): Promise<JobResult> {
    const { organizationId, exportType, format, userId } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing data export job ${job.id}: org=${organizationId}, type=${exportType}, format=${format}`,
      );

      // Validation
      if (!organizationId || !exportType || !format || !userId) {
        throw new Error('Missing required export fields');
      }

      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid export format: ${format}`);
      }

      await job.updateProgress(20);

      // TODO: Integrate with data service
      // This would involve:
      // 1. Query data based on export type
      // 2. Format data according to requested format
      // 3. Generate file
      // 4. Upload to cloud storage
      // 5. Generate download link
      // 6. Send email with link to user

      // Simulate data aggregation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await job.updateProgress(50);

      // Simulate file generation
      const fileName = `export-${exportType}-${Date.now()}.${this.getFileExtension(format)}`;
      const downloadUrl = `${process.env.EXPORT_STORAGE_BASE_URL || 'https://storage.example.com/exports'}/${fileName}`;

      await job.updateProgress(75);

      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          organizationId,
          exportType,
          format,
          fileName,
          downloadUrl,
          recordCount: Math.floor(Math.random() * 10000) + 100,
          exportedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      // Update DB record if present
      if (job.data && (job.data as any).exportId) {
        try {
          await this.dataExportRepo.update((job.data as any).exportId, {
            status: DataExportStatus.COMPLETED,
            fileName,
            downloadUrl,
            recordCount: result.data.recordCount,
            exportedAt: result.data.exportedAt,
          } as any);

          // Emit completion event
          this.eventEmitter.emit(
            'user.data-export.completed',
            new DataExportCompletedEvent(
              userId,
              (job.data as any).exportId,
              downloadUrl,
              fileName,
              result.data.recordCount,
            ),
          );
        } catch (err) {
          this.logger.error('Failed to update data export record', err?.stack || err);
        }
      }

      this.logger.log(`Data export completed: ${fileName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing data export for org ${organizationId}: ${error.message}`,
        error.stack,
      );

      // mark DB record as failed if exportId provided
      if ((job.data as any)?.exportId) {
        try {
          await this.dataExportRepo.update((job.data as any).exportId, {
            status: DataExportStatus.FAILED,
          } as any);

          // Emit failure event
          this.eventEmitter.emit(
            'user.data-export.failed',
            new DataExportFailedEvent(
              (job.data as any).userId || 'unknown',
              (job.data as any).exportId,
              error.message,
            ),
          );
        } catch (err) {
          this.logger.error('Failed to mark export record failed', err?.stack || err);
        }
      }

      throw error;
    }
  }

  /**
   * Process report generation job
   */
  async processReport(job: Job<ReportGeneratePayload>): Promise<JobResult> {
    const { organizationId, reportType, startDate, endDate } = job.data;

    try {
      await job.updateProgress(10);
      this.logger.log(
        `Processing report generation job ${job.id}: org=${organizationId}, type=${reportType}`,
      );

      // Validation
      if (!organizationId || !reportType || !startDate || !endDate) {
        throw new Error('Missing required report fields');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new Error('Start date must be before end date');
      }

      await job.updateProgress(20);

      // TODO: Generate report based on type
      // This would involve:
      // 1. Query relevant data for the period
      // 2. Aggregate and calculate metrics
      // 3. Generate PDF/HTML report
      // 4. Upload to storage
      // 5. Notify relevant stakeholders

      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await job.updateProgress(50);

      // Simulate PDF generation
      const reportFileName = `report-${reportType}-${Date.now()}.pdf`;
      const reportUrl = `https://storage.example.com/reports/${reportFileName}`;

      await job.updateProgress(75);

      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          organizationId,
          reportType,
          startDate,
          endDate,
          fileName: reportFileName,
          reportUrl,
          generatedAt: new Date(),
        },
        duration: Date.now() - job.timestamp,
      };

      this.logger.log(`Report generated: ${reportFileName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating report for org ${organizationId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  // Helper methods

  private getFileExtension(format: string): string {
    const extensionMap: Record<string, string> = {
      csv: 'csv',
      json: 'json',
      xlsx: 'xlsx',
    };
    return extensionMap[format] || 'txt';
  }
}
