import { ApiProperty } from '@nestjs/swagger';

export class ModerationScanResultDto {
  @ApiProperty({
    description: 'Classification result (SAFE, NEEDS_REVIEW, FLAGGED)',
    example: 'SAFE',
  })
  classification: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: 'Detected keywords',
    type: [String],
    example: ['spam', 'suspicious'],
    required: false,
  })
  keywords?: string[];

  @ApiProperty({
    description: 'Reason for flagging',
    example: 'Contains prohibited language',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Language detected',
    example: 'en',
    required: false,
  })
  language?: string;
}

export class ModerationScanResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Scan result',
    type: ModerationScanResultDto,
  })
  data: ModerationScanResultDto;
}

export class ModerationItemDto {
  @ApiProperty({
    description: 'Item unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Item type (quest, submission, comment, etc.)',
    example: 'submission',
  })
  itemType: string;

  @ApiProperty({
    description: 'Item ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  itemId: string;

  @ApiProperty({
    description: 'Content text',
    example: 'This is the content to moderate',
  })
  content: string;

  @ApiProperty({
    description: 'Current status',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Classification result',
    example: 'NEEDS_REVIEW',
    required: false,
  })
  classification?: string;

  @ApiProperty({
    description: 'Confidence score',
    example: 0.75,
    required: false,
  })
  confidence?: number;

  @ApiProperty({
    description: 'User ID who created the item',
    example: '789e0123-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;
}

export class ModerationDashboardResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of pending moderation items',
    type: [ModerationItemDto],
  })
  data: ModerationItemDto[];

  @ApiProperty({
    description: 'Total number of pending items',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;
}

export class ModerationStatsResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Moderation statistics',
    type: 'object',
    example: {
      pending: 15,
      approved: 150,
      rejected: 30,
      flagged: 5,
      totalReviewed: 180,
      averageReviewTime: 300,
    },
  })
  data: {
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
    totalReviewed: number;
    averageReviewTime: number;
  };
}

export class ModerationActionResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated moderation item',
    type: ModerationItemDto,
  })
  data: {
    item: ModerationItemDto;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Moderation action applied successfully',
  })
  message: string;
}

export class AppealDto {
  @ApiProperty({
    description: 'Appeal unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Moderation item ID being appealed',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  moderationItemId: string;

  @ApiProperty({
    description: 'User ID who submitted the appeal',
    example: '789e0123-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Appeal message',
    example: 'I believe this was flagged incorrectly because...',
  })
  message: string;

  @ApiProperty({
    description: 'Appeal status',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Resolution',
    example: 'APPROVED',
    required: false,
  })
  resolution?: string;

  @ApiProperty({
    description: 'Resolution note from moderator',
    example: 'After review, the content is appropriate',
    required: false,
  })
  resolutionNote?: string;

  @ApiProperty({
    description: 'Moderator ID who resolved the appeal',
    example: '012e3456-e89b-12d3-a456-426614174000',
    required: false,
  })
  resolvedBy?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Resolution timestamp',
    example: '2026-01-24T08:00:00.000Z',
    required: false,
  })
  resolvedAt?: Date;
}

export class CreateAppealResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Created appeal',
    type: AppealDto,
  })
  data: {
    appeal: AppealDto;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Appeal submitted successfully',
  })
  message: string;
}

export class AppealsListResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of pending appeals',
    type: [AppealDto],
  })
  data: AppealDto[];

  @ApiProperty({
    description: 'Total number of appeals',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;
}

export class ResolveAppealResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Resolved appeal',
    type: AppealDto,
  })
  data: {
    appeal: AppealDto;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Appeal resolved successfully',
  })
  message: string;
}
