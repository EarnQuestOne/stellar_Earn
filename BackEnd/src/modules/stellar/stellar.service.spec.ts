import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';

describe('StellarService (Security)', () => {
  let service: StellarService;

  // Generate a valid test keypair for unit testing
  const adminKeypair = StellarSdk.Keypair.random();

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';

      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should sign a transaction using the secure config key', async () => {
    const validPubKey = StellarSdk.Keypair.random().publicKey();

    const sourceAccount = new StellarSdk.Account(validPubKey, '1');

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: service.getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: validPubKey,
          asset: StellarSdk.Asset.native(),
          amount: '1',
        }),
      )
      .setTimeout(30)
      .build();

    expect(tx.signatures.length).toBe(0);

    jest
      .spyOn((service as any).horizonServer, 'submitTransaction')
      .mockResolvedValue({ hash: '123' });

    await service.signAndSubmit(tx);

    expect(tx.signatures.length).toBe(1);
    expect(mockConfig.get).toHaveBeenCalledWith('STELLAR_ADMIN_SECRET');
  });
});