import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AnalyticsSnapshot } from './modules/analytics/entities/analytics-snapshot.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { Payout } from './modules/payouts/entities/payout.entity';
import { Quest } from './modules/quests/entities/quest.entity';
import { Submission } from './modules/submissions/entities/submission.entity';
import { User } from './modules/users/entities/user.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

import { LoggerModule } from './common/logger/logger.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CacheModule } from './modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { throttlerConfig } from './config/throttler.config';
import { AppThrottlerGuard } from './common/guards/throttler.guard';

@Module({
  imports: [
    LoggerModule.forRoot({
      isGlobal: true,
      enableInterceptor: true,
      enableErrorFilter: true,
    }),
    WebhooksModule,
    CacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
          AnalyticsSnapshot,
        ],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync(throttlerConfig),
    HealthModule,
    AuthModule,
    PayoutsModule,
    AnalyticsModule,
    QuestsModule,
    SubmissionsModule,
    NotificationsModule,
    JobsModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
