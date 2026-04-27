import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiVersionGuard } from './common/guards/versioning.guard';
import { VersioningInterceptor } from './common/interceptors/versioning.interceptor';

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
import { ModerationModule } from './modules/moderation/moderation.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { QueryMonitoringModule } from './modules/query-monitoring/query-monitoring.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';

import { dataSourceOptions } from './database/data-source';
import moderationConfig from './config/moderation.config';

import { LoggerModule } from './common/logger/logger.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { TracingMiddleware } from './common/tracing/tracing.middleware';
import { QueryLoggerModule } from './common/query-logger/query-logger.module';
import { CacheModule } from './modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { throttlerConfig } from './config/throttler.config';
import { PerUserRateLimitConfigService } from './config/per-user-rate-limit.config';
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
    QueryLoggerModule,
    EventsModule,
    WebhooksModule,
    CacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [moderationConfig],
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
    ModerationModule,
    WebsocketModule,
    QueryMonitoringModule,
    FeatureFlagsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PerUserRateLimitConfigService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VersioningInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // TracingMiddleware must run first: it sets the AsyncLocalStorage TraceContext
    // that LoggerMiddleware and all subsequent handlers read from.
    consumer.apply(TracingMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
