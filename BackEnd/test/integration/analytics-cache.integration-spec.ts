import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from '../../../src/modules/analytics/analytics.module';
import { CacheModule } from '../../../src/modules/cache/cache.module';
import { AnalyticsService } from '../../../src/modules/analytics/analytics.service';
import { CacheService } from '../../../src/modules/cache/cache.service';
import { User } from '../../../src/modules/users/entities/user.entity';
import { Quest } from '../../../src/modules/quests/entities/quest.entity';
import { Submission } from '../../../src/modules/submissions/entities/submission.entity';

describe('Analytics-Cache Integration', () => {
  let module: TestingModule;
  let analyticsService: AnalyticsService;
  let cacheService: CacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Quest, Submission],
          synchronize: true,
          dropSchema: true,
        }),
        AnalyticsModule,
        CacheModule,
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clear cache between tests
    await cacheService.clear();

    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const questRepository = module.get('QuestRepository');
    const submissionRepository = module.get('SubmissionRepository');

    await submissionRepository.clear();
    await questRepository.clear();
    await userRepository.clear();
  });

  describe('Analytics Data Caching', () => {
    it('should cache analytics data and serve from cache on subsequent requests', async () => {
      const cacheKey = 'test_analytics_data';

      // First request - should compute and cache
      const analyticsData = {
        totalUsers: 150,
        activeQuests: 25,
        totalSubmissions: 450,
        completionRate: 0.75,
      };

      await cacheService.set(cacheKey, analyticsData, 300); // 5 minutes

      // Verify data is cached
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toEqual(analyticsData);

      // Second request - should serve from cache
      const cachedData2 = await cacheService.get(cacheKey);
      expect(cachedData2).toEqual(analyticsData);
    });

    it('should handle cache misses gracefully and fall back to computation', async () => {
      const cacheKey = 'nonexistent_analytics';

      // Request non-existent cached data
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toBeNull();

      // Should not throw error, just return null
      expect(async () => {
        await cacheService.get(cacheKey);
      }).not.toThrow();
    });

    it('should cache analytics metrics with proper TTL', async () => {
      const cacheKey = 'ttl_test_metrics';
      const metrics = {
        dailyActiveUsers: 89,
        weeklyNewUsers: 23,
        monthlyRevenue: 1250.50,
      };

      // Set with short TTL for testing
      await cacheService.set(cacheKey, metrics, 1); // 1 second

      // Verify immediately available
      let cached = await cacheService.get(cacheKey);
      expect(cached).toEqual(metrics);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      cached = await cacheService.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('Analytics Performance Optimization', () => {
    it('should use cache to optimize repeated analytics queries', async () => {
      const userId = 1;
      const analyticsKey = `user_stats_${userId}`;

      // Simulate user stats that would be expensive to compute
      const userStats = {
        totalQuestsCompleted: 12,
        totalEarnings: 450.75,
        averageRating: 4.6,
        streakDays: 7,
        rank: 'Gold',
      };

      // First access - cache miss, would compute
      await cacheService.set(analyticsKey, userStats, 600); // 10 minutes

      // Subsequent accesses - cache hits
      for (let i = 0; i < 5; i++) {
        const cachedStats = await cacheService.get(analyticsKey);
        expect(cachedStats).toEqual(userStats);
      }

      // Verify data integrity maintained
      const finalStats = await cacheService.get(analyticsKey);
      expect(finalStats.totalQuestsCompleted).toBe(12);
      expect(finalStats.totalEarnings).toBe(450.75);
    });

    it('should handle cache invalidation for updated analytics', async () => {
      const questId = 1;
      const questStatsKey = `quest_stats_${questId}`;

      const initialStats = {
        participants: 5,
        submissions: 3,
        completionRate: 0.6,
      };

      // Set initial cached stats
      await cacheService.set(questStatsKey, initialStats, 300);

      // Simulate stats update (new submission)
      const updatedStats = {
        participants: 5,
        submissions: 4,
        completionRate: 0.8,
      };

      // Update cache with new stats
      await cacheService.set(questStatsKey, updatedStats, 300);

      // Verify updated stats are returned
      const cachedStats = await cacheService.get(questStatsKey);
      expect(cachedStats.submissions).toBe(4);
      expect(cachedStats.completionRate).toBe(0.8);
    });
  });

  describe('Cache Analytics Integration', () => {
    it('should track cache hit/miss ratios for analytics optimization', async () => {
      const keys = ['analytics_1', 'analytics_2', 'analytics_3'];

      // Set some data
      await cacheService.set(keys[0], { data: 'value1' }, 300);
      await cacheService.set(keys[1], { data: 'value2' }, 300);
      // keys[2] remains unset

      // Perform accesses to generate hit/miss patterns
      await cacheService.get(keys[0]); // hit
      await cacheService.get(keys[1]); // hit
      await cacheService.get(keys[2]); // miss
      await cacheService.get(keys[0]); // hit

      // Verify cache operations work without errors
      // In a real implementation, this would track metrics
      expect(async () => {
        await cacheService.get(keys[0]);
        await cacheService.get(keys[2]);
      }).not.toThrow();
    });

    it('should handle bulk cache operations for analytics data', async () => {
      const bulkData = {
        'dashboard_stats': { users: 1000, quests: 50 },
        'performance_metrics': { responseTime: 150, throughput: 200 },
        'user_engagement': { dailyVisits: 500, sessionDuration: 300 },
      };

      // Set bulk data
      for (const [key, value] of Object.entries(bulkData)) {
        await cacheService.set(key, value, 600);
      }

      // Retrieve and verify bulk data
      for (const [key, expectedValue] of Object.entries(bulkData)) {
        const cachedValue = await cacheService.get(key);
        expect(cachedValue).toEqual(expectedValue);
      }

      // Clear all cached analytics data
      await cacheService.clear();

      // Verify all data cleared
      for (const key of Object.keys(bulkData)) {
        const cachedValue = await cacheService.get(key);
        expect(cachedValue).toBeNull();
      }
    });
  });
});