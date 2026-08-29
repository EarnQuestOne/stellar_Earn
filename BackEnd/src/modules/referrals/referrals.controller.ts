import { Controller, Get, UseGuards } from '@nestjs/common';
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

/**
 * Authenticated referral program API: the caller's code/link, the referrals
 * they have driven, and the rewards credited to them.
 */
@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
@ApiResponse({ status: 401, description: 'Authentication required' })
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('me/code')
  @ApiOperation({
    summary: 'Get my referral code and shareable invitation link',
  })
  @ApiResponse({
    status: 200,
    description: "The caller's referral code and link",
  })
  getMyCode(@CurrentUser() user: AuthUser) {
    return this.referrals.getMyReferralInfo(user.id);
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'List the referrals I have made and their status' })
  @ApiResponse({
    status: 200,
    description: 'Referrals attributed to the caller',
  })
  getMyReferrals(@CurrentUser() user: AuthUser) {
    return this.referrals.listMyReferrals(user.id);
  }

  @Get('me/rewards')
  @ApiOperation({ summary: 'View referral rewards credited to me' })
  @ApiResponse({
    status: 200,
    description: 'Referral reward ledger for the caller',
  })
  getMyRewards(@CurrentUser() user: AuthUser) {
    return this.referrals.listMyRewards(user.id);
  }
}
