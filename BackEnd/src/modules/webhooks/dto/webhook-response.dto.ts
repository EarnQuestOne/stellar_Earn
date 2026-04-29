import { ApiProperty } from '@nestjs/swagger';

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
