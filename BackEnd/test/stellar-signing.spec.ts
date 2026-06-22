import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarService } from '#src/modules/stellar/stellar.service';
import { TracingService } from '#src/common/tracing/tracing.service';
import { MetricsService } from '#src/common/services/metrics.service';
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from 'stellar-sdk';
import { EventStore } from '#src/events/entities/event-store.entity';

describe('Transaction Signing Security', () => {
  let service: StellarService;
  const signingKeypair = Keypair.random();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STELLAR_ADMIN_SECRET')
                return signingKeypair.secret();
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              return 'https://horizon-testnet.stellar.org';
            }),
          },
        },
        {
          provide: getRepositoryToken(EventStore),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: TracingService,
          useValue: {
            trace: jest.fn((_, fn) => fn({ attributes: {}, status: 'ok' })),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCounter: jest.fn(),
            observeHistogram: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();
  });

  it('should successfully sign a transaction', () => {
    const sourceAccount = new Account(Keypair.random().publicKey(), '1');
    const destination = Keypair.random().publicKey();
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: service.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount: '10',
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(signingKeypair);
    expect(tx.signatures.length).toBe(1);
  });
});
