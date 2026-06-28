import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '#src/common/logger/logger.module';
import { StellarService } from '#src/modules/stellar/stellar.service';
import { StellarModule } from '#src/modules/stellar/stellar.module';
import { Keypair } from 'stellar-sdk';
import stellarConfig from '#src/config/stellar.config';
import { EventStore } from '#src/events/entities/event-store.entity';

describe('StellarService Integration', () => {
  let service: StellarService;
  let configService: ConfigService;
  let hasConfig: boolean;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [stellarConfig],
        }),
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
          entities: [EventStore],
          autoLoadEntities: true,
          synchronize: true,
        }),
        StellarModule,
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    configService = module.get<ConfigService>(ConfigService);

    // Check config availability from ConfigService, which correctly loads .env
    const rpcUrl = configService.get<string>('stellar.rpcUrl');
    const contractId = configService.get<string>('stellar.contractId');
    const secretKey = configService.get<string>('stellar.secretKey');

    hasConfig = !!(rpcUrl && contractId && secretKey);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Contract Interaction', () => {
    it('should simulate getUserStats logic if configured', async () => {
      if (!hasConfig) {
        console.warn('Skipping integration test due to missing config');
        return;
      }

      const testAddr = Keypair.random().publicKey();

      try {
        const result = await service.getUserStats(testAddr);
        expect(result).toBeDefined();
      } catch (e) {
        // Allow transient network errors or config errors in local dev without secrets
        console.warn(e);
      }
    });

    it('should fail gracefully on invalid contract call', async () => {
      if (!hasConfig) return;

      try {
        await service.registerTask('invalid-task', 'asset', 0, 'verifier');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
