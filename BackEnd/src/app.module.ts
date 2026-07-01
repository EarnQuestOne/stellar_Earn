import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerService } from './common/logger/logger.service';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { dataSourceOptions } from './database/data-source';
import { LoggerModule } from './common/logger/logger.module';
import { StartupReadinessService } from './common/services/startup-readiness.service';
import { FileUploadModule } from './common/upload/file-upload.module';
import { ApiVersionGuard } from './common/guards/versioning.guard';
import { VersioningInterceptor } from './common/interceptors/versioning.interceptor';

import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule as AppCacheModule } from './modules/cache/cache.module';
import { EmailModule } from './modules/email/email.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { PostmortemsModule } from './modules/postmortems/postmortems.module';
import { QueryMonitoringModule } from './modules/query-monitoring/query-monitoring.module';
import { QuestsModule } from './modules/quests/quests.module';
import { QuotaModule } from './modules/quota/quota.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { MultiSigModule } from './modules/stellar/multisig/multisig.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { TraceModule } from './modules/trace/trace.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { TraceInterceptor } from './modules/trace/trace.interceptor';
import { EventsModule } from './events/events.module';
import { ProcessResourceModule } from './modules/process-resource/process-resource.module';
import { shouldInitializeDatabaseConnection } from './config/database.config';

const typeOrmImports = shouldInitializeDatabaseConnection()
  ? [TypeOrmModule.forRoot(dataSourceOptions)]
  : [];

const dataSourceProvider = shouldInitializeDatabaseConnection()
  ? []
  : [
      {
        provide: DataSource,
        useFactory: () =>
          new DataSource({
            type: 'postgres',
            url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
            entities: [],
            synchronize: false,
            logging: false,
          }),
      },
    ];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...typeOrmImports,
    LoggerModule.forRoot(),
    FileUploadModule,
    EventsModule,
    AdminModule,
    AnalyticsModule,
    AuthModule,
    AppCacheModule,
    EmailModule,
    TraceModule,
    FeatureFlagsModule,
    HealthModule,
    JobsModule,
    ModerationModule,
    MultiSigModule,
    NotificationsModule,
    PayoutsModule,
    ...(process.env.NODE_ENV !== 'production' ? [PostmortemsModule] : []),
    QueryMonitoringModule,
    QuestsModule,
    QuotaModule,
    StellarModule,
    SubmissionsModule,
    UsersModule,
    WebhooksModule,
    WebsocketModule,
    ProcessResourceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLoggerService,
    SecurityMiddleware,
    StartupReadinessService,
    ...dataSourceProvider,
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new VersioningInterceptor(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
  ],
})
export class AppModule {}
