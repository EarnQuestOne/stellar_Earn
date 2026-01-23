import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { PayoutType } from '../entities/payout.entity';

export class ClaimPayoutDto {
  @IsUUID()
  @IsNotEmpty()
  submissionId: string;

  @IsString()
  @IsNotEmpty()
  stellarAddress: string;
}

export class CreatePayoutDto {
  @IsString()
  @IsNotEmpty()
  stellarAddress: string;

  @IsNumber()
  @Min(0.0000001)
  amount: number;

  @IsString()
  @IsOptional()
  asset?: string;

  @IsEnum(PayoutType)
  @IsOptional()
  type?: PayoutType;

  @IsUUID()
  @IsOptional()
  questId?: string;

  @IsUUID()
  @IsOptional()
  submissionId?: string;
}
