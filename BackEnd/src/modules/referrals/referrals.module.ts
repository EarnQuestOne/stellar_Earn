import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { User } from '../users/entities/user.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, ReferralReward, User]),
    forwardRef(() => UsersModule),
    forwardRef(() => JobsModule),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
