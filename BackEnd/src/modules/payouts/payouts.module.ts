import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { Payout } from './entities/payout.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import { QuotaModule } from '../quota/quota.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payout, IdempotencyKey]),
    ScheduleModule.forRoot(),
    EventEmitterModule,
    QuotaModule,
    JobsModule,
  ],
  controllers: [PayoutsController],
  providers: [
    PayoutsService,
    FraudRiskRulesService,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
  exports: [PayoutsService, FraudRiskRulesService, IdempotencyService],
})
export class PayoutsModule {}
