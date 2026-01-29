import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AuthModule } from './modules/auth/auth.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { QuestsModule } from './modules/quests/quests.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
// import { StellarModule } from './modules/stellar/stellar.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import Datasource from './config/ormconfig';
import { AnalyticsSnapshot } from './modules/analytics/entities/analytics-snapshot.entity';
// import { AnalyticsUser } from './modules/analytics/entities/analytics-user.entity';
// import { AnalyticsQuest } from './modules/analytics/entities/analytics-quest.entity';
// import { AnalyticsSubmission } from './modules/analytics/entities/analytics-submission.entity';
// import { AnalyticsPayout } from './modules/analytics/entities/analytics-payout.entity';
// import { AnalyticsPayout } from './modules/analytics/entities/payout.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { Payout } from './modules/payouts/entities/payout.entity';
import { Quest } from './modules/quests/entities/quest.entity';
import { Submission } from './modules/submissions/entities/submission.entity';
import { User } from './modules/users/entities/user.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { Submission } from './modules/submissions/entities/submission.entity';

import { User as AnalyticsUser } from './modules/analytics/entities/user.entity';
import { Quest as AnalyticsQuest } from './modules/analytics/entities/quest.entity';
import { Submission as AnalyticsSubmission } from './modules/analytics/entities/submission.entity';
import { Payout as AnalyticsPayout } from './modules/analytics/entities/payout.entity';
import { AnalyticsSnapshot } from './modules/analytics/entities/analytics-snapshot.entity';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorLoggerFilter } from './common/filter/error-logger.filter';
import { CacheModule } from './modules/cache/cache.module';
import { throttlerConfig } from './config/throttler.config';
import { AppThrottlerGuard } from './common/guards/throttler.guard';

@Module({
  imports: [
    WebhooksModule,
    CacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeOrmModule.forRoot(Datasource.options),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [
          RefreshToken,
          Payout,
          Quest,
          User,
          Submission,
          Notification,
          // AnalyticsUser,
          // AnalyticsQuest,
          // AnalyticsSubmission,
          // AnalyticsPayout,
          AnalyticsSnapshot,
        ],
        // synchronize: configService.get<string>('NODE_ENV') !== 'production',
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync(throttlerConfig),
    AuthModule,
    PayoutsModule,
    AnalyticsModule,
    QuestsModule,
    SubmissionsModule,
    // StellarModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
