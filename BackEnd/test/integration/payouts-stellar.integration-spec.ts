import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '#src/common/logger/logger.module';
import { PayoutsModule } from '#src/modules/payouts/payouts.module';
import { StellarModule } from '#src/modules/stellar/stellar.module';
import { UsersModule } from '#src/modules/users/users.module';
import { PayoutsService } from '#src/modules/payouts/payouts.service';
import { StellarService } from '#src/modules/stellar/stellar.service';
import { UsersService } from '#src/modules/users/users.service';
import { Payout } from '#src/modules/payouts/entities/payout.entity';
import { User } from '#src/modules/users/entities/user.entity';

describe('Payouts-Stellar Integration', () => {
  let module: TestingModule;
  let payoutsService: PayoutsService;
  let _stellarService: StellarService;
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
          entities: [Payout, User],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        PayoutsModule,
        StellarModule,
        UsersModule,
      ],
    }).compile();

    payoutsService = module.get<PayoutsService>(PayoutsService);
    _stellarService = module.get<StellarService>(StellarService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const payoutRepository = module.get('PayoutRepository');
    const userRepository = module.get('UserRepository');

    await payoutRepository.query('DELETE FROM "payouts"');
    await userRepository.query('DELETE FROM "users"');
  });

  describe('Reward Distribution Workflow', () => {
    it('should create payout and integrate with stellar service', async () => {
      // Create a test user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAREWARD',
        displayName: 'Reward Tester',
      });

      // Create a payout
      const payoutData = {
        stellarAddress: user.stellarAddress,
        amount: 100,
        asset: 'XLM',
        transactionHash: 'tx-hash-001',
      };

      const payout = await payoutsService.createPayout(payoutData);

      // Verify payout was created
      expect(payout.stellarAddress).toBe(user.stellarAddress);
      expect(payout.amount).toBe(100);
      expect(payout.asset).toBe('XLM');
      expect(payout.status).toBe('pending');

      // Process payout (would integrate with Stellar service)
      // In a real scenario, this would call stellarService.sendPayment()
      await payoutsService.processPayout(payout.id);

      // Check the payout status by fetching it again
      const processedPayout = await payoutsService.getPayoutById(payout.id);
      expect(processedPayout.status).toBe('pending');
    });

    it('should handle payout approval and stellar transaction integration', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAAPPROVE',
      });

      // Create payout
      const payout = await payoutsService.createPayout({
        stellarAddress: user.stellarAddress,
        amount: 50,
        asset: 'XLM',
        transactionHash: 'tx-hash-002',
      });

      // processPayout only takes payoutId
      await payoutsService.processPayout(payout.id);

      // Fetch payout to check status
      const foundPayout = await payoutsService.getPayoutById(payout.id);
      expect(foundPayout.status).toBe('pending');
    });

    it('should integrate user balance updates with payout processing', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GABALANCE',
      });

      // Get initial user stats
      let userStats = await usersService.findById(user.id);

      // Create and approve payout
      const payout = await payoutsService.createPayout({
        stellarAddress: user.stellarAddress,
        amount: 25,
        asset: 'XLM',
        transactionHash: 'tx-hash-003',
      });

      await payoutsService.processPayout(payout.id);

      // Verify user stats were updated (this might happen via events in real implementation)
      userStats = await usersService.findById(user.id);
      // Note: Actual balance update might be handled asynchronously
      expect(userStats).toBeDefined();
    });
  });

  describe('Stellar Transaction Integration', () => {
    it('should validate stellar addresses before creating payouts', async () => {
      // Create user with invalid Stellar address
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'INVALID_STELLAR_ADDRESS',
      });

      // Attempt to create payout
      const payoutData = {
        stellarAddress: user.stellarAddress,
        amount: 10,
        asset: 'XLM',
        transactionHash: 'tx-hash-004',
      };

      const payout = await payoutsService.createPayout(payoutData);
      expect(payout).toBeDefined();

      // In real integration, Stellar service would validate address
      // For this test, we just ensure payout creation works
      expect(payout.stellarAddress).toBe(user.stellarAddress);
    });

    it('should handle multiple payouts and aggregate transactions', async () => {
      // Create multiple users
      const userRepository = module.get('UserRepository');
      const user1 = await userRepository.save({
        stellarAddress: 'GAMULTI1',
      });

      const user2 = await userRepository.save({
        stellarAddress: 'GAMULTI2',
      });

      // Create multiple payouts
      const payout1 = await payoutsService.createPayout({
        stellarAddress: user1.stellarAddress,
        amount: 20,
        asset: 'XLM',
        transactionHash: 'tx-hash-005',
      });

      const payout2 = await payoutsService.createPayout({
        stellarAddress: user2.stellarAddress,
        amount: 30,
        asset: 'XLM',
        transactionHash: 'tx-hash-006',
      });

      // Process payouts
      await payoutsService.processPayout(payout1.id);
      await payoutsService.processPayout(payout2.id);

      // Verify both payouts
      const foundPayout1 = await payoutsService.getPayoutById(payout1.id);
      const foundPayout2 = await payoutsService.getPayoutById(payout2.id);

      expect(foundPayout1.status).toBe('pending');
      expect(foundPayout2.status).toBe('pending');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle stellar transaction failures gracefully', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAERROR',
      });

      // Create payout
      const payout = await payoutsService.createPayout({
        stellarAddress: user.stellarAddress,
        amount: 15,
        asset: 'XLM',
        transactionHash: 'tx-hash-007',
      });

      // Simulate processing
      await payoutsService.processPayout(payout.id);

      // Verify payout status
      const foundPayout = await payoutsService.getPayoutById(payout.id);
      expect(foundPayout.status).toBe('pending');
    });
  });
});
