import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { JobLog, JobLogRetry, JobDependency } from '../entities/job-log.entity';
import { JobStatus, JobType, JobResult } from '../job.types';

/**
 * Job Log Service
 * Manages persistent logging, querying, and audit trail for all background jobs
 */
@Injectable()
export class JobLogService {
  private readonly logger = new Logger(JobLogService.name);

  constructor(
    @InjectRepository(JobLog)
    private readonly jobLogRepository: Repository<JobLog>,
    @InjectRepository(JobLogRetry)
    private readonly jobLogRetryRepository: Repository<JobLogRetry>,
    @InjectRepository(JobDependency)
    private readonly jobDependencyRepository: Repository<JobDependency>,
  ) {}

  /**
   * Create a new job log entry
   */
  async createJobLog(data: Partial<JobLog>): Promise<JobLog> {
    const jobLog = this.jobLogRepository.create({
      status: JobStatus.PENDING,
      attempt: 0,
      progress: 0,
      isRetryable: true,
      ...data,
    });

    return this.jobLogRepository.save(jobLog);
  }

  /**
   * Update job log status and result
   */
  async updateJobLog(
    jobId: string,
    updates: Partial<JobLog>,
  ): Promise<JobLog | null> {
    const jobLog = await this.jobLogRepository.findOne({
      where: { id: jobId },
    });

    if (!jobLog) {
      return null;
    }

    Object.assign(jobLog, updates);

    // Calculate duration if completed
    if (updates.status === JobStatus.COMPLETED && jobLog.startedAt) {
      jobLog.durationMs = new Date().getTime() - jobLog.startedAt.getTime();
    }

    return this.jobLogRepository.save(jobLog);
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    await this.jobLogRepository.update(
      { id: jobId },
      {
        progress: Math.min(progress, 100),
        progressMessage: message,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Record job start
   */
  async recordJobStart(jobId: string, queueName: string): Promise<void> {
    await this.jobLogRepository.update(
      { id: jobId },
      {
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
        queueName,
      },
    );
  }

  /**
   * Record job completion
   */
  async recordJobCompletion(
    jobId: string,
    result: JobResult,
  ): Promise<void> {
    await this.jobLogRepository.update(
      { id: jobId },
      {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        result: result.data,
        durationMs: result.duration,
      },
    );
  }

  /**
   * Record job failure
   */
  async recordJobFailure(
    jobId: string,
    error: Error,
    attempt: number,
    maxAttempts: number,
  ): Promise<void> {
    const isRetryable = attempt < maxAttempts;

    await this.jobLogRepository.update(
      { id: jobId },
      {
        status: isRetryable ? JobStatus.RETRY : JobStatus.FAILED,
        errorMessage: error.message,
        errorStack: error.stack,
        attempt,
        maxAttempts,
        isRetryable,
        completedAt: isRetryable ? null : new Date(),
      },
    );
  }

  /**
   * Record retry attempt
   */
  async recordRetryAttempt(
    jobId: string,
    attemptNumber: number,
    error: Error,
    nextRetryAt?: Date,
  ): Promise<JobLogRetry> {
    const jobLog = await this.jobLogRepository.findOne({
      where: { id: jobId },
    });

    if (!jobLog) {
      throw new Error(`Job log not found: ${jobId}`);
    }

    const retry = this.jobLogRetryRepository.create({
      jobLogId: jobId,
      attemptNumber,
      status: JobStatus.RETRY,
      errorMessage: error.message,
      nextRetryAt,
    });

    return this.jobLogRetryRepository.save(retry);
  }

  /**
   * Get job log by ID
   */
  async getJobLog(jobId: string): Promise<JobLog | null> {
    return this.jobLogRepository.findOne({
      where: { id: jobId },
      relations: ['retries'],
    });
  }

  /**
   * Get job log by external job ID (BullMQ ID)
   */
  async getJobByExternalId(externalJobId: string): Promise<JobLog | null> {
    return this.jobLogRepository.findOne({
      where: { externalJobId },
      relations: ['retries'],
    });
  }

  /**
   * Query job logs with filtering
   */
  async queryJobLogs(filters: {
    jobType?: JobType;
    status?: JobStatus;
    organizationId?: string;
    userId?: string;
    correlationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'status';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: JobLog[]; total: number }> {
    const qb = this.jobLogRepository.createQueryBuilder('jl');

    if (filters.jobType) {
      qb.andWhere('jl.jobType = :jobType', { jobType: filters.jobType });
    }

    if (filters.status) {
      qb.andWhere('jl.status = :status', { status: filters.status });
    }

    if (filters.organizationId) {
      qb.andWhere('jl.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.userId) {
      qb.andWhere('jl.userId = :userId', { userId: filters.userId });
    }

    if (filters.correlationId) {
      qb.andWhere('jl.correlationId = :correlationId', {
        correlationId: filters.correlationId,
      });
    }

    if (filters.startDate && filters.endDate) {
      qb.andWhere('jl.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    qb.orderBy(`jl.${sortBy}`, sortOrder);

    const limit = Math.min(filters.limit || 50, 1000);
    const offset = filters.offset || 0;

    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Get jobs by correlation ID (related jobs)
   */
  async getRelatedJobs(correlationId: string): Promise<JobLog[]> {
    return this.jobLogRepository.find({
      where: { correlationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get retry history for a job
   */
  async getRetryHistory(jobId: string): Promise<JobLogRetry[]> {
    return this.jobLogRetryRepository.find({
      where: { jobLogId: jobId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get job statistics by type
   */
  async getStatisticsByJobType(organizationId?: string): Promise<Record<string, any>> {
    const qb = this.jobLogRepository.createQueryBuilder('jl')
      .select('jl.jobType', 'jobType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN jl.status = :completed THEN 1 ELSE 0 END)', 'completedCount')
      .addSelect('SUM(CASE WHEN jl.status = :failed THEN 1 ELSE 0 END)', 'failedCount')
      .addSelect('AVG(jl.durationMs)', 'avgDurationMs')
      .setParameter('completed', JobStatus.COMPLETED)
      .setParameter('failed', JobStatus.FAILED);

    if (organizationId) {
      qb.where('jl.organizationId = :organizationId', { organizationId });
    }

    qb.groupBy('jl.jobType');

    const stats = await qb.getRawMany();

    const result: Record<string, any> = {};
    for (const stat of stats) {
      result[stat.jobType] = {
        total: parseInt(stat.count),
        completed: parseInt(stat.completedCount),
        failed: parseInt(stat.failedCount),
        avgDurationMs: Math.round(stat.avgDurationMs || 0),
        successRate: (parseInt(stat.completedCount) / parseInt(stat.count)) * 100,
      };
    }

    return result;
  }

  /**
   * Get job statistics by status
   */
  async getStatisticsByStatus(organizationId?: string): Promise<Record<JobStatus, number>> {
    const qb = this.jobLogRepository.createQueryBuilder('jl')
      .select('jl.status', 'status')
      .addSelect('COUNT(*)', 'count');

    if (organizationId) {
      qb.where('jl.organizationId = :organizationId', { organizationId });
    }

    qb.groupBy('jl.status');

    const stats = await qb.getRawMany();

    const result: Record<JobStatus, number> = {
      [JobStatus.PENDING]: 0,
      [JobStatus.PROCESSING]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0,
      [JobStatus.DEFERRED]: 0,
      [JobStatus.RETRY]: 0,
    };

    for (const stat of stats) {
      result[stat.status] = parseInt(stat.count);
    }

    return result;
  }

  /**
   * Get recently failed jobs
   */
  async getRecentlyFailedJobs(limit: number = 10): Promise<JobLog[]> {
    return this.jobLogRepository.find({
      where: { status: In([JobStatus.FAILED, JobStatus.RETRY]) },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get slow jobs (exceeding threshold)
   */
  async getSlowJobs(durationThresholdMs: number = 60000, limit: number = 10): Promise<JobLog[]> {
    return this.jobLogRepository
      .createQueryBuilder('jl')
      .where('jl.durationMs > :threshold AND jl.status = :completed', {
        threshold: durationThresholdMs,
        completed: JobStatus.COMPLETED,
      })
      .orderBy('jl.durationMs', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get job performance metrics
   */
  async getPerformanceMetrics(organizationId?: string): Promise<any> {
    const qb = this.jobLogRepository.createQueryBuilder('jl')
      .select('AVG(jl.durationMs)', 'avgDurationMs')
      .addSelect('MIN(jl.durationMs)', 'minDurationMs')
      .addSelect('MAX(jl.durationMs)', 'maxDurationMs')
      .addSelect('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jl.durationMs)', 'p95DurationMs')
      .where('jl.status = :status', { status: JobStatus.COMPLETED });

    if (organizationId) {
      qb.andWhere('jl.organizationId = :organizationId', { organizationId });
    }

    return qb.getRawOne();
  }

  /**
   * Delete old job logs (retention policy)
   */
  async deleteOldJobLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.jobLogRepository.delete({
      createdAt: Between(new Date('1970-01-01'), cutoffDate),
    });

    this.logger.log(`Deleted ${result.affected} job logs older than ${olderThanDays} days`);
    return result.affected || 0;
  }

  /**
   * Record job dependency
   */
  async createJobDependency(
    parentJobId: string,
    childJobId: string,
    blockOnFailure: boolean = true,
  ): Promise<JobDependency> {
    const dependency = this.jobDependencyRepository.create({
      parentJobId,
      childJobId,
      status: JobStatus.PENDING,
      blockOnFailure,
    });

    return this.jobDependencyRepository.save(dependency);
  }

  /**
   * Resolve job dependency
   */
  async resolveJobDependency(dependencyId: string): Promise<void> {
    await this.jobDependencyRepository.update(
      { id: dependencyId },
      {
        status: JobStatus.COMPLETED,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Get pending dependencies for a job
   */
  async getPendingDependencies(childJobId: string): Promise<JobDependency[]> {
    return this.jobDependencyRepository.find({
      where: {
        childJobId,
        status: JobStatus.PENDING,
      },
    });
  }

  /**
   * Check if all dependencies are met
   */
  async areDependenciesMet(childJobId: string): Promise<boolean> {
    const pendingDependencies = await this.getPendingDependencies(childJobId);
    return pendingDependencies.length === 0;
  }

  /**
   * Export job logs to CSV
   */
  async exportJobLogs(
    filters: Record<string, any>,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    const { data } = await this.queryJobLogs({
      ...filters,
      limit: 10000, // Large export limit
    });

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Job Type',
      'Status',
      'Attempt',
      'Duration (ms)',
      'Error',
      'Created At',
    ];
    const rows = data.map((log) => [
      log.id,
      log.jobType,
      log.status,
      log.attempt,
      log.durationMs || 'N/A',
      log.errorMessage || 'N/A',
      log.createdAt,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
