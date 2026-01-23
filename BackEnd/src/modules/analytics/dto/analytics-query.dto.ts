import { IsOptional, IsDateString, IsEnum, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Granularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Start date for analytics query (ISO 8601 format)',
    example: '2024-01-01',
    required: false,
  })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'End date for analytics query (ISO 8601 format)',
    example: '2024-12-31',
    required: false,
  })
  endDate?: string;

  @IsOptional()
  @IsEnum(Granularity)
  @ApiProperty({
    description: 'Time granularity for time-series data',
    enum: Granularity,
    default: Granularity.DAY,
    required: false,
  })
  granularity?: Granularity = Granularity.DAY;
}

export class QuestAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Filter by quest status',
    example: 'Active',
    required: false,
  })
  status?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Filter by specific quest ID',
    example: 'abc-123-def',
    required: false,
  })
  questId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty({
    description: 'Number of results per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['submissions', 'approval_rate', 'completion_time', 'created_at'])
  @ApiProperty({
    description: 'Sort results by field',
    enum: ['submissions', 'approval_rate', 'completion_time', 'created_at'],
    default: 'created_at',
    required: false,
  })
  sortBy?: string = 'created_at';
}

export class UserAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Filter by specific user Stellar address',
    example: 'GXXXXXX...',
    required: false,
  })
  stellarAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty({
    description: 'Number of results per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['xp', 'quests_completed', 'total_rewards', 'created_at'])
  @ApiProperty({
    description: 'Sort results by field',
    enum: ['xp', 'quests_completed', 'total_rewards', 'created_at'],
    default: 'xp',
    required: false,
  })
  sortBy?: string = 'xp';
}
