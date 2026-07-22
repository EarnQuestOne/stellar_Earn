import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutType } from '../entities/payout.entity';

export class ClaimPayoutDto {
  @ApiProperty({
    description: 'Submission ID for the payout claim',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({
    description: 'Stellar public key address to receive payout',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  stellarAddress: string;
}

export class CreatePayoutDto {
  @ApiProperty({
    description: 'Stellar destination address',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  stellarAddress: string;

  @ApiProperty({
    description: 'Amount to payout',
    example: 10.5,
    minimum: 0.0000001,
  })
  @IsNumber()
  @Min(0.0000001)
  amount: number;

  @ApiPropertyOptional({
    description: 'Asset code (e.g., XLM, USDC)',
    example: 'XLM',
  })
  @IsString()
  @IsOptional()
  asset?: string;

  @ApiPropertyOptional({ description: 'Payout type', enum: PayoutType })
  @IsEnum(PayoutType)
  @IsOptional()
  type?: PayoutType;

  @ApiPropertyOptional({
    description: 'Related quest ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  questId?: string;

  @ApiPropertyOptional({
    description: 'Related submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  submissionId?: string;
}
