import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '#src/common/logger/logger.module';
import { JwtService } from '@nestjs/jwt';

// Import all major modules
import { AuthModule } from '#src/modules/auth/auth.module';
import { UsersModule } from '#src/modules/users/users.module';
import { QuestsModule } from '#src/modules/quests/quests.module';
import { SubmissionsModule } from '#src/modules/submissions/submissions.module';
import { PayoutsModule } from '#src/modules/payouts/payouts.module';
import { StellarModule } from '#src/modules/stellar/stellar.module';
import { NotificationsModule } from '#src/modules/notifications/notifications.module';

// Import services
import { AuthService } from '#src/modules/auth/auth.service';
import { UsersService } from '#src/modules/users/users.service';
import { QuestsService } from '#src/modules/quests/quests.service';
import { SubmissionsService } from '#src/modules/submissions/submissions.service';
import { PayoutsService } from '#src/modules/payouts/payouts.service';
import { StellarService } from '#src/modules/stellar/stellar.service';

// Import entities
import { User } from '#src/modules/users/entities/user.entity';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { Submission } from '#src/modules/submissions/entities/submission.entity';
import { Payout } from '#src/modules/payouts/entities/payout.entity';
import { DataSource } from 'typeorm';
import { RefreshToken } from '#src/modules/auth/entities/refresh-token.entity';

describe('Full Application Integration', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;
  let questsService: QuestsService;
  let submissionsService: SubmissionsService;
  let payoutsService: PayoutsService;
  let _stellarService: StellarService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
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
          entities: [User, Quest, Submission, Payout, RefreshToken],
          autoLoadEntities: true,
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
    })
      .overrideProvider(JwtService)
      .useValue({
        sign: jest.fn().mockReturnValue('test-access-token'),
        verify: jest.fn(),
        signAsync: jest.fn().mockResolvedValue('test-access-token'),
        verifyAsync: jest
          .fn()
          .mockResolvedValue({ stellarAddress: 'test', sub: 'test' }),
        decode: jest.fn(),
      })
      .overrideProvider(StellarService)
      .useValue({
        approveSubmission: jest
          .fn()
          .mockResolvedValue({ transactionHash: 'tx-hash-mock' }),
        sendPayment: jest
          .fn()
          .mockResolvedValue({ transactionHash: 'tx-hash-mock' }),
        getContractId: jest.fn().mockReturnValue('mock-contract-id'),
        getServer: jest.fn(),
      })
      .compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    questsService = module.get<QuestsService>(QuestsService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    payoutsService = module.get<PayoutsService>(PayoutsService);
    _stellarService = module.get<StellarService>(StellarService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up all data between tests (child tables first, then parent)
    const tables = ['refresh_token', 'payout', 'submissions', 'quest', 'user'];
    for (const table of tables) {
      try {
        await module.get('UserRepository').query(`DELETE FROM "${table}"`);
      } catch {
        // Table might not exist in this test setup, continue
      }
    }
  });

  describe('Complete User Journey', () => {
    it('should handle full user journey from registration to payout', async () => {
      const stellarAddress = 'GAFULLJOURNEY';

      // Step 1: User Registration & Authentication
      authService.login(stellarAddress);
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({ stellarAddress });

      expect(user.stellarAddress).toBe(stellarAddress);

      // Step 2: Update User Profile
      const updatedUser = await usersService.update(user.id, {
        ...user,
        displayName: 'Journey Tester',
        bio: 'Testing the complete user journey',
      } as User);

      expect(updatedUser.displayName).toBe('Journey Tester');

      // Step 3: Create a Quest
      const quest = await questsService.create(
        {
          title: 'Complete Journey Quest',
          description: 'Test the entire application flow',
          rewardAmount: 200,
          maxCompletions: 1,
          status: 'ACTIVE',
          contractTaskId: 'task-001',
          rewardAsset: 'XLM',
          verifierType: 'manual',
          verifierConfig: {},
          createdBy: stellarAddress,
        },
        stellarAddress,
      );

      expect(quest.status).toBe('ACTIVE');

      // Step 4: Submit Work to Quest
      const submission = await submissionsService.createSubmission(
        quest.id,
        {
          fileName: 'journey_complete_proof',
          fileContent: 'I have completed the full journey test',
        },
        user.id,
      );

      expect(submission.status).toBe('PENDING');

      // Step 5: Approve Submission
      const approvedSubmission = await submissionsService.approveSubmission(
        submission.id,
        { notes: 'Approved via integration test' },
        user.id,
      );

      expect(approvedSubmission.status).toBe('APPROVED');

      // Step 6: Process Payout
      const payout = await payoutsService.createPayout({
        stellarAddress,
        amount: quest.rewardAmount,
        asset: 'XLM',
        questId: quest.id,
        transactionHash: 'tx-hash-journey',
      });

      expect(payout.amount).toBe(quest.rewardAmount);

      // Step 7: Complete Payout Process
      await module
        .get(DataSource)
        .query(`UPDATE payouts SET status = 'processing' WHERE id = $1`, [
          payout.id,
        ]);
      await payoutsService.processPayout(payout.id);
      const completedPayout = await payoutsService.getPayoutById(payout.id);

      expect(completedPayout.status).toBe('completed');

      // Step 8: Verify Final State
      const finalUser = await usersService.findById(user.id);
      expect(finalUser).toBeDefined();
      expect(finalUser.stellarAddress).toBe(stellarAddress);

      // Verify quest completion
      const finalQuest = await questsService.findOne(quest.id);
      expect(finalQuest).toBeDefined();

      // Verify submission approval
      const finalSubmission = await submissionsService.findOne(submission.id);
      expect(finalSubmission.status).toBe('APPROVED');

      // Verify payout completion
      const finalPayout = await payoutsService.getPayoutById(payout.id);
      expect(finalPayout.status).toBe('completed');
    });

    it('should handle concurrent users completing quests', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const stellarAddress = `GAMULTI${i}`;
        authService.login(stellarAddress);
        const userRepository = module.get('UserRepository');
        const user = await userRepository.save({ stellarAddress });
        users.push(user);
      }

      expect(users).toHaveLength(3);

      // Create a quest that allows multiple participants
      const quest = await questsService.create(
        {
          title: 'Concurrent Quest',
          description: 'Test concurrent quest completions',
          rewardAmount: 50,
          maxCompletions: 5,
          status: 'ACTIVE',
          contractTaskId: 'task-002',
          rewardAsset: 'XLM',
          verifierType: 'manual',
          verifierConfig: {},
          createdBy: users[0].stellarAddress,
        },
        users[0].stellarAddress,
      );

      // All users submit to the quest
      const submissions = [];
      for (const user of users) {
        const submission = await submissionsService.createSubmission(
          quest.id,
          {
            fileName: `proof_${user.id}`,
            fileContent: `Concurrent submission by ${user.stellarAddress}`,
          },
          user.id,
        );
        submissions.push(submission);
      }

      expect(submissions).toHaveLength(3);

      // Approve all submissions (quest creator is the verifier)
      for (const submission of submissions) {
        await submissionsService.approveSubmission(
          submission.id,
          {},
          users[0].id,
        );
      }

      // Create payouts for all users
      const payouts = [];
      for (const user of users) {
        const payout = await payoutsService.createPayout({
          stellarAddress: user.stellarAddress,
          amount: quest.rewardAmount,
          asset: 'XLM',
          questId: quest.id,
          transactionHash: 'tx-hash-concurrent-' + user.id,
        });
        payouts.push(payout);
      }

      expect(payouts).toHaveLength(3);

      // Process all payouts
      const ds = module.get(DataSource);
      for (const payout of payouts) {
        await ds.query(
          `UPDATE payouts SET status = 'processing' WHERE id = $1`,
          [payout.id],
        );
        await payoutsService.processPayout(payout.id);
      }

      // Verify all payouts were processed
      for (const payout of payouts) {
        const finalPayout = await payoutsService.getPayoutById(payout.id);
        expect(finalPayout.status).toBe('completed');
      }
    });
  });

  describe('Cross-Module Event Propagation', () => {
    it('should propagate events across all integrated modules', async () => {
      const stellarAddress = 'GAEVENTS';

      // Authenticate user
      authService.login(stellarAddress);
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({ stellarAddress });

      // Create quest
      const quest = await questsService.create(
        {
          title: 'Events Quest',
          description: 'Test event propagation',
          rewardAmount: 25,
          maxCompletions: 1,
          status: 'ACTIVE',
          contractTaskId: 'task-003',
          rewardAsset: 'XLM',
          verifierType: 'manual',
          verifierConfig: {},
          createdBy: stellarAddress,
        },
        stellarAddress,
      );

      // Submit and approve (this should trigger various events)
      const submission = await submissionsService.createSubmission(
        quest.id,
        {
          fileName: 'event_proof',
          fileContent: 'Event test submission',
        },
        user.id,
      );

      await submissionsService.approveSubmission(submission.id, {}, user.id);

      // Create and process payout
      const payout = await payoutsService.createPayout({
        stellarAddress,
        amount: quest.rewardAmount,
        asset: 'XLM',
        questId: quest.id,
        transactionHash: 'tx-hash-events',
      });

      const ds = module.get(DataSource);
      await ds.query(`UPDATE payouts SET status = 'processing' WHERE id = $1`, [
        payout.id,
      ]);
      await payoutsService.processPayout(payout.id);

      // Verify the complete flow worked without errors
      // In a real application, event listeners would handle notifications, analytics, etc.
      const finalUser = await usersService.findById(user.id);
      expect(finalUser).toBeDefined();
    });
  });

  describe('Data Consistency Across Modules', () => {
    it('should maintain referential integrity across all modules', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GACONSISTENCY',
      });

      // Create quest
      const quest = await questsService.create(
        {
          title: 'Consistency Quest',
          description: 'Test data consistency',
          rewardAmount: 10,
          maxCompletions: 1,
          status: 'ACTIVE',
          contractTaskId: 'task-004',
          rewardAsset: 'XLM',
          verifierType: 'manual',
          verifierConfig: {},
          createdBy: user.stellarAddress,
        },
        user.stellarAddress,
      );

      // Create submission linking user and quest
      const submission = await submissionsService.createSubmission(
        quest.id,
        {
          fileName: 'consistency_proof',
          fileContent: 'Consistency test',
        },
        user.id,
      );

      // Create payout linking to user
      const payout = await payoutsService.createPayout({
        stellarAddress: user.stellarAddress,
        amount: quest.rewardAmount,
        asset: 'XLM',
        questId: quest.id,
        transactionHash: 'tx-hash-consistency',
      });

      // Verify all relationships are maintained
      expect(submission.userId).toBe(user.id);
      expect(submission.questId).toBe(quest.id);
      expect(payout.stellarAddress).toBe(user.stellarAddress);

      // Verify we can query across relationships
      const foundSubmission = await submissionsService.findOne(submission.id);
      expect(foundSubmission.userId).toBe(user.id);

      const foundPayout = await payoutsService.getPayoutById(payout.id);
      expect(foundPayout.stellarAddress).toBe(user.stellarAddress);
    });
  });
});
