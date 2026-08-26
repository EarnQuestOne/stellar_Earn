import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OUTBOUND_WEBHOOK_EVENTS,
  OutboundWebhookEvent,
} from '../webhooks-outbound.constants';
import { WebhookDeliveryStatus } from '../entities/webhook-delivery.entity';

export class CreateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Human-readable consumer label' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: OUTBOUND_WEBHOOK_EVENTS,
    description: 'Domain event type to subscribe to',
  })
  @IsEnum(OUTBOUND_WEBHOOK_EVENTS)
  eventType: OutboundWebhookEvent;

  @ApiProperty({ description: 'Callback URL receiving signed POST deliveries' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  targetUrl: string;

  @ApiPropertyOptional({
    description:
      'Optional signing secret (min 16 chars). If omitted, a secure secret is generated.',
    minLength: 16,
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  secret?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Human-readable consumer label' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Callback URL receiving deliveries' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  targetUrl?: string;

  @ApiPropertyOptional({
    description: 'Rotate the signing secret (min 16 chars)',
    minLength: 16,
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  secret?: string;

  @ApiPropertyOptional({ description: 'Pause or resume deliveries' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() name: string | null;
  @ApiProperty({ enum: OUTBOUND_WEBHOOK_EVENTS }) eventType: string;
  @ApiProperty() targetUrl: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class DeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() subscriptionId: string;
  @ApiProperty() eventType: string;
  @ApiProperty() eventId: string;
  @ApiProperty({ enum: WebhookDeliveryStatus }) status: WebhookDeliveryStatus;
  @ApiProperty() attemptCount: number;
  @ApiProperty() maxAttempts: number;
  @ApiPropertyOptional() responseCode: number | null;
  @ApiPropertyOptional() errorMessage: string | null;
  @ApiPropertyOptional() nextRetryAt: Date | null;
  @ApiPropertyOptional() lastAttemptAt: Date | null;
  @ApiProperty() createdAt: Date;
}
