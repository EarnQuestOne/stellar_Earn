import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { ReferralsService } from './referrals.service';
import {
  AttributeReferralDto,
  ReferralCodeResponseDto,
  ReferralListResponseDto,
  ReferralRewardsResponseDto,
  ReferralStatsResponseDto,
} from './dto/referral.dto';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('code')
  @ApiOperation({
    summary: 'Get my unique referral code and sharable invitation link',
  })
  @ApiResponse({
    status: 200,
    description: 'Referral code and invitation link retrieved successfully',
    type: ReferralCodeResponseDto,
  })
  getMyReferralCode(@CurrentUser() user: AuthUser): ReferralCodeResponseDto {
    return this.referralsService.getReferralCode(user);
  }

  @Get('my-code')
  @ApiOperation({
    summary: 'Alias for getting my referral code and link',
  })
  @ApiResponse({
    status: 200,
    type: ReferralCodeResponseDto,
  })
  getMyReferralCodeAlias(
    @CurrentUser() user: AuthUser,
  ): ReferralCodeResponseDto {
    return this.referralsService.getReferralCode(user);
  }

  @Get()
  @ApiOperation({
    summary: 'List my referred users and their qualification/reward status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of referrals retrieved successfully',
    type: ReferralListResponseDto,
  })
  getMyReferrals(
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralListResponseDto> {
    return this.referralsService.getReferralsForUser(user.id);
  }

  @Get('my-referrals')
  @ApiOperation({
    summary: 'Alias for listing my referrals',
  })
  @ApiResponse({
    status: 200,
    type: ReferralListResponseDto,
  })
  getMyReferralsAlias(
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralListResponseDto> {
    return this.referralsService.getReferralsForUser(user.id);
  }

  @Get('rewards')
  @ApiOperation({
    summary: 'View credited referral rewards ledger',
  })
  @ApiResponse({
    status: 200,
    description: 'Reward ledger retrieved successfully',
    type: ReferralRewardsResponseDto,
  })
  getMyRewards(
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralRewardsResponseDto> {
    return this.referralsService.getRewardsForUser(user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get referral performance statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Referral stats retrieved successfully',
    type: ReferralStatsResponseDto,
  })
  getMyStats(@CurrentUser() user: AuthUser): Promise<ReferralStatsResponseDto> {
    return this.referralsService.getReferralStats(user.id);
  }

  @Post('attribute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record a referral code attribution for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Referral attribution successfully recorded',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid referral code, self-referral, or circular attribution',
  })
  @ApiResponse({
    status: 409,
    description: 'User has already been referred',
  })
  async attributeReferral(
    @Body() dto: AttributeReferralDto,
    @CurrentUser() user: AuthUser,
  ) {
    const referral = await this.referralsService.recordAttribution(
      user.id,
      dto.code,
    );
    return {
      success: true,
      referralId: referral.id,
      status: referral.status,
      code: referral.code,
    };
  }
}
