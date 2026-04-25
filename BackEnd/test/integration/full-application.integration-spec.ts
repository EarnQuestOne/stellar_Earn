import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Import all major modules
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { QuestsModule } from '../../../src/modules/quests/quests.module';
import { SubmissionsModule } from '../../../src/modules/submissions/submissions.module';
import { PayoutsModule } from '../../../src/modules/payouts/payouts.module';
import { StellarModule } from '../../../src/modules/stellar/stellar.module';
import { NotificationsModule } from '../../../src/modules/notifications/notifications.module';

// Import services
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { QuestsService } from '../../../src/modules/quests/quests.service';
import { SubmissionsService } from '../../../src/modules/submissions/submissions.service';
import { PayoutsService } from '../../../src/modules/payouts/payouts.service';
import { StellarService } from '../../../src/modules/stellar/stellar.service';

// Import entities
import { User } from '../../../src/modules/users/entities/user.entity';
import { Quest } from '../../../src/modules/quests/entities/quest.entity';
import { Submission } from '../../../src/modules/submissions/entities/submission.entity';
import { Payout } from '../../../src/modules/payouts/entities/payout.entity';
import { RefreshToken } from '../../../src/modules/auth/entities/refresh-token.entity';

describe('Full Application Integration', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;
  let questsService: QuestsService;
  let submissionsService: SubmissionsService;
  let payoutsService: PayoutsService;
  let stellarService: StellarService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Quest, Submission, Payout, RefreshToken],
          synchronize: true,
          dropSchema: true,
        }),
        // Import all modules for full integration
        AuthModule,
        UsersModule,
        QuestsModule,
        SubmissionsModule,
        PayoutsModule,
        StellarModule,
        NotificationsModule,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    questsService = module.get<QuestsService>(QuestsService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    payoutsService = module.get<PayoutsService>(PayoutsService);
    stellarService = module.get<StellarService>(StellarService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up all data between tests
    const repositories = [
      'UserRepository',
      'QuestRepository',
      'SubmissionRepository',
      'PayoutRepository',
      'RefreshTokenRepository',
    ];

    for (const repoName of repositories) {
      try {
        const repo = module.get(repoName);
        await repo.clear();
      } catch (error) {
        // Repository might not exist in this test setup, continue
      }
    }
  });

  describe('Complete User Journey', () => {
    it('should handle full user journey from registration to payout', async () => {
      const stellarAddress = 'GBFULLJOURNEY123456789012345678901234567890123456789012345678901234567890';

      // Step 1: User Registration & Authentication
      const authResult = await authService.verifySignatureAndLogin(
        stellarAddress,
        'journey_signature',
        'journey_message'
      );

      expect(authResult.accessToken).toBeDefined();
      expect(authResult.user.stellarAddress).toBe(stellarAddress);

      const user = authResult.user;

      // Step 2: Update User Profile
      const updatedUser = await usersService.updateProfile(user.id, {
        displayName: 'Journey Tester',
        bio: 'Testing the complete user journey',
      });

      expect(updatedUser.displayName).toBe('Journey Tester');

      // Step 3: Create a Quest
      const quest = await questsService.create({
        title: 'Complete Journey Quest',
        description: 'Test the entire application flow',
        rewardAmount: 200,
        maxParticipants: 1,
        requirements: 'Complete all steps successfully',
        category: 'integration',
        difficulty: 'expert' as const,
        status: 'active' as const,
      });

      expect(quest.status).toBe('active');

      // Step 4: Submit Work to Quest
      const submission = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'I have completed the full journey test',
        proofOfWork: 'journey_complete_proof',
      });

      expect(submission.status).toBe('pending');

      // Step 5: Approve Submission
      const approvedSubmission = await submissionsService.updateStatus(
        submission.id,
        'approved'
      );

      expect(approvedSubmission.status).toBe('approved');

      // Step 6: Process Payout
      const payout = await payoutsService.create({
        userId: user.id,
        amount: quest.rewardAmount,
        currency: 'XLM',
        reason: `Reward for completing quest: ${quest.title}`,
        status: 'pending' as const,
      });

      expect(payout.amount).toBe(quest.rewardAmount);

      // Step 7: Complete Payout Process
      const completedPayout = await payoutsService.updateStatus(payout.id, 'approved');

      expect(completedPayout.status).toBe('approved');

      // Step 8: Verify Final State
      const finalUser = await usersService.findById(user.id);
      expect(finalUser).toBeDefined();
      expect(finalUser.stellarAddress).toBe(stellarAddress);

      // Verify quest completion
      const finalQuest = await questsService.findById(quest.id);
      expect(finalQuest).toBeDefined();

      // Verify submission approval
      const finalSubmission = await submissionsService.findById(submission.id);
      expect(finalSubmission.status).toBe('approved');

      // Verify payout completion
      const finalPayout = await payoutsService.findById(payout.id);
      expect(finalPayout.status).toBe('approved');
    });

    it('should handle concurrent users completing quests', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const authResult = await authService.verifySignatureAndLogin(
          `GBMULTI${i}123456789012345678901234567890123456789012345678901234567890`,
          `sig${i}`,
          `msg${i}`
        );
        users.push(authResult.user);
      }

      expect(users).toHaveLength(3);

      // Create a quest that allows multiple participants
      const quest = await questsService.create({
        title: 'Concurrent Quest',
        description: 'Test concurrent quest completions',
        rewardAmount: 50,
        maxParticipants: 5,
        requirements: 'Complete concurrently',
        category: 'concurrency',
        difficulty: 'medium' as const,
        status: 'active' as const,
      });

      // All users submit to the quest
      const submissions = [];
      for (const user of users) {
        const submission = await submissionsService.create({
          questId: quest.id,
          userId: user.id,
          content: `Concurrent submission by ${user.stellarAddress}`,
          proofOfWork: `proof_${user.id}`,
        });
        submissions.push(submission);
      }

      expect(submissions).toHaveLength(3);

      // Approve all submissions
      for (const submission of submissions) {
        await submissionsService.updateStatus(submission.id, 'approved');
      }

      // Create payouts for all users
      const payouts = [];
      for (const user of users) {
        const payout = await payoutsService.create({
          userId: user.id,
          amount: quest.rewardAmount,
          currency: 'XLM',
          reason: 'Concurrent quest reward',
          status: 'pending' as const,
        });
        payouts.push(payout);
      }

      expect(payouts).toHaveLength(3);

      // Process all payouts
      for (const payout of payouts) {
        await payoutsService.updateStatus(payout.id, 'approved');
      }

      // Verify all payouts were processed
      for (const payout of payouts) {
        const finalPayout = await payoutsService.findById(payout.id);
        expect(finalPayout.status).toBe('approved');
      }
    });
  });

  describe('Cross-Module Event Propagation', () => {
    it('should propagate events across all integrated modules', async () => {
      const stellarAddress = 'GBEVENTS123456789012345678901234567890123456789012345678901234567890';

      // Authenticate user
      const authResult = await authService.verifySignatureAndLogin(
        stellarAddress,
        'events_sig',
        'events_msg'
      );

      const user = authResult.user;

      // Create quest
      const quest = await questsService.create({
        title: 'Events Quest',
        description: 'Test event propagation',
        rewardAmount: 25,
        maxParticipants: 1,
        requirements: 'Trigger events',
        category: 'events',
        difficulty: 'easy' as const,
        status: 'active' as const,
      });

      // Submit and approve (this should trigger various events)
      const submission = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'Event test submission',
        proofOfWork: 'event_proof',
      });

      await submissionsService.updateStatus(submission.id, 'approved');

      // Create and process payout
      const payout = await payoutsService.create({
        userId: user.id,
        amount: quest.rewardAmount,
        currency: 'XLM',
        reason: 'Event propagation test',
        status: 'pending' as const,
      });

      await payoutsService.updateStatus(payout.id, 'approved');

      // Verify the complete flow worked without errors
      // In a real application, event listeners would handle notifications, analytics, etc.
      const finalUser = await usersService.findById(user.id);
      expect(finalUser).toBeDefined();
    });
  });

  describe('Data Consistency Across Modules', () => {
    it('should maintain referential integrity across all modules', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBCONSISTENCY123456789012345678901234567890123456789012345678901234567890',
      });

      // Create quest
      const quest = await questsService.create({
        title: 'Consistency Quest',
        description: 'Test data consistency',
        rewardAmount: 10,
        maxParticipants: 1,
        requirements: 'Maintain consistency',
        category: 'consistency',
        difficulty: 'easy' as const,
        status: 'active' as const,
      });

      // Create submission linking user and quest
      const submission = await submissionsService.create({
        questId: quest.id,
        userId: user.id,
        content: 'Consistency test',
        proofOfWork: 'consistency_proof',
      });

      // Create payout linking to user
      const payout = await payoutsService.create({
        userId: user.id,
        amount: quest.rewardAmount,
        currency: 'XLM',
        reason: 'Consistency payout',
        status: 'pending' as const,
      });

      // Verify all relationships are maintained
      expect(submission.userId).toBe(user.id);
      expect(submission.questId).toBe(quest.id);
      expect(payout.userId).toBe(user.id);

      // Verify we can query across relationships
      const foundSubmission = await submissionsService.findById(submission.id);
      expect(foundSubmission.userId).toBe(user.id);

      const foundPayout = await payoutsService.findById(payout.id);
      expect(foundPayout.userId).toBe(user.id);
    });
  });
});