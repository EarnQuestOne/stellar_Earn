import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../src/modules/stellar/stellar.service';
import { Account, Asset, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

describe('Transaction Signing Security', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STELLAR_SECRET_KEY') return 'SCTV6K62W7X6Y5YF7S6O4L2M6G6Y5YF7S6O4L2M6G6Y5YF7S6O4L2M6'; // Fake test key
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              return 'https://horizon-testnet.stellar.org';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  it('should successfully sign a transaction', () => {
    const sourceAccount = new Account('GD...any_public_key', '1');
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: service.getNetworkPassphrase(),
    })
      .addOperation(Operation.payment({
        destination: 'GD...dest',
        asset: Asset.native(),
        amount: '10',
      }))
      .setTimeout(30)
      .build();

    tx.sign(Keypair.fromSecret('SCTV6K62W7X6Y5YF7S6O4L2M6G6Y5YF7S6O4L2M6G6Y5YF7S6O4L2M6'));
    expect(tx.signatures.length).toBe(1);
  });
});