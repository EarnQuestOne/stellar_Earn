import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CursorPaginationDto, PaginatedResponseDto } from '../../../common/dto/pagination.dto';

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PayoutType {
  QUEST_REWARD = 'QUEST_REWARD',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
}

/**
 * Query DTO for listing payouts.
 * Replaces the old offset/page approach with cursor-based pagination.
 * `cursor` and `limit` are inherited from CursorPaginationDto.
 *
 * NOTE: The old `page` field has been removed. Consumers must migrate to
 * cursor-based pagination.
 */
export class PayoutQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by Stellar address (Admin use)',
    example: 'GABC...XYZ',
  })
  @IsOptional()
  @IsString()
  stellarAddress?: string;

  @ApiPropertyOptional({
    description: 'Filter by payout status',
    enum: PayoutStatus,
    example: PayoutStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({
    description: 'Filter by payout type',
    enum: PayoutType,
    example: PayoutType.QUEST_REWARD,
  })
  @IsOptional()
  @IsEnum(PayoutType)
  type?: PayoutType;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class PayoutResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() stellarAddress: string;
  @ApiProperty() amount: number;
  @ApiProperty() asset: string;
  @ApiProperty({ enum: PayoutStatus }) status: PayoutStatus;
  @ApiProperty({ enum: PayoutType }) type: PayoutType;
  @ApiPropertyOptional() questId?: string;
  @ApiPropertyOptional() submissionId?: string;
  @ApiPropertyOptional() transactionHash?: string;
  @ApiPropertyOptional() stellarLedger?: number;
  @ApiPropertyOptional() failureReason?: string;
  @ApiProperty() retryCount: number;
  @ApiPropertyOptional() processedAt?: Date;
  @ApiPropertyOptional() claimedAt?: Date;
  @ApiProperty() createdAt: Date;
}

/**
 * Paginated payout list — extends the generic wrapper with a concrete type
 * so Swagger can reflect the shape of `data[]`.
 */
export class PayoutHistoryResponseDto extends PaginatedResponseDto<PayoutResponseDto> {
  @ApiProperty({ type: [PayoutResponseDto] })
  declare data: PayoutResponseDto[];
}

export class PayoutStatsDto {
  @ApiProperty({ description: 'Total number of payouts' }) total: number;
  @ApiProperty({ description: 'Total amount paid out' }) totalAmount: number;
  @ApiProperty({ description: 'Payouts currently being processed' }) pendingCount: number;
  @ApiProperty({ description: 'Successfully completed payouts' }) completedCount: number;
  @ApiProperty({ description: 'Payouts that failed' }) failedCount: number;
  @ApiProperty({ description: 'Asset denomination (e.g. XLM)' }) asset: string;
}
