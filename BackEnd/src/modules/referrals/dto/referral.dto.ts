import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ReferralStatus } from '../entities/referral.entity';
import { ReferralRewardStatus } from '../entities/referral-reward.entity';

export class ReferralCodeResponseDto {
  @ApiProperty({
    description: 'Unique referral code for the user',
    example: 'REF-A1B2C3D4',
  })
  code: string;

  @ApiProperty({
    description: 'Full referral link that can be shared',
    example: 'https://stellarearn.com/signup?ref=REF-A1B2C3D4',
  })
  referralLink: string;

  @ApiProperty({
    description: 'Owner user ID of the referral code',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  referrerId: string;
}

export class ReferralItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  referredUserId: string;

  @ApiProperty({ example: 'REF-A1B2C3D4' })
  code: string;

  @ApiProperty({ enum: ReferralStatus, example: ReferralStatus.PENDING })
  status: ReferralStatus;

  @ApiPropertyOptional({ nullable: true, example: null })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  qualifiedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rewardedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class ReferralListResponseDto {
  @ApiProperty({ type: [ReferralItemDto] })
  referrals: ReferralItemDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 2 })
  pending: number;

  @ApiProperty({ example: 1 })
  qualified: number;

  @ApiProperty({ example: 2 })
  rewarded: number;
}

export class ReferralRewardItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  referralId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  recipientId: string;

  @ApiProperty({ example: 50 })
  amount: number | string;

  @ApiProperty({ example: 'XLM' })
  asset: string;

  @ApiProperty({
    enum: ReferralRewardStatus,
    example: ReferralRewardStatus.CREDITED,
  })
  status: ReferralRewardStatus;

  @ApiProperty({
    example: 'referral-reward:123e4567-e89b-12d3-a456-426614174001',
  })
  idempotencyKey: string;

  @ApiProperty()
  createdAt: Date;
}

export class ReferralRewardsResponseDto {
  @ApiProperty({ type: [ReferralRewardItemDto] })
  rewards: ReferralRewardItemDto[];

  @ApiProperty({ example: 100 })
  totalAmount: number;

  @ApiProperty({ example: 2 })
  totalRewards: number;
}

export class AttributeReferralDto {
  @ApiProperty({
    description: 'Referral code provided during invitation attribution',
    example: 'REF-A1B2C3D4',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  code: string;
}

export class ReferralStatsResponseDto {
  @ApiProperty({ example: 5 })
  totalReferrals: number;

  @ApiProperty({ example: 2 })
  pendingReferrals: number;

  @ApiProperty({ example: 1 })
  qualifiedReferrals: number;

  @ApiProperty({ example: 2 })
  rewardedReferrals: number;

  @ApiProperty({ example: 100 })
  totalRewardsCredited: number;
}
