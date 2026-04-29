import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

export class NotificationResponseItemDto {
  @ApiProperty({
    description: 'Notification unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Quest Completed Successfully',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Congratulations! Your quest submission has been approved.',
  })
  message: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.INFO,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Related entity ID (quest, submission, etc.)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  entityId?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: '{"questTitle": "KYC Verification", "reward": "10 XLM"}',
    required: false,
  })
  metadata?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({
    description: 'Array of notifications',
    type: [NotificationResponseItemDto],
  })
  notifications: NotificationResponseItemDto[];

  @ApiProperty({
    description: 'Total number of notifications',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Number of unread notifications',
    example: 5,
  })
  unreadCount: number;
}

export class MarkAsReadResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated notification',
    type: NotificationResponseItemDto,
  })
  data: NotificationResponseItemDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Notification marked as read',
  })
  message: string;
}

export class MarkAllAsReadResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of notifications marked as read',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Response message',
    example: 'All notifications marked as read',
  })
  message: string;
}

export class UpdatePreferenceResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated preference settings',
    type: 'object',
    example: {
      type: 'QUEST',
      enabledChannels: ['EMAIL', 'IN_APP'],
      enabled: true,
    },
  })
  data: {
    type: string;
    enabledChannels: string[];
    enabled: boolean;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Notification preferences updated',
  })
  message: string;
}

export class NotificationAnalyticsResponseDto {
  @ApiProperty({
    description: 'Total notifications sent',
    example: 150,
  })
  totalSent: number;

  @ApiProperty({
    description: 'Total notifications delivered',
    example: 145,
  })
  totalDelivered: number;

  @ApiProperty({
    description: 'Total notifications opened',
    example: 80,
  })
  totalOpened: number;

  @ApiProperty({
    description: 'Delivery rate percentage',
    example: 96.67,
  })
  deliveryRate: number;

  @ApiProperty({
    description: 'Open rate percentage',
    example: 55.17,
  })
  openRate: number;

  @ApiProperty({
    description: 'Notifications by type',
    type: 'object',
    example: {
      INFO: 50,
      SUCCESS: 40,
      WARNING: 30,
      ERROR: 20,
      QUEST: 10,
    },
  })
  notificationsByType: Record<string, number>;

  @ApiProperty({
    description: 'Notifications by channel',
    type: 'object',
    example: {
      EMAIL: 80,
      IN_APP: 50,
      PUSH: 20,
    },
  })
  notificationsByChannel: Record<string, number>;

  @ApiProperty({
    description: 'Analytics period start',
    example: '2026-01-01T00:00:00.000Z',
  })
  periodStart: Date;

  @ApiProperty({
    description: 'Analytics period end',
    example: '2026-01-31T23:59:59.000Z',
  })
  periodEnd: Date;
}
