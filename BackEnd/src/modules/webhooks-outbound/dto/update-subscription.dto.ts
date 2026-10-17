import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionStatus } from '../entities/webhook-subscription.entity';

/**
 * Partial update for an existing subscription. The signing secret is rotated
 * through a dedicated endpoint, not here.
 */
export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'HTTPS URL that signed events are POSTed to',
  })
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  targetUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ enum: WebhookSubscriptionStatus })
  @IsOptional()
  @IsEnum(WebhookSubscriptionStatus)
  status?: WebhookSubscriptionStatus;
}
