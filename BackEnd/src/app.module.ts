import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { EmailModule } from './modules/email/email.module';
import { UsersModule } from './modules/users/users.module';

import { dataSourceOptions } from './database/data-source';

import { LoggerModule } from './common/logger/logger.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CacheModule } from './modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { throttlerConfig } from './config/throttler.config';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { EventsModule } from './events/events.module';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { CsrfGuard } from './common/guards/csrf.guard';

@Module({
  imports: [
    LoggerModule.forRoot({
      isGlobal: true,
      enableInterceptor: true,
      enableErrorFilter: true,
    }),
    EventsModule,
    WebhooksModule,
    CacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
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
    EmailModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SecurityMiddleware,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
