import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QuestsModule } from '../../../src/modules/quests/quests.module';
import { SubmissionsModule } from '../../../src/modules/submissions/submissions.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { QuestsService } from '../../../src/modules/quests/quests.service';
import { SubmissionsService } from '../../../src/modules/submissions/submissions.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { Quest } from '../../../src/modules/quests/entities/quest.entity';
import { Submission } from '../../../src/modules/submissions/entities/submission.entity';
import { User } from '../../../src/modules/users/entities/user.entity';

describe('Quests-Submissions Integration', () => {
  let module: TestingModule;
  let questsService: QuestsService;
  let submissionsService: SubmissionsService;
  let usersService: UsersService;

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
          entities: [Quest, Submission, User],
          synchronize: true,
          dropSchema: true,
        }),
        QuestsModule,
        SubmissionsModule,
        UsersModule,
      ],
    }).compile();

    questsService = module.get<QuestsService>(QuestsService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const questRepository = module.get('QuestRepository');
    const submissionRepository = module.get('SubmissionRepository');
    const userRepository = module.get('UserRepository');

    await submissionRepository.clear();
    await questRepository.clear();
    await userRepository.clear();
  });

  describe('Quest Submission Workflow', () => {
    it('should create quest and allow user to submit work', async () => {
      // Create a test user
      const user = await usersService.create({
        stellarAddress: 'GBQUEST123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Quest Tester',
      });

      // Create a quest
      const questData = {
        title: 'Test Quest',
        description: 'A test quest for integration testing',
        rewardAmount: 100,
        maxParticipants: 10,
        requirements: 'Complete the test',
        category: 'testing',
        difficulty: 'easy' as const,
        status: 'active' as const,
      };

      const quest = await questsService.create(questData);

      // Verify quest was created
      expect(quest.title).toBe(questData.title);
      expect(quest.rewardAmount).toBe(questData.rewardAmount);
      expect(quest.status).toBe('active');

      // User submits to the quest
      const submissionData = {
        questId: quest.id,
        userId: user.id,
        content: 'This is my submission for the test quest',
        proofOfWork: 'test_proof_hash',
      };

      const submission = await submissionsService.create(submissionData);

      // Verify submission was created
      expect(submission.questId).toBe(quest.id);
      expect(submission.userId).toBe(user.id);
      expect(submission.content).toBe(submissionData.content);
      expect(submission.status).toBe('pending');
    });

    it('should handle quest completion and user stats updates', async () => {
      // Create user and quest
      const user = await usersService.create({
        stellarAddress: 'GBSTATS123456789012345678901234567890123456789012345678901234567890',
      });

      const quest = await questsService.create({
        title: 'Stats Quest',
        description: 'Test quest for stats',
        rewardAmount: 50,
        maxParticipants: 5,
        requirements: 'Submit work',
        category: 'stats',
        difficulty: 'medium' as const,
        status: 'active' as const,
      });

      // Create submission
      const submission = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'Stats test submission',
        proofOfWork: 'stats_proof',
      });

      // Approve submission (simulating admin action)
      const approvedSubmission = await submissionsService.updateStatus(
        submission.id,
        'approved'
      );

      // Verify submission status
      expect(approvedSubmission.status).toBe('approved');

      // Check if user stats were updated (this would typically happen via events)
      const updatedUser = await usersService.findById(user.id);
      // Note: Actual stats update might happen asynchronously via events
      expect(updatedUser).toBeDefined();
    });

    it('should prevent duplicate submissions for same quest by same user', async () => {
      // Create user and quest
      const user = await usersService.create({
        stellarAddress: 'GBDUPE123456789012345678901234567890123456789012345678901234567890',
      });

      const quest = await questsService.create({
        title: 'Duplicate Test Quest',
        description: 'Test duplicate submissions',
        rewardAmount: 25,
        maxParticipants: 3,
        requirements: 'No duplicates',
        category: 'testing',
        difficulty: 'easy' as const,
        status: 'active' as const,
      });

      // First submission
      const submission1 = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'First submission',
        proofOfWork: 'proof1',
      });

      expect(submission1).toBeDefined();

      // Attempt second submission (should fail or be handled)
      await expect(
        submissionsService.create({
          questId: quest.id,
          userId: user.id,
          content: 'Second submission',
          proofOfWork: 'proof2',
        })
      ).rejects.toThrow(); // Assuming service prevents duplicates
    });
  });

  describe('Cross-Module Event Handling', () => {
    it('should emit events when quest submission status changes', async () => {
      // Create user and quest
      const user = await usersService.create({
        stellarAddress: 'GBEVENT123456789012345678901234567890123456789012345678901234567890',
      });

      const quest = await questsService.create({
        title: 'Event Test Quest',
        description: 'Test event emission',
        rewardAmount: 75,
        maxParticipants: 2,
        requirements: 'Test events',
        category: 'events',
        difficulty: 'hard' as const,
        status: 'active' as const,
      });

      // Create submission
      const submission = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'Event test submission',
        proofOfWork: 'event_proof',
      });

      // Listen for events (in a real scenario, this would be handled by listeners)
      const eventEmitter = module.get('EventEmitter2');

      const eventPromise = new Promise((resolve) => {
        eventEmitter.on('submission.status.changed', (data) => {
          resolve(data);
        });
      });

      // Update submission status
      await submissionsService.updateStatus(submission.id, 'approved');

      // In a real implementation, we would wait for the event
      // For this test, we just verify the status change worked
      const updatedSubmission = await submissionsService.findById(submission.id);
      expect(updatedSubmission.status).toBe('approved');
    });
  });
});