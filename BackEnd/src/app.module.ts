import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

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

@Module({
  imports: [
    WebhooksModule,
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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get<number>('RATE_LIMIT_MAX', 100),
        },
      ],
      inject: [ConfigService],
    }),
    AuthModule,
    PayoutsModule,
    AnalyticsModule,
    QuestsModule,
    SubmissionsModule,
    // StellarModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
