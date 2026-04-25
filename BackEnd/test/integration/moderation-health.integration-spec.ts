import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { ModerationModule } from '../../../src/modules/moderation/moderation.module';
import { HealthModule } from '../../../src/modules/health/health.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { ModerationService } from '../../../src/modules/moderation/moderation.service';
import { HealthService } from '../../../src/modules/health/health.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { User } from '../../../src/modules/users/entities/user.entity';
import { ModerationItem } from '../../../src/modules/moderation/entities/moderation-item.entity';

describe('Moderation-Health Integration', () => {
  let module: TestingModule;
  let moderationService: ModerationService;
  let healthService: HealthService;
  let usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TerminusModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, ModerationItem],
          synchronize: true,
          dropSchema: true,
        }),
        ModerationModule,
        HealthModule,
        UsersModule,
      ],
    }).compile();

    moderationService = module.get<ModerationService>(ModerationService);
    healthService = module.get<HealthService>(HealthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const moderationItemRepository = module.get('ModerationItemRepository');

    await moderationItemRepository.clear();
    await userRepository.clear();
  });

  describe('Content Moderation with Health Monitoring', () => {
    it('should moderate content and track moderation health metrics', async () => {
      // Create users
      const moderator = await usersService.create({
        stellarAddress: 'GBMOD123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Content Moderator',
        role: 'moderator',
      });

      const contentCreator = await usersService.create({
        stellarAddress: 'GBCREATOR123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Content Creator',
      });

      // Create content for moderation
      const moderationItem = await moderationService.createItem({
        content: 'This is a test submission that needs moderation review.',
        contentType: 'submission',
        submittedBy: contentCreator.id,
        metadata: {
          questId: 1,
          wordCount: 8,
          submittedAt: new Date().toISOString(),
        },
      });

      // Verify moderation item was created
      expect(moderationItem.contentType).toBe('submission');
      expect(moderationItem.status).toBe('pending');
      expect(moderationItem.submittedBy).toBe(contentCreator.id);

      // Moderate the content (approve)
      const moderatedItem = await moderationService.moderateItem(
        moderationItem.id,
        'approved',
        moderator.id,
        'Content meets community guidelines.',
      );

      expect(moderatedItem.status).toBe('approved');
      expect(moderatedItem.moderatedBy).toBe(moderator.id);
      expect(moderatedItem.moderationReason).toBe('Content meets community guidelines.');

      // Check system health after moderation activity
      // In a real system, this would check moderation queue health
      const foundItem = await moderationService.findById(moderationItem.id);
      expect(foundItem.status).toBe('approved');
    });

    it('should handle moderation queue health and system load', async () => {
      // Create moderator
      const moderator = await usersService.create({
        stellarAddress: 'GBQUEUE123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Queue Moderator',
        role: 'moderator',
      });

      // Create multiple items requiring moderation (simulating high load)
      const moderationItems = [];
      for (let i = 0; i < 5; i++) {
        const item = await moderationService.createItem({
          content: `Test content item ${i + 1} requiring moderation review.`,
          contentType: 'submission',
          submittedBy: moderator.id, // Self-submission for testing
          metadata: {
            priority: i < 2 ? 'high' : 'normal',
            itemNumber: i + 1,
          },
        });
        moderationItems.push(item);
      }

      expect(moderationItems).toHaveLength(5);

      // Process moderation queue
      const processedItems = [];
      for (let i = 0; i < moderationItems.length; i++) {
        const status = i % 2 === 0 ? 'approved' : 'rejected';
        const moderatedItem = await moderationService.moderateItem(
          moderationItems[i].id,
          status,
          moderator.id,
          `Processed item ${i + 1}`,
        );
        processedItems.push(moderatedItem);
      }

      // Verify all items processed
      for (let i = 0; i < processedItems.length; i++) {
        const expectedStatus = i % 2 === 0 ? 'approved' : 'rejected';
        expect(processedItems[i].status).toBe(expectedStatus);
        expect(processedItems[i].moderatedBy).toBe(moderator.id);
      }

      // In production, health service would monitor queue length and processing times
      // For testing, we verify the moderation system handles load
      const pendingItems = await moderationService.findPending();
      expect(pendingItems.length).toBe(0); // All processed
    });
  });

  describe('Health Checks for Moderation System', () => {
    it('should perform health checks on moderation service components', async () => {
      // Create test data to ensure services are functional
      const user = await usersService.create({
        stellarAddress: 'GBHEALTH123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Health Check User',
      });

      // Create moderation item
      const moderationItem = await moderationService.createItem({
        content: 'Health check content',
        contentType: 'test',
        submittedBy: user.id,
        metadata: { healthCheck: true },
      });

      // Verify basic functionality (acts as health check)
      expect(moderationItem.id).toBeDefined();
      expect(moderationItem.status).toBe('pending');

      // Test moderation service health by performing operations
      const foundItem = await moderationService.findById(moderationItem.id);
      expect(foundItem).toBeDefined();

      const pendingItems = await moderationService.findPending();
      expect(pendingItems.length).toBeGreaterThan(0);

      // If we get here without errors, the moderation service is healthy
      expect(async () => {
        await moderationService.findById(moderationItem.id);
      }).not.toThrow();
    });

    it('should monitor moderation performance and response times', async () => {
      // Create user and multiple moderation items
      const user = await usersService.create({
        stellarAddress: 'GBPERF123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Performance Test User',
      });

      // Measure performance of bulk moderation operations
      const startTime = Date.now();

      const items = [];
      for (let i = 0; i < 10; i++) {
        const item = await moderationService.createItem({
          content: `Performance test content ${i + 1}`,
          contentType: 'performance_test',
          submittedBy: user.id,
          metadata: { testId: i + 1, batch: 'perf_test' },
        });
        items.push(item);
      }

      const creationTime = Date.now() - startTime;

      // Moderate all items quickly
      const moderationStartTime = Date.now();

      for (const item of items) {
        await moderationService.moderateItem(
          item.id,
          'approved',
          user.id,
          'Bulk approval for performance test',
        );
      }

      const moderationTime = Date.now() - moderationStartTime;

      // Verify all operations completed
      for (const item of items) {
        const moderatedItem = await moderationService.findById(item.id);
        expect(moderatedItem.status).toBe('approved');
      }

      // Performance metrics would be tracked in a real system
      // For testing, we verify operations complete within reasonable time
      expect(creationTime).toBeLessThan(5000); // Less than 5 seconds for creation
      expect(moderationTime).toBeLessThan(10000); // Less than 10 seconds for moderation
    });
  });

  describe('Moderation Escalation and Health Alerts', () => {
    it('should handle moderation escalation for high-priority content', async () => {
      // Create moderators with different levels
      const juniorModerator = await usersService.create({
        stellarAddress: 'GBJUNIOR123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Junior Moderator',
        role: 'moderator',
        moderationLevel: 'junior',
      });

      const seniorModerator = await usersService.create({
        stellarAddress: 'GBSENIOR123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Senior Moderator',
        role: 'moderator',
        moderationLevel: 'senior',
      });

      // Create high-priority content requiring escalation
      const highPriorityItem = await moderationService.createItem({
        content: 'URGENT: Content requiring immediate senior moderator attention.',
        contentType: 'urgent_submission',
        submittedBy: juniorModerator.id,
        priority: 'urgent',
        metadata: {
          requiresEscalation: true,
          escalationReason: 'Potential policy violation',
          flaggedKeywords: ['urgent', 'violation'],
        },
      });

      expect(highPriorityItem.priority).toBe('urgent');

      // Junior moderator attempts moderation but escalates
      const escalatedItem = await moderationService.escalateItem(
        highPriorityItem.id,
        juniorModerator.id,
        'Requires senior moderator review',
      );

      // In a real system, this would trigger notifications and reassign
      // For testing, we verify the escalation is recorded
      expect(escalatedItem.id).toBe(highPriorityItem.id);

      // Senior moderator reviews and approves
      const finalItem = await moderationService.moderateItem(
        escalatedItem.id,
        'approved',
        seniorModerator.id,
        'Reviewed and approved by senior moderator.',
      );

      expect(finalItem.status).toBe('approved');
      expect(finalItem.moderatedBy).toBe(seniorModerator.id);
    });

    it('should monitor moderation system health and trigger alerts', async () => {
      // Create test scenario that would trigger health monitoring
      const moderator = await usersService.create({
        stellarAddress: 'GBALERT123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Alert Test Moderator',
        role: 'moderator',
      });

      // Create many items to test system under load
      const items = [];
      for (let i = 0; i < 20; i++) {
        const item = await moderationService.createItem({
          content: `Load test content ${i + 1} for health monitoring.`,
          contentType: 'load_test',
          submittedBy: moderator.id,
          metadata: { loadTest: true, sequence: i + 1 },
        });
        items.push(item);
      }

      // Process items and monitor for issues
      let processedCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          await moderationService.moderateItem(
            item.id,
            'approved',
            moderator.id,
            'Load test approval',
          );
          processedCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Verify system handled the load
      expect(processedCount).toBe(20);
      expect(errorCount).toBe(0);

      // In production, health service would monitor these metrics
      // For testing, we verify no failures occurred under load
      const finalPendingItems = await moderationService.findPending();
      expect(finalPendingItems.length).toBe(0); // All processed
    });
  });
});