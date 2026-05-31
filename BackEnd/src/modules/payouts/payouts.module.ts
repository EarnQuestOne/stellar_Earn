import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { Payout } from './entities/payout.entity';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payout]), ScheduleModule.forRoot()],
  controllers: [PayoutsController],
  providers: [PayoutsService, FraudRiskRulesService],
  exports: [PayoutsService, FraudRiskRulesService],
})
export class PayoutsModule {}
