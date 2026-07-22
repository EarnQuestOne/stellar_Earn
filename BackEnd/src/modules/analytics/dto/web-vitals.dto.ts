import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum WebVitalMetricName {
  CLS = 'CLS',
  FCP = 'FCP',
  LCP = 'LCP',
  INP = 'INP',
  TTFB = 'TTFB',
  FID = 'FID',
}

export enum WebVitalMetricRating {
  GOOD = 'good',
  NEEDS_IMPROVEMENT = 'needs-improvement',
  POOR = 'poor',
}

export class WebVitalsDto {
  @IsEnum(WebVitalMetricName)
  @ApiProperty({
    description: 'Web Vitals metric name.',
    enum: WebVitalMetricName,
    example: WebVitalMetricName.LCP,
  })
  name: WebVitalMetricName;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'Measured value for the metric.',
    example: 1250,
  })
  value: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Unique metric ID from the web-vitals library.',
    example: 'v1-12345',
  })
  id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    description: 'Delta value for derived metrics such as CLS or INP.',
    example: 0.1,
  })
  delta?: number;

  @IsOptional()
  @IsEnum(WebVitalMetricRating)
  @ApiPropertyOptional({
    description: 'Performance rating for the metric.',
    enum: WebVitalMetricRating,
    example: WebVitalMetricRating.GOOD,
  })
  rating?: WebVitalMetricRating;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'URL of the page where the metric was recorded.',
    example: 'https://app.stellarEarn.com/dashboard',
  })
  href?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Additional metric details and entries.',
    example: {
      navigationType: 'reload',
      entries: [],
    },
  })
  extra?: Record<string, any>;
}
