import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataExportPayload,
  ReportGeneratePayload,
  JobResult,
} from '../job.types';
import { JobLogService } from '../services/job-log.service';
import {
  DataExport,
  DataExportStatus,
} from '../../users/entities/data-export.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataExportCompletedEvent } from '../../../events/dto/data-export-completed.event';
import { DataExportFailedEvent } from '../../../events/dto/data-export-failed.event';
import { User } from '../../users/entities/user.entity';
import { Quest } from '../../quests/entities/quest.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { Payout } from '../../payouts/entities/payout.entity';
import * as fs from 'fs';
import * as path from 'path';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
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
      if (!exportType || !format || !userId) {
        throw new Error('Missing required export fields');
      }

      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid export format: ${format}`);
      }

      await job.updateProgress(20);

      // 1. Query data based on export type
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      await job.updateProgress(40);

      const submissions = await this.submissionRepo.find({ where: { userId } });
      const quests = await this.questRepo.find({
        where: { createdBy: userId },
      });

      let payouts: Payout[] = [];
      if (user.stellarAddress) {
        payouts = await this.payoutRepo.find({
          where: { stellarAddress: user.stellarAddress },
        });
      }

      const userData = {
        profile: {
          id: user.id,
          stellarAddress: user.stellarAddress,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          questsCompleted: user.questsCompleted,
          badges: user.badges,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          socialLinks: user.socialLinks,
          privacyLevel: user.privacyLevel,
          failedQuests: user.failedQuests,
          successRate: user.successRate,
          totalEarned: user.totalEarned,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        quests: quests.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          rewardAsset: q.rewardAsset,
          rewardAmount: q.rewardAmount,
          status: q.status,
          createdAt: q.createdAt,
        })),
        submissions: submissions.map((s) => ({
          id: s.id,
          questId: s.questId,
          proof: s.proof,
          status: s.status,
          createdAt: s.createdAt,
          approvedAt: s.approvedAt,
          rejectedAt: s.rejectedAt,
          rejectionReason: s.rejectionReason,
        })),
        payouts: payouts.map((p) => ({
          id: p.id,
          amount: p.amount,
          asset: p.asset,
          status: p.status,
          type: p.type,
          questId: p.questId,
          submissionId: p.submissionId,
          transactionHash: p.transactionHash,
          processedAt: p.processedAt,
          createdAt: p.createdAt,
        })),
      };

      await job.updateProgress(60);

      // 2. Format data and write to file system
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `export-${exportType}-${userId}-${Date.now()}.${this.getFileExtension(format)}`;
      const localFilePath = path.join(exportDir, fileName);

      let fileContent = '';
      if (format === 'json') {
        fileContent = JSON.stringify(userData, null, 2);
      } else {
        fileContent = this.generateCSVContent(userData);
      }

      fs.writeFileSync(localFilePath, fileContent, 'utf8');

      // 3. Upload to cloud storage (generate a simulated S3 signed download URL valid for 24h)
      const downloadUrl = `https://stellar-earn-exports.s3.amazonaws.com/${fileName}?Expires=${Math.floor(Date.now() / 1000) + 86400}&Signature=MockedSignature`;

      await job.updateProgress(90);

      const recordCount =
        1 +
        (userData.quests?.length || 0) +
        (userData.submissions?.length || 0) +
        (userData.payouts?.length || 0);

      await job.updateProgress(100);

      const result: JobResult = {
        success: true,
        data: {
          organizationId,
          exportType,
          format,
          fileName,
          downloadUrl,
          recordCount,
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
          });

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
          this.logger.error(
            'Failed to update data export record',
            err?.stack || err,
          );
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
          });

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
          this.logger.error(
            'Failed to mark export record failed',
            err?.stack || err,
          );
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

  private generateCSVContent(data: any): string {
    let csv = '';

    // Profile
    csv += '--- PROFILE ---\n';
    const profileKeys = Object.keys(data.profile);
    csv += profileKeys.join(',') + '\n';
    csv +=
      profileKeys
        .map((k) => {
          const val = data.profile[k];
          return typeof val === 'object'
            ? JSON.stringify(val).replace(/"/g, '""')
            : `"${String(val || '').replace(/"/g, '""')}"`;
        })
        .join(',') + '\n\n';

    // Quests Created
    csv += '--- QUESTS CREATED ---\n';
    if (data.quests && data.quests.length > 0) {
      const questKeys = Object.keys(data.quests[0]);
      csv += questKeys.join(',') + '\n';
      data.quests.forEach((q: any) => {
        csv +=
          questKeys
            .map((k) => `"${String(q[k] || '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
      });
    } else {
      csv += 'No quests found\n';
    }
    csv += '\n';

    // Submissions
    csv += '--- SUBMISSIONS ---\n';
    if (data.submissions && data.submissions.length > 0) {
      const subKeys = Object.keys(data.submissions[0]);
      csv += subKeys.join(',') + '\n';
      data.submissions.forEach((s: any) => {
        csv +=
          subKeys
            .map((k) => {
              const val = s[k];
              return typeof val === 'object'
                ? `"${JSON.stringify(val).replace(/"/g, '""')}"`
                : `"${String(val || '').replace(/"/g, '""')}"`;
            })
            .join(',') + '\n';
      });
    } else {
      csv += 'No submissions found\n';
    }
    csv += '\n';

    // Payouts
    csv += '--- PAYOUTS ---\n';
    if (data.payouts && data.payouts.length > 0) {
      const payoutKeys = Object.keys(data.payouts[0]);
      csv += payoutKeys.join(',') + '\n';
      data.payouts.forEach((p: any) => {
        csv +=
          payoutKeys
            .map((k) => `"${String(p[k] || '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
      });
    } else {
      csv += 'No payouts found\n';
    }

    return csv;
  }
}
