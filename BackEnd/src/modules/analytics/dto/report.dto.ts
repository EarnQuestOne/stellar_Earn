import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsObject, IsString, IsDateString, IsArray, IsUUID, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType, ReportFormat, ReportStatus } from '../entities/analytics-report.entity';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

export class ReportGenerationDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Format of the report',
    enum: ReportFormat,
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({
    description: 'Report-specific parameters',
    required: false,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiProperty({
    description: 'Filters to apply to the report',
    required: false,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty({
    description: 'Start date for the report (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the report (YYYY-MM-DD)',
  })
  @IsDateString()
  endDate: string;
}

export class ReportQueryDto {
  @ApiProperty({
    description: 'Filter by report type',
    enum: ReportType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiProperty({
    description: 'Filter by report status',
    enum: ReportStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiProperty({
    description: 'Filter by user who generated the report',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  generatedBy?: string;

  @ApiProperty({
    description: 'Filter reports created after this date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Filter reports created before this date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Maximum number of reports to return',
    required: false,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Number of reports to skip',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class AggregationOptionsDto {
  @ApiProperty({
    description: 'Start date for aggregation (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for aggregation (YYYY-MM-DD)',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Granularity of aggregation',
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily',
  })
  @IsOptional()
  @IsString()
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @ApiProperty({
    description: 'Organization ID to filter by',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class BatchAggregationDto extends AggregationOptionsDto {
  @ApiProperty({
    description: 'Types of analytics to aggregate',
    enum: ['platform', 'quest', 'user'],
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiProperty({
    description: 'Include historical data aggregation',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;
}