import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import { EventStore } from '../../events/entities/event-store.entity';
import * as StellarSdk from 'stellar-sdk';

const mockSpan = { attributes: {} as Record<string, any>, status: 'ok' };
const mockTracing = {
  trace: jest
    .fn()
    .mockImplementation(async (_name: string, fn: any, _attrs?: any) => {
      mockSpan.attributes = { ...(_attrs ?? {}) };
      mockSpan.status = 'ok';
      return fn(mockSpan);
    }),
};
const mockMetricsFactory = () => ({
  incrementCounter: jest.fn(),
  observeHistogram: jest.fn(),
  registerGauge: jest.fn(),
  registerCounter: jest.fn(),
  setGauge: jest.fn(),
});
const mockEventStoreRepository = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation(async (v: any) => v),
  create: jest.fn().mockImplementation((v: any) => v),
});

describe('StellarService (Infrastructure)', () => {
  let service: StellarService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return null;
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      if (key === 'SOROBAN_RPC_URL')
        return 'https://soroban-testnet.stellar.org';
      if (key === 'CONTRACT_ID') return 'C_CONTRACT';

      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: mockMetricsFactory() },
        {
          provide: getRepositoryToken(EventStore),
          useValue: mockEventStoreRepository(),
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize Stellar components on module init', () => {
    expect(service.getHorizon()).toBeDefined();
    expect(service.getRpc()).toBeDefined();
    expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.TESTNET);
  });

  it('should return the correct network passphrase for TESTNET', () => {
    expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.TESTNET);
  });

  it('should return the correct network passphrase for PUBLIC', () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'STELLAR_NETWORK') return 'PUBLIC';
      if (key === 'STELLAR_HORIZON_URL') return 'https://horizon.stellar.org';
      if (key === 'SOROBAN_RPC_URL') return 'https://soroban.stellar.org';
      return null;
    });

    service.onModuleInit();

    expect(service.getNetworkPassphrase()).toBe(StellarSdk.Networks.PUBLIC);
  });

  it('should provide access to the Horizon server', () => {
    const horizon = service.getHorizon();
    expect(horizon).toBeDefined();
    expect(typeof horizon.loadAccount).toBe('function');
  });

  it('should provide access to the RPC server', () => {
    const rpc = service.getRpc();
    expect(rpc).toBeDefined();
    expect(typeof rpc.getLatestLedger).toBe('function');
  });

  it('should default to testnet URLs when not configured', () => {
    mockConfig.get.mockReturnValue(null);

    service.onModuleInit();

    // Should not throw — defaults are applied
    expect(service.getHorizon()).toBeDefined();
    expect(service.getRpc()).toBeDefined();
  });

  it('should fall back to the configured base fee when no fee service is provided', async () => {
    await expect(service.getBaseFeeInStroops()).resolves.toBe(100);
  });
});

describe('StellarService.sendBatchPayments', () => {
  let service: StellarService;
  let metrics: { incrementCounter: jest.Mock; observeHistogram: jest.Mock };
  let mockSubmitTransaction: jest.SpyInstance;

  const adminKeypair = StellarSdk.Keypair.random();

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'SOROBAN_SECRET_KEY') return null;
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      if (key === 'CONTRACT_ID') return 'C_CONTRACT';
      return defaultValue ?? null;
    }),
  };

  beforeEach(async () => {
    metrics = mockMetricsFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: metrics },
        {
          provide: getRepositoryToken(EventStore),
          useValue: mockEventStoreRepository(),
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();

    jest
      .spyOn((service as any).horizonServer, 'loadAccount')
      .mockResolvedValue(
        new StellarSdk.Account(adminKeypair.publicKey(), '1') as any,
      );
    mockSubmitTransaction = jest
      .spyOn((service as any).horizonServer, 'submitTransaction')
      .mockResolvedValue({ hash: 'batch-tx-hash', ledger: 42 } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds a transaction with multiple payment operations', async () => {
    const payments = [
      {
        destination: StellarSdk.Keypair.random().publicKey(),
        amount: 10,
        asset: 'XLM',
      },
      {
        destination: StellarSdk.Keypair.random().publicKey(),
        amount: 20,
        asset: 'XLM',
      },
      {
        destination: StellarSdk.Keypair.random().publicKey(),
        amount: 30,
        asset: 'XLM',
      },
    ];

    const results = await service.sendBatchPayments(payments);

    expect(results).toHaveLength(1);
    expect(results[0].transactionHash).toBe('batch-tx-hash');
    expect(results[0].ledger).toBe(42);
    expect(results[0].operations).toHaveLength(3);
    expect(results[0].operations[0]).toEqual({
      destination: payments[0].destination,
      amount: 10,
      success: true,
    });

    const submittedTx = mockSubmitTransaction.mock.calls[0][0];
    expect(submittedTx.operations).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(submittedTx.operations[i].type).toBe('payment');
    }
  });

  it('splits into multiple transactions when given more than 100 operations', async () => {
    const payments = Array.from({ length: 150 }, (_, i) => ({
      destination: StellarSdk.Keypair.random().publicKey(),
      amount: i + 1,
      asset: 'XLM',
    }));

    mockSubmitTransaction
      .mockResolvedValueOnce({ hash: 'tx-1', ledger: 42 } as any)
      .mockResolvedValueOnce({ hash: 'tx-2', ledger: 43 } as any);

    const results = await service.sendBatchPayments(payments);

    expect(results).toHaveLength(2);
    expect(results[0].transactionHash).toBe('tx-1');
    expect(results[0].operations).toHaveLength(100);
    expect(results[1].transactionHash).toBe('tx-2');
    expect(results[1].operations).toHaveLength(50);

    expect(mockSubmitTransaction).toHaveBeenCalledTimes(2);
    const tx1 = mockSubmitTransaction.mock.calls[0][0];
    const tx2 = mockSubmitTransaction.mock.calls[1][0];
    expect(tx1.operations).toHaveLength(100);
    expect(tx2.operations).toHaveLength(50);
  });
});
