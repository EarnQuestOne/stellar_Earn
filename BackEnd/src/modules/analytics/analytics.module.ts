import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { CacheService } from './services/cache.service';
import { Quest } from './entities/quest.entity';
import { Submission } from './entities/submission.entity';
import { Payout } from './entities/payout.entity';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Quest,
      Submission,
      Payout,
      AnalyticsSnapshot,
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
  ],
  exports: [
    PlatformAnalyticsService,
    QuestAnalyticsService,
    UserAnalyticsService,
  ],
})
export class AnalyticsModule {}
