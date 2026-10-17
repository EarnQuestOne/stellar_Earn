import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { ReferralRewardProcessor } from '../jobs/processors/referral-reward.processor';

/**
 * Referral & invitation program (backend). Exposes the referral API and the
 * attribution/qualification/reward logic consumed by the auth and submissions
 * flows. The reward processor is provided here (it owns the referral/reward
 * repositories) and is also registered in the jobs module.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ReferralCode, Referral, ReferralReward])],
  controllers: [ReferralsController],
  providers: [ReferralsService, ReferralRewardProcessor],
  exports: [ReferralsService],
})
export class ReferralsModule {}
