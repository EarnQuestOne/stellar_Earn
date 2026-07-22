import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RolloutStrategy, FlagStatus } from '../entities/feature-flag.entity';

export class SegmentRulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  role?: string[];

  @IsOptional()
  @IsObject()
  level?: { min?: number; max?: number };

  @IsOptional()
  @IsObject()
  xp?: { min?: number; max?: number };

  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}

export class CreateFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(RolloutStrategy)
  @IsOptional()
  rolloutStrategy?: RolloutStrategy;

  @IsEnum(FlagStatus)
  @IsOptional()
  status?: FlagStatus;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whitelistedUsers?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blacklistedUsers?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentRulesDto)
  segmentRules?: SegmentRulesDto;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  scheduledActivationAt?: Date;

  @IsOptional()
  scheduledDeactivationAt?: Date;
}
