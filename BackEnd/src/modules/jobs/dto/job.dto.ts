import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Job unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Type of job',
    enum: JobType,
    example: JobType.PAYOUT_PROCESS,
  })
  jobType: JobType;

  @ApiProperty({
    description: 'Current job status',
    enum: JobStatus,
    example: JobStatus.COMPLETED,
  })
  status: JobStatus;

  @ApiProperty({
    description: 'Queue name where job is processed',
    example: 'payouts',
  })
  queueName: string;

  @ApiProperty({
    description: 'Current attempt number',
    example: 1,
  })
  attempt: number;

  @ApiProperty({
    description: 'Maximum allowed attempts',
    example: 5,
  })
  maxAttempts: number;

  @ApiProperty({
    description: 'Job progress percentage (0-100)',
    example: 100,
  })
  progress: number;

  @ApiProperty({
    description: 'Error message if job failed',
    example: 'Insufficient funds',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Job result data',
    type: 'object',
    required: false,
  })
  result?: Record<string, any>;

  @ApiProperty({
    description: 'Job execution duration in milliseconds',
    example: 1500,
    required: false,
  })
  durationMs?: number;

  @ApiProperty({
    description: 'Job creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-23T12:34:57.500Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Job start timestamp',
    example: '2026-01-23T12:34:56.100Z',
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'Job completion timestamp',
    example: '2026-01-23T12:34:57.500Z',
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Correlation ID for related jobs',
    example: 'corr_123456',
    required: false,
  })
  correlationId?: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_123',
    required: false,
  })
  organizationId?: string;

  @ApiProperty({
    description: 'User ID who created the job',
    example: 'user_456',
    required: false,
  })
  userId?: string;
}

/**
 * Response DTO for job monitoring dashboard
 */
export class JobMonitoringDto {
  @ApiProperty({
    description: 'Total number of jobs',
    example: 1000,
  })
  totalJobs: number;

  @ApiProperty({
    description: 'Number of pending jobs',
    example: 50,
  })
  pendingJobs: number;

  @ApiProperty({
    description: 'Number of jobs currently processing',
    example: 10,
  })
  processingJobs: number;

  @ApiProperty({
    description: 'Number of completed jobs',
    example: 900,
  })
  completedJobs: number;

  @ApiProperty({
    description: 'Number of failed jobs',
    example: 30,
  })
  failedJobs: number;

  @ApiProperty({
    description: 'Number of cancelled jobs',
    example: 10,
  })
  cancelledJobs: number;

  @ApiProperty({
    description: 'Average job duration in milliseconds',
    example: 2500,
  })
  averageDurationMs: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 96.77,
  })
  successRate: number;

  @ApiProperty({
    description: 'Failure rate percentage',
    example: 3.23,
  })
  failureRate: number;

  @ApiProperty({
    description: 'Average number of retries per job',
    example: 1.2,
  })
  avgRetriesPerJob: number;

  @ApiProperty({
    description: 'Number of jobs in dead letter queue',
    example: 5,
  })
  deadLetterQueueSize: number;

  @ApiProperty({
    description: 'Jobs grouped by type',
    type: 'object',
    example: { 'payout:process': 500, 'email:send': 300 },
  })
  jobsByType: Record<string, number>;

  @ApiProperty({
    description: 'Jobs grouped by status',
    type: 'object',
    example: { pending: 50, processing: 10, completed: 900 },
  })
  jobsByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Recent failed jobs',
    type: [JobResponseDto],
  })
  recentFailures: JobResponseDto[];

  @ApiProperty({
    description: 'Top failed job types',
    type: 'array',
    example: [{ jobType: JobType.PAYOUT_PROCESS, failureCount: 15 }],
  })
  topFailedJobs: Array<{ jobType: JobType; failureCount: number }>;

  @ApiProperty({
    description: 'Queue status information',
    type: 'object',
  })
  queueStatus: Record<string, { size: number; isPaused: boolean }>;
}

/**
 * Response DTO for queue statistics
 */
export class QueueStatsDto {
  @ApiProperty({
    description: 'Queue name',
    example: 'payouts',
  })
  queueName: string;

  @ApiProperty({
    description: 'Number of active jobs being processed',
    example: 5,
  })
  activeJobs: number;

  @ApiProperty({
    description: 'Number of jobs waiting to be processed',
    example: 25,
  })
  waitingJobs: number;

  @ApiProperty({
    description: 'Number of completed jobs',
    example: 500,
  })
  completedJobs: number;

  @ApiProperty({
    description: 'Number of failed jobs',
    example: 10,
  })
  failedJobs: number;

  @ApiProperty({
    description: 'Number of delayed jobs',
    example: 3,
  })
  delayedJobs: number;

  @ApiProperty({
    description: 'Whether the queue is paused',
    example: false,
  })
  isPaused: boolean;

  @ApiProperty({
    description: 'Average processing time in milliseconds',
    example: 2000,
  })
  averageProcessingTimeMs: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 98.04,
  })
  successRate: number;
}

/**
 * Response DTO for scheduled jobs
 */
export class ScheduledJobResponseDto {
  @ApiProperty({
    description: 'Schedule unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Type of job to run',
    enum: JobType,
    example: JobType.EMAIL_DIGEST,
  })
  jobType: JobType;

  @ApiProperty({
    description: 'Cron expression for schedule',
    example: '0 0 * * *',
  })
  cronExpression: string;

  @ApiProperty({
    description: 'Timezone for schedule',
    example: 'UTC',
    required: false,
  })
  timezone?: string;

  @ApiProperty({
    description: 'Whether the schedule is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Last run timestamp',
    example: '2026-01-23T00:00:00.000Z',
    required: false,
  })
  lastRunAt?: Date;

  @ApiProperty({
    description: 'Next scheduled run timestamp',
    example: '2026-01-24T00:00:00.000Z',
    required: false,
  })
  nextRunAt?: Date;

  @ApiProperty({
    description: 'Number of successful runs',
    example: 150,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed runs',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Schedule description',
    example: 'Daily email digest at midnight',
    required: false,
  })
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
  @ApiProperty({
    description: 'Number of successfully created jobs',
    example: 95,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed job creations',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Total number of jobs in batch',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Array of successfully created jobs',
    type: [JobResponseDto],
  })
  createdJobs: JobResponseDto[];

  @ApiProperty({
    description: 'Array of failed job creation attempts',
    type: 'array',
    example: [{ index: 3, error: 'Invalid payload' }],
  })
  failedJobs: Array<{
    index: number;
    error: string;
  }>;
}
