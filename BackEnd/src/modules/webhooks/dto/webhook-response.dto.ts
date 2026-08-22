import { ApiProperty } from '@nestjs/swagger';
import { FailedWebhookStatus } from '../entities/failed-webhook-event.entity';

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Webhook processed successfully',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Webhook event ID',
    example: 'evt_1700000000_abc123',
    required: false,
  })
  eventId?: string;

  @ApiProperty({
    description: 'Processing status',
    example: 'processed',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Error details if processing failed',
    example: 'Invalid signature',
    required: false,
  })
  error?: string;
}

export class WebhookHealthResponseDto {
  @ApiProperty({
    description: 'Service health status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Webhook service version',
    example: '1.0.0',
    required: false,
  })
  version?: string;

  @ApiProperty({
    description: 'Number of webhooks processed in last hour',
    example: 150,
    required: false,
  })
  webhooksProcessedLastHour?: number;

  @ApiProperty({
    description: 'Number of failed webhooks in last hour',
    example: 2,
    required: false,
  })
  webhooksFailedLastHour?: number;
}

export class WebhookEventResponseDto {
  @ApiProperty({
    description: 'Event unique identifier',
    example: 'evt_1700000000_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Event type',
    example: 'push',
  })
  type: string;

  @ApiProperty({
    description: 'Event source (github, api, etc.)',
    example: 'github',
  })
  source: string;

  @ApiProperty({
    description: 'Event payload',
    type: 'object',
    additionalProperties: true,
  })
  payload: any;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Processing status',
    example: 'processed',
  })
  status: string;

  @ApiProperty({
    description: 'Processing error if failed',
    example: 'Invalid signature',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Event creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;
}

export class FailedWebhookEventResponseDto {
  @ApiProperty({ description: 'Failed-webhook record ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Original webhook event/delivery ID' })
  eventId: string;

  @ApiProperty({ description: 'Event type', example: 'push' })
  type: string;

  @ApiProperty({
    description: 'Event source (github, api, etc.)',
    example: 'github',
  })
  source: string;

  @ApiProperty({ description: 'Most recent failure reason' })
  failureReason: string;

  @ApiProperty({
    description: 'Number of processing attempts made so far',
    example: 2,
  })
  attempts: number;

  @ApiProperty({ description: 'Maximum attempts before dead-lettering' })
  maxAttempts: number;

  @ApiProperty({
    enum: FailedWebhookStatus,
    description: 'Current retry lifecycle status',
  })
  status: FailedWebhookStatus;

  @ApiProperty({
    description: 'When the next automatic retry is scheduled, if any',
    required: false,
    nullable: true,
  })
  nextRetryAt: Date | null;

  @ApiProperty({ description: 'When the record was first created' })
  createdAt: Date;
}

export class RetryWebhookResponseDto {
  @ApiProperty({ description: 'Whether the retry succeeded' })
  success: boolean;

  @ApiProperty({ description: 'The original webhook event ID' })
  eventId: string;
}
