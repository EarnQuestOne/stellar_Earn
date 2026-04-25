import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { CacheService } from './services/cache.service';
import { AnalyticsReportService } from './services/report.service';
import { AnalyticsAggregationService } from './services/aggregation.service';
import { QuestAnalyticsAggregator } from './aggregators/quest-aggregator';
import { UserAnalyticsAggregator } from './aggregators/user-aggregator';
import { PlatformAnalyticsAggregator } from './aggregators/platform-aggregator';
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
  controllers: [AnalyticsController],
  providers: [
    PlatformAnalyticsService,
    QuestAnalyticsService,
    UserAnalyticsService,
    CacheService,
    AnalyticsReportService,
    AnalyticsAggregationService,
    QuestAnalyticsAggregator,
    UserAnalyticsAggregator,
    PlatformAnalyticsAggregator,
    BaseAnalyticsExporter,
  ],
  exports: [
    PlatformAnalyticsService,
    QuestAnalyticsService,
    UserAnalyticsService,
    AnalyticsReportService,
    AnalyticsAggregationService,
  ],
})
export class AnalyticsModule {}
