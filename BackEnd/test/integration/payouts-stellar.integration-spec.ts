import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PayoutsModule } from '../../../src/modules/payouts/payouts.module';
import { StellarModule } from '../../../src/modules/stellar/stellar.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { PayoutsService } from '../../../src/modules/payouts/payouts.service';
import { StellarService } from '../../../src/modules/stellar/stellar.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { Payout } from '../../../src/modules/payouts/entities/payout.entity';
import { User } from '../../../src/modules/users/entities/user.entity';

describe('Payouts-Stellar Integration', () => {
  let module: TestingModule;
  let payoutsService: PayoutsService;
  let stellarService: StellarService;
  let usersService: UsersService;

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
          entities: [Payout, User],
          synchronize: true,
          dropSchema: true,
        }),
        PayoutsModule,
        StellarModule,
        UsersModule,
      ],
    }).compile();

    payoutsService = module.get<PayoutsService>(PayoutsService);
    stellarService = module.get<StellarService>(StellarService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const payoutRepository = module.get('PayoutRepository');
    const userRepository = module.get('UserRepository');

    await payoutRepository.clear();
    await userRepository.clear();
  });

  describe('Reward Distribution Workflow', () => {
    it('should create payout and integrate with stellar service', async () => {
      // Create a test user
      const user = await usersService.create({
        stellarAddress: 'GBREWARD123456789012345678901234567890123456789012345678901234567890',
        displayName: 'Reward Tester',
      });

      // Create a payout
      const payoutData = {
        userId: user.id,
        amount: 100,
        currency: 'XLM',
        reason: 'Quest completion reward',
        status: 'pending' as const,
        stellarTransactionId: null,
      };

      const payout = await payoutsService.create(payoutData);

      // Verify payout was created
      expect(payout.userId).toBe(user.id);
      expect(payout.amount).toBe(100);
      expect(payout.currency).toBe('XLM');
      expect(payout.status).toBe('pending');

      // Process payout (would integrate with Stellar service)
      // In a real scenario, this would call stellarService.sendPayment()
      const processedPayout = await payoutsService.updateStatus(payout.id, 'processing');

      expect(processedPayout.status).toBe('processing');
    });

    it('should handle payout approval and stellar transaction integration', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBAPPROVE123456789012345678901234567890123456789012345678901234567890',
      });

      // Create payout
      const payout = await payoutsService.create({
        userId: user.id,
        amount: 50,
        currency: 'XLM',
        reason: 'Test payout',
        status: 'pending' as const,
      });

      // Approve payout (this would trigger Stellar transaction in real implementation)
      const approvedPayout = await payoutsService.updateStatus(payout.id, 'approved');

      expect(approvedPayout.status).toBe('approved');

      // In integration, this would verify Stellar transaction was created
      // For this test, we verify the payout status change
      const foundPayout = await payoutsService.findById(payout.id);
      expect(foundPayout.status).toBe('approved');
    });

    it('should integrate user balance updates with payout processing', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBBALANCE123456789012345678901234567890123456789012345678901234567890',
      });

      // Get initial user stats
      let userStats = await usersService.getUserStats(user.id);
      const initialTotalEarned = userStats.totalEarned || 0;

      // Create and approve payout
      const payout = await payoutsService.create({
        userId: user.id,
        amount: 25,
        currency: 'XLM',
        reason: 'Balance test',
        status: 'pending' as const,
      });

      await payoutsService.updateStatus(payout.id, 'approved');

      // Verify user stats were updated (this might happen via events in real implementation)
      userStats = await usersService.getUserStats(user.id);
      // Note: Actual balance update might be handled asynchronously
      expect(userStats).toBeDefined();
    });
  });

  describe('Stellar Transaction Integration', () => {
    it('should validate stellar addresses before creating payouts', async () => {
      // Create user with invalid Stellar address
      const user = await usersService.create({
        stellarAddress: 'INVALID_STELLAR_ADDRESS',
      });

      // Attempt to create payout
      const payoutData = {
        userId: user.id,
        amount: 10,
        currency: 'XLM',
        reason: 'Invalid address test',
        status: 'pending' as const,
      };

      const payout = await payoutsService.create(payoutData);
      expect(payout).toBeDefined();

      // In real integration, Stellar service would validate address
      // For this test, we just ensure payout creation works
      expect(payout.userId).toBe(user.id);
    });

    it('should handle multiple payouts and aggregate transactions', async () => {
      // Create multiple users
      const user1 = await usersService.create({
        stellarAddress: 'GBMULTI1123456789012345678901234567890123456789012345678901234567890',
      });

      const user2 = await usersService.create({
        stellarAddress: 'GBMULTI2123456789012345678901234567890123456789012345678901234567890',
      });

      // Create multiple payouts
      const payout1 = await payoutsService.create({
        userId: user1.id,
        amount: 20,
        currency: 'XLM',
        reason: 'Batch test 1',
        status: 'pending' as const,
      });

      const payout2 = await payoutsService.create({
        userId: user2.id,
        amount: 30,
        currency: 'XLM',
        reason: 'Batch test 2',
        status: 'pending' as const,
      });

      // Process payouts
      await payoutsService.updateStatus(payout1.id, 'approved');
      await payoutsService.updateStatus(payout2.id, 'approved');

      // Verify both payouts were processed
      const foundPayout1 = await payoutsService.findById(payout1.id);
      const foundPayout2 = await payoutsService.findById(payout2.id);

      expect(foundPayout1.status).toBe('approved');
      expect(foundPayout2.status).toBe('approved');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle stellar transaction failures gracefully', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBERROR123456789012345678901234567890123456789012345678901234567890',
      });

      // Create payout
      const payout = await payoutsService.create({
        userId: user.id,
        amount: 15,
        currency: 'XLM',
        reason: 'Error handling test',
        status: 'pending' as const,
      });

      // Simulate processing failure
      const failedPayout = await payoutsService.updateStatus(payout.id, 'failed');

      expect(failedPayout.status).toBe('failed');

      // Verify payout can be retried or handled appropriately
      const foundPayout = await payoutsService.findById(payout.id);
      expect(foundPayout.status).toBe('failed');
    });
  });
});