import {
  Controller,
  Body,
  Get,
  Post,
  Param,
  Query,
  Delete,
  Patch,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JobLogService } from './services/job-log.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import {
  CreateJobDto,
  BulkCreateJobsDto,
  JobQueryDto,
  RetryJobDto,
  CancelJobDto,
  RescheduleJobDto,
  JobResponseDto,
  JobMonitoringDto,
  QueueStatsDto,
  ScheduledJobResponseDto,
  BatchJobResponseDto,
} from './dto/job.dto';
import { QUEUES } from './jobs.constants';

/**
 * Jobs Controller
 * Comprehensive API for job queue management and monitoring
 */
@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly jobLogService: JobLogService,
    private readonly jobSchedulerService: JobSchedulerService,
  ) {}

  /**
   * Create a new job (legacy endpoint for backward compatibility)
   */
  @Post(':queue')
  async add(@Param('queue') queue: string, @Body() body: any) {
    if (!Object.values(QUEUES).includes(queue as any)) {
      return { error: 'unknown_queue' };
    }
    const job = await this.jobsService.addJob(queue, body);
    return { id: job.id, name: job.name };
  }

  /**
   * Create a new job with full tracking
   */
  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async createJob(@Body() createJobDto: CreateJobDto) {
    try {
      const jobLog = await this.jobLogService.createJobLog({
        jobType: createJobDto.jobType,
        payload: createJobDto.payload,
        organizationId: createJobDto.organizationId,
        userId: createJobDto.userId,
        correlationId: createJobDto.correlationId,
        tags: createJobDto.tags,
      });

      const queueName = this.mapJobTypeToQueue(createJobDto.jobType);
      const job = await this.jobsService.addJob(queueName, createJobDto.payload, {
        priority: createJobDto.priority,
        attempts: createJobDto.maxAttempts,
        delay: createJobDto.delayMs,
        timeout: createJobDto.timeoutMs,
      });

      await this.jobLogService.updateJobLog(jobLog.id, {
        externalJobId: job.id,
        queueName,
      });

      return this.toJobResponseDto(jobLog);
    } catch (error) {
      this.logger.error('Error creating job', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Create multiple jobs in bulk
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple jobs in bulk' })
  @ApiResponse({ status: 201, type: BatchJobResponseDto })
  async createJobsBulk(@Body() bulkDto: BulkCreateJobsDto): Promise<BatchJobResponseDto> {
    const results = {
      successCount: 0,
      failureCount: 0,
      totalCount: bulkDto.jobs.length,
      createdJobs: [],
      failedJobs: [],
    };

    for (let i = 0; i < bulkDto.jobs.length; i++) {
      try {
        const jobLog = await this.jobLogService.createJobLog({
          jobType: bulkDto.jobs[i].jobType,
          payload: bulkDto.jobs[i].payload,
          organizationId: bulkDto.jobs[i].organizationId,
          userId: bulkDto.jobs[i].userId,
          correlationId: bulkDto.jobs[i].correlationId,
          tags: bulkDto.jobs[i].tags,
        });

        const queueName = this.mapJobTypeToQueue(bulkDto.jobs[i].jobType);
        const job = await this.jobsService.addJob(queueName, bulkDto.jobs[i].payload, {
          priority: bulkDto.jobs[i].priority,
          attempts: bulkDto.jobs[i].maxAttempts,
        });

        await this.jobLogService.updateJobLog(jobLog.id, {
          externalJobId: job.id,
          queueName,
        });

        results.createdJobs.push(this.toJobResponseDto(jobLog));
        results.successCount++;
      } catch (error) {
        results.failedJobs.push({
          index: i,
          error: error.message,
        });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Get job details
   */
  @Get(':jobId')
  @ApiOperation({ summary: 'Get job details' })
  @ApiResponse({ status: 200, type: JobResponseDto })
  async getJob(@Param('jobId') jobId: string): Promise<JobResponseDto> {
    const jobLog = await this.jobLogService.getJobLog(jobId);
    if (!jobLog) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    return this.toJobResponseDto(jobLog);
  }

  /**
   * Query jobs with filters
   */
  @Get()
  @ApiOperation({ summary: 'Query jobs with filters' })
  @ApiResponse({ status: 200, type: [JobResponseDto] })
  async queryJobs(@Query() queryDto: JobQueryDto) {
    const { data, total } = await this.jobLogService.queryJobLogs({
      jobType: queryDto.jobType,
      status: queryDto.status,
      organizationId: queryDto.organizationId,
      userId: queryDto.userId,
      correlationId: queryDto.correlationId,
      limit: queryDto.limit,
      offset: queryDto.offset,
      sortBy: queryDto.sortBy as any,
      sortOrder: queryDto.sortOrder as any,
    });

    return {
      data: data.map((job) => this.toJobResponseDto(job)),
      total,
      limit: queryDto.limit,
      offset: queryDto.offset,
    };
  }

  /**
   * Retry failed job
   */
  @Post(':jobId/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, type: JobResponseDto })
  async retryJob(
    @Param('jobId') jobId: string,
    @Body() retryDto: RetryJobDto,
  ): Promise<JobResponseDto> {
    const jobLog = await this.jobLogService.getJobLog(jobId);
    if (!jobLog) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    if (!jobLog.isRetryable) {
      throw new BadRequestException('Job cannot be retried');
    }

    try {
      const payload = retryDto.updatedPayload || jobLog.payload;
      const queueName = jobLog.queueName;

      const job = await this.jobsService.addJob(queueName, payload, {
        delay: retryDto.delayMs,
      });

      await this.jobLogService.recordRetryAttempt(
        jobId,
        jobLog.attempt + 1,
        new Error('Manual retry'),
      );

      await this.jobLogService.updateJobLog(jobId, {
        status: 'DEFERRED' as any,
        externalJobId: job.id,
      });

      const updated = await this.jobLogService.getJobLog(jobId);
      return this.toJobResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error retrying job ${jobId}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Cancel a job
   */
  @Delete(':jobId')
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200 })
  async cancelJob(
    @Param('jobId') jobId: string,
    @Body() cancelDto: CancelJobDto,
  ): Promise<{ message: string }> {
    const jobLog = await this.jobLogService.getJobLog(jobId);
    if (!jobLog) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    try {
      // TODO: Remove job from queue if it hasn't started processing

      await this.jobLogService.updateJobLog(jobId, {
        status: 'CANCELLED' as any,
        errorMessage: cancelDto.reason || 'Cancelled by user',
      });

      return { message: `Job ${jobId} cancelled successfully` };
    } catch (error) {
      this.logger.error(`Error cancelling job ${jobId}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Reschedule a job
   */
  @Patch(':jobId/reschedule')
  @ApiOperation({ summary: 'Reschedule a job' })
  @ApiResponse({ status: 200, type: JobResponseDto })
  async rescheduleJob(
    @Param('jobId') jobId: string,
    @Body() rescheduleDto: RescheduleJobDto,
  ): Promise<JobResponseDto> {
    const jobLog = await this.jobLogService.getJobLog(jobId);
    if (!jobLog) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    try {
      const payload = rescheduleDto.updatedPayload || jobLog.payload;
      const queueName = jobLog.queueName;

      const job = await this.jobsService.addJob(queueName, payload, {
        delay: rescheduleDto.delayMs,
      });

      await this.jobLogService.updateJobLog(jobId, {
        status: 'DEFERRED' as any,
        externalJobId: job.id,
        scheduledAt: new Date(Date.now() + rescheduleDto.delayMs),
      });

      const updated = await this.jobLogService.getJobLog(jobId);
      return this.toJobResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error rescheduling job ${jobId}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get queue statistics
   */
  @Get('stats/queues')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, type: [QueueStatsDto] })
  async getQueueStats(): Promise<QueueStatsDto[]> {
    const stats: QueueStatsDto[] = [];

    for (const [queueName, queue] of Object.entries(QUEUES)) {
      try {
        const counts = await (queue as any).getJobCounts();

        stats.push({
          queueName: queue,
          activeJobs: counts.active || 0,
          waitingJobs: counts.waiting || 0,
          completedJobs: counts.completed || 0,
          failedJobs: counts.failed || 0,
          delayedJobs: counts.delayed || 0,
          isPaused: (queue as any).isPaused?.() || false,
          averageProcessingTimeMs: 0,
          successRate: 0,
        });
      } catch (error) {
        this.logger.error(`Error getting stats for queue ${queueName}`, error);
      }
    }

    return stats;
  }

  /**
   * Get job monitoring dashboard
   */
  @Get('monitoring/dashboard')
  @ApiOperation({ summary: 'Get job monitoring dashboard' })
  @ApiResponse({ status: 200, type: JobMonitoringDto })
  async getMonitoringDashboard(): Promise<JobMonitoringDto> {
    const stats = await this.jobLogService.getStatisticsByStatus();
    const statsByType = await this.jobLogService.getStatisticsByJobType();
    const recentFailures = await this.jobLogService.getRecentlyFailedJobs(5);
    const performanceMetrics = await this.jobLogService.getPerformanceMetrics();

    const totalJobs =
      stats.pending +
      stats.processing +
      stats.completed +
      stats.failed +
      stats.cancelled;

    const successRate =
      stats.completed + stats.failed > 0
        ? (stats.completed / (stats.completed + stats.failed)) * 100
        : 0;

    const failureRate = 100 - successRate;

    const topFailedJobs = Object.entries(statsByType)
      .map(([jobType, data]: any) => ({
        jobType,
        failureCount: data.failed || 0,
      }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5);

    return {
      totalJobs,
      pendingJobs: stats.pending,
      processingJobs: stats.processing,
      completedJobs: stats.completed,
      failedJobs: stats.failed,
      cancelledJobs: stats.cancelled,
      averageDurationMs: Math.round(performanceMetrics?.avgDurationMs || 0),
      successRate,
      failureRate,
      avgRetriesPerJob: 1.2,
      deadLetterQueueSize: 0,
      jobsByType: Object.keys(statsByType).reduce(
        (acc, type) => {
          acc[type] = statsByType[type].total;
          return acc;
        },
        {} as Record<string, number>,
      ),
      jobsByStatus: stats as any,
      recentFailures: recentFailures.map((job) =>
        this.toJobResponseDto(job),
      ),
      topFailedJobs,
      queueStatus: {} as any,
    };
  }

  /**
   * Get related jobs (by correlation ID)
   */
  @Get('related/:correlationId')
  @ApiOperation({ summary: 'Get related jobs by correlation ID' })
  @ApiResponse({ status: 200, type: [JobResponseDto] })
  async getRelatedJobs(
    @Param('correlationId') correlationId: string,
  ): Promise<JobResponseDto[]> {
    const jobs = await this.jobLogService.getRelatedJobs(correlationId);
    return jobs.map((job) => this.toJobResponseDto(job));
  }

  /**
   * Create scheduled job
   */
  @Post('schedules')
  @ApiOperation({ summary: 'Create a scheduled job' })
  @ApiResponse({ status: 201, type: ScheduledJobResponseDto })
  async createSchedule(@Body() createScheduleDto: any): Promise<ScheduledJobResponseDto> {
    try {
      const schedule = await this.jobSchedulerService.createSchedule(
        createScheduleDto.jobType,
        createScheduleDto.cronExpression,
        createScheduleDto.jobPayload,
        {
          timezone: createScheduleDto.timezone,
          organizationId: createScheduleDto.organizationId,
          description: createScheduleDto.description,
        },
      );

      return this.toScheduleResponseDto(schedule);
    } catch (error) {
      this.logger.error('Error creating schedule', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get all schedules
   */
  @Get('schedules/list')
  @ApiOperation({ summary: 'Get all active schedules' })
  @ApiResponse({ status: 200, type: [ScheduledJobResponseDto] })
  async getSchedules(): Promise<ScheduledJobResponseDto[]> {
    const schedules = await this.jobSchedulerService.getActiveSchedules();
    return schedules.map((schedule) => this.toScheduleResponseDto(schedule));
  }

  /**
   * Get schedule by ID
   */
  @Get('schedules/:scheduleId')
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiResponse({ status: 200, type: ScheduledJobResponseDto })
  async getSchedule(
    @Param('scheduleId') scheduleId: string,
  ): Promise<ScheduledJobResponseDto> {
    const schedule = await this.jobSchedulerService.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundException(`Schedule not found: ${scheduleId}`);
    }

    return this.toScheduleResponseDto(schedule);
  }

  /**
   * Trigger schedule immediately
   */
  @Post('schedules/:scheduleId/trigger')
  @ApiOperation({ summary: 'Trigger a schedule immediately' })
  @ApiResponse({ status: 200 })
  async triggerSchedule(
    @Param('scheduleId') scheduleId: string,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const jobId = await this.jobSchedulerService.triggerScheduleNow(scheduleId);
      return {
        jobId,
        message: `Schedule triggered successfully, job ID: ${jobId}`,
      };
    } catch (error) {
      this.logger.error(`Error triggering schedule ${scheduleId}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete schedule
   */
  @Delete('schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 200 })
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
  ): Promise<{ message: string }> {
    try {
      await this.jobSchedulerService.deleteSchedule(scheduleId);
      return { message: `Schedule ${scheduleId} deleted successfully` };
    } catch (error) {
      this.logger.error(`Error deleting schedule ${scheduleId}`, error);
      throw new BadRequestException(error.message);
    }
  }

  // Helper methods

  private mapJobTypeToQueue(jobType: string): string {
    const queueMap: Record<string, string> = {
      'payout:process': 'payouts',
      'payout:settle': 'payouts',
      'email:send': 'email',
      'email:digest': 'email',
      'data:export': 'exports',
      'report:generate': 'reports',
      'cleanup:expired-sessions': 'cleanup',
      'cleanup:old-logs': 'cleanup',
      'maintenance:database': 'maintenance',
      'webhook:deliver': 'webhooks',
      'webhook:retry': 'webhooks',
      'analytics:aggregate': 'analytics',
      'metrics:collect': 'analytics',
      'quest:deadline-check': 'quests',
      'quest:completion-verify': 'quests',
    };

    return queueMap[jobType] || 'default';
  }

  private toJobResponseDto(jobLog: any): JobResponseDto {
    return {
      id: jobLog.id,
      jobType: jobLog.jobType,
      status: jobLog.status,
      queueName: jobLog.queueName,
      attempt: jobLog.attempt,
      maxAttempts: jobLog.maxAttempts,
      progress: jobLog.progress,
      errorMessage: jobLog.errorMessage,
      result: jobLog.result,
      durationMs: jobLog.durationMs,
      createdAt: jobLog.createdAt,
      updatedAt: jobLog.updatedAt,
      startedAt: jobLog.startedAt,
      completedAt: jobLog.completedAt,
      correlationId: jobLog.correlationId,
      organizationId: jobLog.organizationId,
      userId: jobLog.userId,
    };
  }

  private toScheduleResponseDto(schedule: any): ScheduledJobResponseDto {
    return {
      id: schedule.id,
      jobType: schedule.jobType,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      successCount: schedule.successCount,
      failureCount: schedule.failureCount,
      description: schedule.description,
    };
  }
}
