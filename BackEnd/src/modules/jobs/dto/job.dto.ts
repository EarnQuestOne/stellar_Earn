import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new job
 */
export class CreateJobDto {
  @IsString()
  jobType: string;

  @IsObject()
  payload: Record<string, any>;

  @IsNumber()
  @IsOptional()
  maxAttempts?: number = 5;
}

/**
 * Response DTO for job operations
 */
export class JobResponseDto {
  @ApiProperty({ description: 'Job unique identifier' })
  id: string;

  @ApiProperty({ description: 'Type of job' })
  jobType: string;

  @ApiProperty({ description: 'Current job status' })
  status: string;

  @ApiProperty({ description: 'Queue name where job is processed' })
  queueName: string;
}

/**
 * Response DTO for job monitoring dashboard
 */
export class JobMonitoringDto {
  @ApiProperty({ description: 'Total number of jobs' })
  totalJobs: number;

  @ApiProperty({ description: 'Number of pending jobs' })
  pendingJobs: number;

  @ApiProperty({ description: 'Number of jobs currently processing' })
  processingJobs: number;

  @ApiProperty({ description: 'Number of completed jobs' })
  completedJobs: number;
}
