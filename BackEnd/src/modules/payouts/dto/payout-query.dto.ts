import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PayoutStatus, PayoutType } from '../entities/payout.entity';

export class PayoutQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by Stellar address',
    example: 'GXXXX...',
  })
  @IsOptional()
  @IsString()
  stellarAddress?: string;

  @ApiPropertyOptional({
    description: 'Filter by payout status',
    enum: PayoutStatus,
  })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({
    description: 'Filter by payout type',
    enum: PayoutType,
  })
  @IsOptional()
  @IsEnum(PayoutType)
  type?: PayoutType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
export class PayoutResponseDto {
  @ApiProperty({
    description: 'Payout unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  })
  stellarAddress: string;

  @ApiProperty({
    description: 'Payout amount',
    example: 10.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Asset code (e.g., XLM)',
    example: 'XLM',
    nullable: true,
  })
  asset: string;

  @ApiProperty({
    description: 'Payout status',
    enum: PayoutStatus,
    example: PayoutStatus.COMPLETED,
  })
  status: PayoutStatus;

  @ApiProperty({
    description: 'Payout type',
    enum: PayoutType,
    example: PayoutType.QUEST_REWARD,
  })
  type: PayoutType;

  @ApiProperty({
    description: 'Associated quest ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  questId: string | null;

  @ApiProperty({
    description: 'Associated submission ID',
    example: '789e0123-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  submissionId: string | null;

  @ApiProperty({
    description: 'Stellar transaction hash',
    example: 'abc123def456...',
    nullable: true,
  })
  transactionHash: string | null;

  @ApiProperty({
    description: 'Stellar ledger number',
    example: 12345,
    nullable: true,
  })
  stellarLedger: number | null;

  @ApiProperty({
    description: 'Failure reason if payout failed',
    example: 'Insufficient funds',
    nullable: true,
  })
  failureReason: string | null;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 0,
  })
  retryCount: number;

  @ApiProperty({
    description: 'Processing timestamp',
    example: '2026-01-23T12:34:56.000Z',
    nullable: true,
  })
  processedAt: Date | null;

  @ApiProperty({
    description: 'Claim timestamp',
    example: '2026-01-23T12:30:00.000Z',
    nullable: true,
  })
  claimedAt: Date | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-23T12:00:00.000Z',
  })
  createdAt: Date;
}

export class PayoutHistoryResponseDto {
  @ApiProperty({
    description: 'Array of payouts',
    type: [PayoutResponseDto],
  })
  payouts: PayoutResponseDto[];

  @ApiProperty({
    description: 'Total number of payouts',
    example: 100,
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

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}

export class PayoutStatsDto {
  @ApiProperty({
    description: 'Total number of payouts',
    example: 150,
  })
  totalPayouts: number;

  @ApiProperty({
    description: 'Total payout amount',
    example: 1500.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Number of pending payouts',
    example: 10,
  })
  pendingPayouts: number;

  @ApiProperty({
    description: 'Total pending amount',
    example: 100.0,
  })
  pendingAmount: number;

  @ApiProperty({
    description: 'Number of completed payouts',
    example: 135,
  })
  completedPayouts: number;

  @ApiProperty({
    description: 'Total completed amount',
    example: 1350.5,
  })
  completedAmount: number;

  @ApiProperty({
    description: 'Number of failed payouts',
    example: 5,
  })
  failedPayouts: number;
}
