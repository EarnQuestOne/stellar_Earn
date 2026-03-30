import { IsEnum, IsOptional, IsString, IsNumber, IsObject, IsArray, ValidateNested, Type } from 'class-validator';
import { JobType, JobPriority, JobStatus } from '../job.types';

/**
 * DTO for creating a new job
 */
export class CreateJobDto {
  @IsEnum(JobType)
  jobType: JobType;

  @IsObject()
  payload: Record<string, any>;

  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority = JobPriority.MEDIUM;

  @IsNumber()
  @IsOptional()
  maxAttempts?: number = 5;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  parentJobId?: string; // For dependent jobs

  @IsNumber()
  @IsOptional()
  delayMs?: number; // Delay before processing

  @IsNumber()
  @IsOptional()
  timeoutMs?: number; // Max execution time
}

/**
 * DTO for bulk job creation
 */
export class BulkCreateJobsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobDto)
  jobs: CreateJobDto[];
}

/**
 * DTO for job query/filter
 */
export class JobQueryDto {
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO for job retry request
 */
export class RetryJobDto {
  @IsString()
  jobId: string;

  @IsOptional()
  @IsNumber()
  delayMs?: number;

  @IsOptional()
  @IsObject()
  updatedPayload?: Record<string, any>;
}

/**
 * DTO for job cancellation
 */
export class CancelJobDto {
  @IsString()
  jobId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for job rescheduling
 */
export class RescheduleJobDto {
  @IsString()
  jobId: string;

  @IsNumber()
  delayMs: number;

  @IsOptional()
  @IsObject()
  updatedPayload?: Record<string, any>;
}

/**
 * Response DTO for job operations
 */
export class JobResponseDto {
  id: string;
  jobType: JobType;
  status: JobStatus;
  queueName: string;
  attempt: number;
  maxAttempts: number;
  progress: number;
  errorMessage?: string;
  result?: Record<string, any>;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  correlationId?: string;
  organizationId?: string;
  userId?: string;
}

/**
 * Response DTO for job monitoring dashboard
 */
export class JobMonitoringDto {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageDurationMs: number;
  successRate: number; // Percentage
  failureRate: number; // Percentage
  avgRetriesPerJob: number;
  deadLetterQueueSize: number;
  jobsByType: Record<string, number>;
  jobsByStatus: Record<string, number>;
  recentFailures: JobResponseDto[];
  topFailedJobs: Array<{ jobType: JobType; failureCount: number }>;
  queueStatus: Record<string, { size: number; isPaused: boolean }>;
}

/**
 * Response DTO for queue statistics
 */
export class QueueStatsDto {
  queueName: string;
  activeJobs: number;
  waitingJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  isPaused: boolean;
  averageProcessingTimeMs: number;
  successRate: number;
}

/**
 * Response DTO for scheduled jobs
 */
export class ScheduledJobResponseDto {
  id: string;
  jobType: JobType;
  cronExpression: string;
  timezone?: string;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  successCount: number;
  failureCount: number;
  description?: string;
}

/**
 * Response DTO for job dependencies
 */
export class JobDependencyResponseDto {
  id: string;
  parentJobId: string;
  childJobId: string;
  status: JobStatus;
  executionOrder: number;
  blockOnFailure: boolean;
}

/**
 * Response DTO for job retry history
 */
export class JobRetryHistoryDto {
  jobId: string;
  totalAttempts: number;
  retries: Array<{
    attemptNumber: number;
    status: JobStatus;
    durationMs: number;
    errorMessage?: string;
    createdAt: Date;
  }>;
}

/**
 * Response DTO for batch job creation
 */
export class BatchJobResponseDto {
  successCount: number;
  failureCount: number;
  totalCount: number;
  createdJobs: JobResponseDto[];
  failedJobs: Array<{
    index: number;
    error: string;
  }>;
}
