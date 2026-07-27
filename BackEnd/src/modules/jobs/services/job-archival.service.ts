import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { JobLog } from '../entities/job-log.entity';
import { JobLogArchive } from '../entities/job-log-archive.entity';
import { JobStatus } from '../job.types';

export interface ArchivalResult {
  archived: number;
  purged: number;
  elapsedMs: number;
}

/**
 * Job Archival Service
 *
 * Moves completed/failed jobs older than the retention window from the
 * active `job_logs` table into the `job_logs_archive` table, and
 * permanently deletes archived rows past the archive retention limit.
 *
 * This keeps the active table small and fast while preserving history
 * for compliance and debugging within the archive window.
 */
@Injectable()
export class JobArchivalService {
  private readonly logger = new Logger(JobArchivalService.name);

  /** Default retention: 7 days for active table */
  private static readonly DEFAULT_ACTIVE_RETENTION_DAYS = 7;

  /** Default archive retention: 90 days */
  private static readonly DEFAULT_ARCHIVE_RETENTION_DAYS = 90;

  /** Maximum rows to process per archival batch to avoid long transactions */
  private static readonly BATCH_SIZE = 500;

  constructor(
    @InjectRepository(JobLog)
    private readonly jobLogRepository: Repository<JobLog>,
    @InjectRepository(JobLogArchive)
    private readonly archiveRepository: Repository<JobLogArchive>,
  ) {}

  /**
   * Archive jobs older than `activeRetentionDays` (default 7).
   * Completed and failed jobs are moved to the archive table in batches.
   */
  async archiveOldJobs(
    activeRetentionDays: number = JobArchivalService.DEFAULT_ACTIVE_RETENTION_DAYS,
  ): Promise<ArchivalResult> {
    const start = Date.now();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - activeRetentionDays);

    let totalArchived = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.jobLogRepository.find({
        where: {
          createdAt: LessThan(cutoff),
          status: In([JobStatus.COMPLETED, JobStatus.FAILED]),
        },
        order: { createdAt: 'ASC' },
        take: JobArchivalService.BATCH_SIZE,
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      const archiveEntities = batch.map((job) => this.toArchiveEntity(job));

      await this.archiveRepository
        .createQueryBuilder()
        .insert()
        .into(JobLogArchive)
        .values(archiveEntities)
        .orIgnore()
        .execute();

      const ids = batch.map((j) => j.id);
      await this.jobLogRepository.delete(ids);

      totalArchived += batch.length;
      this.logger.log(
        `Archived batch of ${batch.length} jobs (total: ${totalArchived})`,
      );

      // If we got a full batch, there may be more
      hasMore = batch.length === JobArchivalService.BATCH_SIZE;
    }

    const elapsedMs = Date.now() - start;
    this.logger.log(
      `Archival complete: ${totalArchived} jobs archived in ${elapsedMs}ms`,
    );
    return { archived: totalArchived, purged: 0, elapsedMs };
  }

  /**
   * Purge archived jobs older than `archiveRetentionDays` (default 90).
   * These are permanently deleted and cannot be recovered.
   */
  async purgeOldArchives(
    archiveRetentionDays: number = JobArchivalService.DEFAULT_ARCHIVE_RETENTION_DAYS,
  ): Promise<ArchivalResult> {
    const start = Date.now();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - archiveRetentionDays);

    let totalPurged = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.archiveRepository.find({
        where: { createdAt: LessThan(cutoff) },
        order: { createdAt: 'ASC' },
        take: JobArchivalService.BATCH_SIZE,
        select: ['id'],
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      const ids = batch.map((j) => j.id);
      await this.archiveRepository.delete(ids);
      totalPurged += batch.length;

      hasMore = batch.length === JobArchivalService.BATCH_SIZE;
    }

    const elapsedMs = Date.now() - start;
    this.logger.log(
      `Archive purge complete: ${totalPurged} archived jobs deleted in ${elapsedMs}ms`,
    );
    return { archived: 0, purged: totalPurged, elapsedMs };
  }

  /**
   * Combined: archive active jobs, then purge old archives.
   */
  async runMaintenance(
    activeRetentionDays?: number,
    archiveRetentionDays?: number,
  ): Promise<ArchivalResult> {
    const archiveResult = await this.archiveOldJobs(activeRetentionDays);
    const purgeResult = await this.purgeOldArchives(archiveRetentionDays);

    return {
      archived: archiveResult.archived,
      purged: purgeResult.purged,
      elapsedMs: archiveResult.elapsedMs + purgeResult.elapsedMs,
    };
  }

  /**
   * Get archival metrics — counts of active and archived jobs.
   */
  async getMetrics(): Promise<{
    activeCount: number;
    archivedCount: number;
    oldestActiveAge: Date | null;
    oldestArchivedAge: Date | null;
  }> {
    const [activeCount, archivedCount] = await Promise.all([
      this.jobLogRepository.count(),
      this.archiveRepository.count(),
    ]);

    const [oldestActive, oldestArchived] = await Promise.all([
      this.jobLogRepository.findOne({
        order: { createdAt: 'ASC' },
        select: ['createdAt'],
      }),
      this.archiveRepository.findOne({
        order: { createdAt: 'ASC' },
        select: ['createdAt'],
      }),
    ]);

    return {
      activeCount,
      archivedCount,
      oldestActiveAge: oldestActive?.createdAt ?? null,
      oldestArchivedAge: oldestArchived?.createdAt ?? null,
    };
  }

  private toArchiveEntity(jobLog: JobLog): JobLogArchive {
    const entity = new JobLogArchive();
    entity.id = jobLog.id;
    entity.jobType = jobLog.jobType;
    entity.externalJobId = jobLog.externalJobId;
    entity.status = jobLog.status;
    entity.queueName = jobLog.queueName;
    entity.attempt = jobLog.attempt;
    entity.maxAttempts = jobLog.maxAttempts;
    entity.payload = jobLog.payload;
    entity.result = jobLog.result;
    entity.errorMessage = jobLog.errorMessage;
    entity.errorStack = jobLog.errorStack;
    entity.durationMs = jobLog.durationMs;
    entity.processedAtTimestamp = jobLog.processedAtTimestamp;
    entity.correlationId = jobLog.correlationId;
    entity.traceId = jobLog.traceId;
    entity.organizationId = jobLog.organizationId;
    entity.userId = jobLog.userId;
    entity.tags = jobLog.tags;
    entity.isRetryable = jobLog.isRetryable;
    entity.parentJobId = jobLog.parentJobId;
    entity.dependentJobIds = jobLog.dependentJobIds;
    entity.progress = jobLog.progress;
    entity.progressMessage = jobLog.progressMessage;
    entity.scheduledAt = jobLog.scheduledAt;
    entity.startedAt = jobLog.startedAt;
    entity.completedAt = jobLog.completedAt;
    entity.nextRetryAt = jobLog.nextRetryAt;
    entity.createdAt = jobLog.createdAt;
    entity.updatedAt = jobLog.updatedAt;
    entity.expiresAt = jobLog.expiresAt;
    entity.archivedAt = new Date();
    return entity;
  }
}
