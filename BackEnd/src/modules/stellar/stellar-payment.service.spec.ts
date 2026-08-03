import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarPaymentService } from './stellar-payment.service';
import { StellarService } from './stellar.service';
import * as StellarSdk from 'stellar-sdk';

describe('StellarPaymentService', () => {
  let service: StellarPaymentService;
  let mockHorizon: any;
  let mockStellarService: any;

  const adminKeypair = StellarSdk.Keypair.random();
  const RECIPIENT = StellarSdk.Keypair.random().publicKey();

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'SOROBAN_SECRET_KEY') return null;
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      return null;
    }),
  };

  beforeEach(async () => {
    mockHorizon = {
      loadAccount: jest
        .fn()
        .mockResolvedValue(
          new StellarSdk.Account(adminKeypair.publicKey(), '1'),
        ),
      submitTransaction: jest.fn(),
    };
    mockStellarService = {
      getHorizon: jest.fn().mockReturnValue(mockHorizon),
      getNetworkPassphrase: jest
        .fn()
        .mockReturnValue(StellarSdk.Networks.TESTNET),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarPaymentService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: StellarService, useValue: mockStellarService },
      ],
    }).compile();

    service = module.get<StellarPaymentService>(StellarPaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send an XLM payment via Horizon', async () => {
    mockHorizon.submitTransaction.mockResolvedValue({
      hash: 'txhash-payment-001',
      ledger: 888,
    } as any);

    const result = await service.sendPayment(RECIPIENT, 100);

    expect(result).toEqual({
      transactionHash: 'txhash-payment-001',
      ledger: 888,
    });

    expect(mockHorizon.loadAccount).toHaveBeenCalledTimes(1);
    expect(mockHorizon.submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = mockHorizon.submitTransaction.mock.calls[0][0];
    expect(submittedTx.operations.length).toBe(1);
    expect(submittedTx.operations[0].type).toBe('payment');

    // Verify the payment destination
    const paymentOp = submittedTx.operations[0];
    expect(paymentOp.destination).toBe(RECIPIENT);
  });

  it('should throw when no secret key is configured', async () => {
    mockConfig.get.mockReturnValue(null);

    await expect(service.sendPayment(RECIPIENT, 100)).rejects.toThrow(
      'No Stellar secret key configured for payments',
    );
  });

  it('should use SOROBAN_SECRET_KEY as fallback when STELLAR_ADMIN_SECRET is not set', async () => {
    const fallbackKeypair = StellarSdk.Keypair.random();
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return null;
      if (key === 'SOROBAN_SECRET_KEY') return fallbackKeypair.secret();
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      return null;
    });

    mockHorizon.submitTransaction.mockResolvedValue({
      hash: 'txhash-fallback-001',
      ledger: 777,
    } as any);

    const result = await service.sendPayment(RECIPIENT, 50);

    expect(result.transactionHash).toBe('txhash-fallback-001');
    expect(mockConfig.get).toHaveBeenCalledWith('SOROBAN_SECRET_KEY');
  });
});
