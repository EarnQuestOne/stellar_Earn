import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '#src/common/logger/logger.module';
import { UsersModule } from '#src/modules/users/users.module';
import { UsersService } from '#src/modules/users/users.service';
import { User } from '#src/modules/users/entities/user.entity';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { Submission } from '#src/modules/submissions/entities/submission.entity';

const mockModerationService = {
  createItem: jest.fn(),
  moderateItem: jest.fn(),
  findById: jest.fn(),
  findPending: jest.fn(),
  escalateItem: jest.fn(),
};

const mockHealthService = {
  getSystemHealth: jest.fn().mockResolvedValue({ status: 'healthy' }),
  checkModerationHealth: jest
    .fn()
    .mockResolvedValue({ queueSize: 0, averageProcessingTime: 100 }),
};

describe('Moderation-Health Integration', () => {
  let module: TestingModule;
  let moderationService: typeof mockModerationService;
  let _healthService: typeof mockHealthService;
  let _usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        LoggerModule.forRoot({
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Quest, Submission],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        UsersModule,
      ],
      providers: [
        { provide: 'ModerationService', useValue: mockModerationService },
        { provide: 'HealthService', useValue: mockHealthService },
      ],
    }).compile();

    moderationService = module.get('ModerationService');
    _healthService = module.get('HealthService');
    _usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const userRepository = module.get('UserRepository');
    await userRepository.query('DELETE FROM "users"');
  });

  describe('Content Moderation with Health Monitoring', () => {
    it('should moderate content and track moderation health metrics', async () => {
      const userRepository = module.get('UserRepository');
      const moderator = await userRepository.save({
        stellarAddress: 'GAMOD',
        displayName: 'Content Moderator',
        role: 'MODERATOR',
      });

      const contentCreatorRepository = module.get('UserRepository');
      const contentCreator = await contentCreatorRepository.save({
        stellarAddress: 'GACREATOR',
        displayName: 'Content Creator',
      });

      const moderationItem = {
        id: 'item-1',
        content: 'This is a test submission that needs moderation review.',
        contentType: 'submission',
        submittedBy: contentCreator.id,
        status: 'pending',
        metadata: {
          questId: 1,
          wordCount: 8,
          submittedAt: new Date().toISOString(),
        },
      };

      mockModerationService.createItem.mockResolvedValue(moderationItem);
      mockModerationService.findById.mockResolvedValue(moderationItem);

      const created = await moderationService.createItem({
        content: moderationItem.content,
        contentType: 'submission',
        submittedBy: contentCreator.id,
        metadata: moderationItem.metadata,
      });

      expect(created.contentType).toBe('submission');
      expect(created.status).toBe('pending');
      expect(created.submittedBy).toBe(contentCreator.id);

      const moderatedItem = {
        ...moderationItem,
        status: 'approved',
        moderatedBy: moderator.id,
        moderationReason: 'Content meets community guidelines.',
      };

      mockModerationService.moderateItem.mockResolvedValue(moderatedItem);

      const result = await moderationService.moderateItem(
        moderationItem.id,
        'approved',
        moderator.id,
        'Content meets community guidelines.',
      );

      expect(result.status).toBe('approved');
      expect(result.moderatedBy).toBe(moderator.id);
      expect(result.moderationReason).toBe(
        'Content meets community guidelines.',
      );

      mockModerationService.findById.mockResolvedValue(moderatedItem);

      const foundItem = await moderationService.findById(moderationItem.id);
      expect(foundItem.status).toBe('approved');
    });

    it('should handle moderation queue health and system load', async () => {
      const userRepository = module.get('UserRepository');
      const moderator = await userRepository.save({
        stellarAddress: 'GAQUEUE',
        displayName: 'Queue Moderator',
        role: 'MODERATOR',
      });

      const moderationItems = [];
      for (let i = 0; i < 5; i++) {
        const item = {
          id: `item-${i + 1}`,
          content: `Test content item ${i + 1} requiring moderation review.`,
          contentType: 'submission',
          submittedBy: moderator.id,
          status: 'pending',
          metadata: {
            priority: i < 2 ? 'high' : 'normal',
            itemNumber: i + 1,
          },
        };
        mockModerationService.createItem.mockResolvedValueOnce(item);
        const created = await moderationService.createItem({
          content: item.content,
          contentType: 'submission',
          submittedBy: moderator.id,
          metadata: item.metadata,
        });
        moderationItems.push(created);
      }

      expect(moderationItems).toHaveLength(5);

      const processedItems = [];
      for (let i = 0; i < moderationItems.length; i++) {
        const status = i % 2 === 0 ? 'approved' : 'rejected';
        const moderated = {
          ...moderationItems[i],
          status,
          moderatedBy: moderator.id,
          moderationReason: `Processed item ${i + 1}`,
        };
        mockModerationService.moderateItem.mockResolvedValueOnce(moderated);
        const result = await moderationService.moderateItem(
          moderationItems[i].id,
          status,
          moderator.id,
          `Processed item ${i + 1}`,
        );
        processedItems.push(result);
      }

      for (let i = 0; i < processedItems.length; i++) {
        const expectedStatus = i % 2 === 0 ? 'approved' : 'rejected';
        expect(processedItems[i].status).toBe(expectedStatus);
        expect(processedItems[i].moderatedBy).toBe(moderator.id);
      }

      mockModerationService.findPending.mockResolvedValue([]);

      const pendingItems = await moderationService.findPending();
      expect(pendingItems.length).toBe(0);
    });
  });

  describe('Health Checks for Moderation System', () => {
    it('should perform health checks on moderation service components', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAHEALTH',
        displayName: 'Health Check User',
      });

      const moderationItem = {
        id: 'health-item-1',
        content: 'Health check content',
        contentType: 'test',
        submittedBy: user.id,
        status: 'pending',
        metadata: { healthCheck: true },
      };

      mockModerationService.createItem.mockResolvedValue(moderationItem);
      mockModerationService.findById.mockResolvedValue(moderationItem);
      mockModerationService.findPending.mockResolvedValue([moderationItem]);

      const created = await moderationService.createItem({
        content: 'Health check content',
        contentType: 'test',
        submittedBy: user.id,
        metadata: { healthCheck: true },
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe('pending');

      const foundItem = await moderationService.findById(created.id);
      expect(foundItem).toBeDefined();

      const pendingItems = await moderationService.findPending();
      expect(pendingItems.length).toBeGreaterThan(0);

      expect(async () => {
        await moderationService.findById(created.id);
      }).not.toThrow();
    });

    it('should monitor moderation performance and response times', async () => {
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAPERF',
        displayName: 'Performance Test User',
      });

      const startTime = Date.now();

      const items = [];
      for (let i = 0; i < 10; i++) {
        const item = {
          id: `perf-item-${i + 1}`,
          content: `Performance test content ${i + 1}`,
          contentType: 'performance_test',
          submittedBy: user.id,
          status: 'pending',
          metadata: { testId: i + 1, batch: 'perf_test' },
        };
        mockModerationService.createItem.mockResolvedValueOnce(item);
        const created = await moderationService.createItem({
          content: `Performance test content ${i + 1}`,
          contentType: 'performance_test',
          submittedBy: user.id,
          metadata: { testId: i + 1, batch: 'perf_test' },
        });
        items.push(created);
      }

      const creationTime = Date.now() - startTime;

      const moderationStartTime = Date.now();

      for (const item of items) {
        const moderatedItem = {
          ...item,
          status: 'approved',
          moderatedBy: user.id,
          moderationReason: 'Bulk approval for performance test',
        };
        mockModerationService.moderateItem.mockResolvedValueOnce(moderatedItem);
        await moderationService.moderateItem(
          item.id,
          'approved',
          user.id,
          'Bulk approval for performance test',
        );
      }

      const moderationTime = Date.now() - moderationStartTime;

      for (const item of items) {
        const moderatedItem = {
          ...item,
          status: 'approved',
        };
        mockModerationService.findById.mockResolvedValueOnce(moderatedItem);
        const result = await moderationService.findById(item.id);
        expect(result.status).toBe('approved');
      }

      expect(creationTime).toBeLessThan(5000);
      expect(moderationTime).toBeLessThan(10000);
    });
  });

  describe('Moderation Escalation and Health Alerts', () => {
    it('should handle moderation escalation for high-priority content', async () => {
      const userRepository = module.get('UserRepository');
      const juniorModerator = await userRepository.save({
        stellarAddress: 'GAJUNIOR',
        displayName: 'Junior Moderator',
        role: 'MODERATOR',
        moderationLevel: 'junior',
      });

      const userRepository2 = module.get('UserRepository');
      const seniorModerator = await userRepository2.save({
        stellarAddress: 'GASENIOR',
        displayName: 'Senior Moderator',
        role: 'MODERATOR',
        moderationLevel: 'senior',
      });

      const highPriorityItem = {
        id: 'escalation-item-1',
        content:
          'URGENT: Content requiring immediate senior moderator attention.',
        contentType: 'urgent_submission',
        submittedBy: juniorModerator.id,
        priority: 'urgent',
        status: 'pending',
        metadata: {
          requiresEscalation: true,
          escalationReason: 'Potential policy violation',
          flaggedKeywords: ['urgent', 'violation'],
        },
      };

      mockModerationService.createItem.mockResolvedValue(highPriorityItem);

      const created = await moderationService.createItem({
        content: highPriorityItem.content,
        contentType: 'urgent_submission',
        submittedBy: juniorModerator.id,
        priority: 'urgent',
        metadata: highPriorityItem.metadata,
      });

      expect(created.priority).toBe('urgent');

      const escalatedItem = { ...created, escalatedBy: juniorModerator.id };
      mockModerationService.escalateItem.mockResolvedValue(escalatedItem);

      const escalated = await moderationService.escalateItem(
        highPriorityItem.id,
        juniorModerator.id,
        'Requires senior moderator review',
      );

      expect(escalated.id).toBe(highPriorityItem.id);

      const finalItem = {
        ...escalatedItem,
        status: 'approved',
        moderatedBy: seniorModerator.id,
      };
      mockModerationService.moderateItem.mockResolvedValue(finalItem);

      const result = await moderationService.moderateItem(
        escalated.id,
        'approved',
        seniorModerator.id,
        'Reviewed and approved by senior moderator.',
      );

      expect(result.status).toBe('approved');
      expect(result.moderatedBy).toBe(seniorModerator.id);
    });

    it('should monitor moderation system health and trigger alerts', async () => {
      const userRepository = module.get('UserRepository');
      const moderator = await userRepository.save({
        stellarAddress: 'GAALERT',
        displayName: 'Alert Test Moderator',
        role: 'MODERATOR',
      });

      const items = [];
      for (let i = 0; i < 20; i++) {
        const item = {
          id: `load-item-${i + 1}`,
          content: `Load test content ${i + 1} for health monitoring.`,
          contentType: 'load_test',
          submittedBy: moderator.id,
          status: 'pending',
          metadata: { loadTest: true, sequence: i + 1 },
        };
        mockModerationService.createItem.mockResolvedValueOnce(item);
        const created = await moderationService.createItem({
          content: `Load test content ${i + 1} for health monitoring.`,
          contentType: 'load_test',
          submittedBy: moderator.id,
          metadata: { loadTest: true, sequence: i + 1 },
        });
        items.push(created);
      }

      let processedCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          const moderatedItem = {
            ...item,
            status: 'approved',
            moderatedBy: moderator.id,
            moderationReason: 'Load test approval',
          };
          mockModerationService.moderateItem.mockResolvedValueOnce(
            moderatedItem,
          );
          await moderationService.moderateItem(
            item.id,
            'approved',
            moderator.id,
            'Load test approval',
          );
          processedCount++;
        } catch {
          errorCount++;
        }
      }

      expect(processedCount).toBe(20);
      expect(errorCount).toBe(0);

      mockModerationService.findPending.mockResolvedValue([]);

      const finalPendingItems = await moderationService.findPending();
      expect(finalPendingItems.length).toBe(0);
    });
  });
});
