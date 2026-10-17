import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload to register a new outbound webhook subscription.
 *
 * If `secret` is omitted the service generates a cryptographically random one;
 * the plaintext secret is returned exactly once (on create/rotate) and stored
 * only in encrypted form thereafter.
 */
export class CreateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Human-friendly label', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'HTTPS URL that signed events are POSTed to' })
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  targetUrl: string;

  @ApiProperty({
    description: 'Event types to subscribe to',
    example: ['quest.created', 'submission.approved', 'payout.completed'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventTypes: string[];

  @ApiPropertyOptional({
    description: 'Signing secret; generated automatically when omitted',
    minLength: 16,
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;
}
