import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from 'cron';
import { JobType, JobPriority } from './job.types';
import { JobSchedule } from './entities/job-log.entity';
import { JobsService } from './jobs.service';

/**
 * Job Scheduler Service
 * Manages recurring/scheduled job execution using cron expressions
 * Supports timezone-aware scheduling and automatic retry on failure
 */
@Injectable()
export class JobSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private cronJobs: Map<string, CronJob> = new Map();
  private schedulerInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(JobSchedule)
    private readonly jobScheduleRepository: Repository<JobSchedule>,
    private readonly jobsService: JobsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Job Scheduler Service');
    await this.loadScheduledJobs();
    // Re-check for new schedules every 60 seconds
    this.schedulerInterval = setInterval(() => this.syncScheduledJobs(), 60000);
  }

  async onModuleDestroy() {
    this.stopAllSchedules();
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
  }

  /**
   * Load all active scheduled jobs from database
   */
  async loadScheduledJobs(): Promise<void> {
    try {
      const schedules = await this.jobScheduleRepository.find({
        where: { isActive: true },
      });

      for (const schedule of schedules) {
        await this.startSchedule(schedule);
      }

      this.logger.log(`Loaded ${schedules.length} scheduled jobs`);
    } catch (error) {
      this.logger.error('Error loading scheduled jobs', error);
    }
  }

  /**
   * Sync scheduled jobs - add new ones, remove deleted ones
   */
  async syncScheduledJobs(): Promise<void> {
    try {
      const dbSchedules = await this.jobScheduleRepository.find({
        where: { isActive: true },
      });

      const dbScheduleIds = new Set(dbSchedules.map((s) => s.id));
      const activeScheduleIds = new Set(this.cronJobs.keys());

      // Remove schedules that were disabled
      for (const id of activeScheduleIds) {
        if (!dbScheduleIds.has(id)) {
          this.stopSchedule(id);
        }
      }

      // Add new schedules
      for (const schedule of dbSchedules) {
        if (!activeScheduleIds.has(schedule.id)) {
          await this.startSchedule(schedule);
        }
      }
    } catch (error) {
      this.logger.error('Error syncing scheduled jobs', error);
    }
  }

  /**
   * Create a new scheduled job
   */
  async createSchedule(
    jobType: JobType,
    cronExpression: string,
    jobPayload: Record<string, any>,
    options?: {
      timezone?: string;
      organizationId?: string;
      description?: string;
    },
  ): Promise<JobSchedule> {
    // Validate cron expression
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const schedule = this.jobScheduleRepository.create({
      jobType,
      cronExpression,
      jobPayload,
      timezone: options?.timezone || 'UTC',
      organizationId: options?.organizationId,
      description: options?.description,
      isActive: true,
      nextRunAt: this.getNextRunTime(cronExpression, options?.timezone),
    });

    const saved = await this.jobScheduleRepository.save(schedule);
    await this.startSchedule(saved);

    this.logger.log(`Created scheduled job: ${saved.id} for ${jobType}`);
    return saved;
  }

  /**
   * Update a scheduled job
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<JobSchedule>,
  ): Promise<JobSchedule> {
    const schedule = await this.jobScheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Stop existing schedule if updating cron expression
    if (updates.cronExpression && updates.cronExpression !== schedule.cronExpression) {
      this.stopSchedule(scheduleId);
    }

    Object.assign(schedule, updates);
    schedule.nextRunAt = this.getNextRunTime(schedule.cronExpression, schedule.timezone);

    const updated = await this.jobScheduleRepository.save(schedule);

    if (updated.isActive) {
      await this.startSchedule(updated);
    }

    this.logger.log(`Updated scheduled job: ${scheduleId}`);
    return updated;
  }

  /**
   * Disable a scheduled job
   */
  async disableSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.jobScheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    schedule.isActive = false;
    schedule.disabledAt = new Date();
    await this.jobScheduleRepository.save(schedule);

    this.stopSchedule(scheduleId);
    this.logger.log(`Disabled scheduled job: ${scheduleId}`);
  }

  /**
   * Enable a scheduled job
   */
  async enableSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.jobScheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    schedule.isActive = true;
    schedule.disabledAt = null;
    schedule.nextRunAt = this.getNextRunTime(schedule.cronExpression, schedule.timezone);
    await this.jobScheduleRepository.save(schedule);

    await this.startSchedule(schedule);
    this.logger.log(`Enabled scheduled job: ${scheduleId}`);
  }

  /**
   * Get all active schedules
   */
  async getActiveSchedules(): Promise<JobSchedule[]> {
    return this.jobScheduleRepository.find({
      where: { isActive: true },
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(scheduleId: string): Promise<JobSchedule | null> {
    return this.jobScheduleRepository.findOne({
      where: { id: scheduleId },
    });
  }

  /**
   * Get schedules by job type
   */
  async getSchedulesByType(jobType: JobType): Promise<JobSchedule[]> {
    return this.jobScheduleRepository.find({
      where: { jobType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a scheduled job
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    this.stopSchedule(scheduleId);
    await this.jobScheduleRepository.delete(scheduleId);
    this.logger.log(`Deleted scheduled job: ${scheduleId}`);
  }

  /**
   * Manually trigger a scheduled job
   */
  async triggerScheduleNow(scheduleId: string): Promise<string> {
    const schedule = await this.jobScheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const job = await this.jobsService.addJob(
      this.mapJobTypeToQueue(schedule.jobType),
      schedule.jobPayload,
      {
        priority: JobPriority.HIGH,
        jobId: `${scheduleId}:manual-trigger:${Date.now()}`,
      },
    );

    this.logger.log(
      `Manually triggered schedule ${scheduleId}, created job ${job.id}`,
    );
    return job.id;
  }

  /**
   * Get statistics for all schedules
   */
  async getScheduleStats(): Promise<any> {
    const schedules = await this.jobScheduleRepository.find();

    return {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter((s) => s.isActive).length,
      disabledSchedules: schedules.filter((s) => !s.isActive).length,
      totalSuccessfulRuns: schedules.reduce((sum, s) => sum + s.successCount, 0),
      totalFailedRuns: schedules.reduce((sum, s) => sum + s.failureCount, 0),
      successRate:
        schedules.length > 0
          ? (schedules.reduce((sum, s) => sum + s.successCount, 0) /
              (schedules.reduce((sum, s) => sum + s.successCount + s.failureCount, 0) ||
                1)) *
            100
          : 0,
      nextScheduledJobs: schedules
        .filter((s) => s.isActive && s.nextRunAt)
        .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
        .slice(0, 10),
    };
  }

  // Private helper methods

  /**
   * Start a scheduled job
   */
  private async startSchedule(schedule: JobSchedule): Promise<void> {
    try {
      if (this.cronJobs.has(schedule.id)) {
        return; // Already running
      }

      const cronJob = new CronJob(
        schedule.cronExpression,
        async () => {
          try {
            schedule.lastRunAt = new Date();

            const job = await this.jobsService.addJob(
              this.mapJobTypeToQueue(schedule.jobType),
              schedule.jobPayload,
              {
                priority: JobPriority.MEDIUM,
                jobId: `${schedule.id}:${Date.now()}`,
              },
            );

            schedule.successCount++;
            schedule.lastErrorMessage = null;

            this.logger.debug(
              `Scheduled job ${schedule.id} executed, created job ${job.id}`,
            );
          } catch (error) {
            schedule.failureCount++;
            schedule.lastErrorMessage = error.message;
            this.logger.error(
              `Error executing scheduled job ${schedule.id}: ${error.message}`,
              error.stack,
            );
          }

          schedule.nextRunAt = this.getNextRunTime(
            schedule.cronExpression,
            schedule.timezone,
          );
          await this.jobScheduleRepository.save(schedule);
        },
        null, // onComplete callback
        true, // start immediately
        schedule.timezone || 'UTC',
      );

      this.cronJobs.set(schedule.id, cronJob);
      this.logger.log(
        `Started schedule ${schedule.id} with expression: ${schedule.cronExpression}`,
      );
    } catch (error) {
      this.logger.error(
        `Error starting schedule ${schedule.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Stop a scheduled job
   */
  private stopSchedule(scheduleId: string): void {
    const cronJob = this.cronJobs.get(scheduleId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(scheduleId);
      this.logger.log(`Stopped schedule ${scheduleId}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  private stopAllSchedules(): void {
    for (const [id, cronJob] of this.cronJobs.entries()) {
      cronJob.stop();
    }
    this.cronJobs.clear();
    this.logger.log('Stopped all schedules');
  }

  /**
   * Validate cron expression
   */
  private isValidCronExpression(expression: string): boolean {
    try {
      new CronJob(expression);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cronExpression: string, timezone?: string): Date {
    try {
      const job = new CronJob(cronExpression, () => {}, null, false, timezone || 'UTC');
      return job.nextDate().toDate();
    } catch {
      return null;
    }
  }

  /**
   * Map job type to queue name
   */
  private mapJobTypeToQueue(jobType: JobType): string {
    const queueMap: Record<JobType, string> = {
      [JobType.PAYOUT_PROCESS]: 'payouts',
      [JobType.PAYOUT_SETTLE]: 'payouts',
      [JobType.EMAIL_SEND]: 'email',
      [JobType.EMAIL_DIGEST]: 'email',
      [JobType.DATA_EXPORT]: 'exports',
      [JobType.REPORT_GENERATE]: 'reports',
      [JobType.CLEANUP_EXPIRED_SESSIONS]: 'cleanup',
      [JobType.CLEANUP_OLD_LOGS]: 'cleanup',
      [JobType.DATABASE_MAINTENANCE]: 'maintenance',
      [JobType.WEBHOOK_DELIVER]: 'webhooks',
      [JobType.WEBHOOK_RETRY]: 'webhooks',
      [JobType.ANALYTICS_AGGREGATE]: 'analytics',
      [JobType.METRICS_COLLECT]: 'analytics',
      [JobType.QUEST_DEADLINE_CHECK]: 'quests',
      [JobType.QUEST_COMPLETION_VERIFY]: 'quests',
    };
    return queueMap[jobType] || 'default';
  }
}
