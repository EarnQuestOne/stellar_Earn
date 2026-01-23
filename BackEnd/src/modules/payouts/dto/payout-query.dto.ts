import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutStatus, PayoutType } from '../entities/payout.entity';

export class PayoutQueryDto {
  @IsOptional()
  @IsString()
  stellarAddress?: string;

  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

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

export class PayoutHistoryResponseDto {
  payouts: PayoutResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PayoutResponseDto {
  id: string;
  stellarAddress: string;
  amount: number;
  asset: string;
  status: PayoutStatus;
  type: PayoutType;
  questId: string | null;
  submissionId: string | null;
  transactionHash: string | null;
  stellarLedger: number | null;
  failureReason: string | null;
  retryCount: number;
  processedAt: Date | null;
  claimedAt: Date | null;
  createdAt: Date;
}

export class PayoutStatsDto {
  totalPayouts: number;
  totalAmount: number;
  pendingPayouts: number;
  pendingAmount: number;
  completedPayouts: number;
  completedAmount: number;
  failedPayouts: number;
}
