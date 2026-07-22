import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { WebVitalsAnalyticsController } from './web-vitals.controller';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { WebVitalsAnalyticsService } from './services/web-vitals.service';
import { CacheService } from './services/cache.service';
import { StreamExportService } from './services/stream-export.service';
import { AnalyticsAggregationService } from './services/aggregation.service';
import { AnalyticsReportService } from './services/report.service';
import { PlatformAnalyticsAggregator } from './aggregators/platform-aggregator';
import { QuestAnalyticsAggregator } from './aggregators/quest-aggregator';
import { UserAnalyticsAggregator } from './aggregators/user-aggregator';
import { BaseAnalyticsExporter } from './exporters/base-exporter';
import { Quest } from './entities/quest.entity';
import { Submission } from './entities/submission.entity';
import { Payout } from './entities/payout.entity';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { AnalyticsReport } from './entities/analytics-report.entity';
import { User as AnalyticsUser } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsUser,
      Quest,
      Submission,
      Payout,
      AnalyticsSnapshot,
      AnalyticsReport,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 100, // max items in cache
    }),
  ],
  controllers: [AnalyticsController, WebVitalsAnalyticsController],
  providers: [
    PlatformAnalyticsService,
    QuestAnalyticsService,
    UserAnalyticsService,
    WebVitalsAnalyticsService,
    CacheService,
    StreamExportService,
    PlatformAnalyticsAggregator,
    QuestAnalyticsAggregator,
    UserAnalyticsAggregator,
    AnalyticsAggregationService,
    AnalyticsReportService,
    BaseAnalyticsExporter,
  ],
  exports: [
    PlatformAnalyticsService,
    QuestAnalyticsService,
    UserAnalyticsService,
    StreamExportService,
    AnalyticsAggregationService,
    AnalyticsReportService,
    BaseAnalyticsExporter,
  ],
})
export class AnalyticsModule {}
