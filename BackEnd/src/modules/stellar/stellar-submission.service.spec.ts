import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StellarSubmissionService } from './stellar-submission.service';
import { StellarService } from './stellar.service';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import * as StellarSdk from 'stellar-sdk';

describe('StellarSubmissionService (Security)', () => {
  let service: StellarSubmissionService;
  let tracingService: TracingService;
  let metricsService: MetricsService;
  let mockHorizon: any;
  let mockRpc: any;
  let mockStellarService: any;

  // Generate a valid test keypair for unit testing
  const adminKeypair = StellarSdk.Keypair.random();

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      if (key === 'CONTRACT_ID') return 'C_CONTRACT';

      return null;
    }),
  };

  const mockSpan = {
    attributes: {} as Record<string, any>,
    status: 'ok',
  };

  const mockTracing = {
    trace: jest.fn().mockImplementation(async (name, fn, attrs) => {
      mockSpan.attributes = { ...attrs };
      mockSpan.status = 'ok';
      return fn(mockSpan);
    }),
  };

  const mockMetrics = {
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  };

  beforeEach(async () => {
    mockHorizon = {
      submitTransaction: jest.fn(),
    };
    mockRpc = {};
    mockStellarService = {
      getHorizon: jest.fn().mockReturnValue(mockHorizon),
      getRpc: jest.fn().mockReturnValue(mockRpc),
      getNetworkPassphrase: jest
        .fn()
        .mockReturnValue(StellarSdk.Networks.TESTNET),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarSubmissionService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: mockMetrics },
        { provide: StellarService, useValue: mockStellarService },
      ],
    }).compile();

    service = module.get<StellarSubmissionService>(StellarSubmissionService);
    tracingService = module.get<TracingService>(TracingService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should sign a transaction using the secure config key and record success telemetry', async () => {
    const validPubKey = StellarSdk.Keypair.random().publicKey();

    const sourceAccount = new StellarSdk.Account(validPubKey, '1');

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: mockStellarService.getNetworkPassphrase(),
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

    mockHorizon.submitTransaction.mockResolvedValue({
      hash: '123',
      ledger: 42,
    });

    await service.signAndSubmit(tx);

    expect(tx.signatures.length).toBe(1);
    expect(mockConfig.get).toHaveBeenCalledWith('STELLAR_ADMIN_SECRET');

    // Verify tracing call
    expect(tracingService.trace).toHaveBeenCalledWith(
      'stellar.contract.submit',
      expect.any(Function),
      expect.objectContaining({
        'stellar.contract.id': 'unknown',
        'stellar.contract.function': 'unknown',
      }),
    );

    // Verify trace attributes
    expect(mockSpan.attributes['stellar.tx.ledger']).toBe(42);
    expect(mockSpan.attributes['stellar.tx.status']).toBe('success');

    // Verify metrics calls
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocations_total',
      { contract_id: 'unknown', function: 'unknown' },
    );

    expect(metricsService.observeHistogram).toHaveBeenCalledWith(
      'stellar_contract_invocation_duration_ms',
      expect.any(Number),
      { contract_id: 'unknown', function: 'unknown', status: 'success' },
    );
  });

  it('should handle submission failure and record failure telemetry', async () => {
    const validPubKey = StellarSdk.Keypair.random().publicKey();
    const sourceAccount = new StellarSdk.Account(validPubKey, '1');
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: mockStellarService.getNetworkPassphrase(),
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

    mockHorizon.submitTransaction.mockRejectedValue(
      new Error('Horizon rate limit exceeded'),
    );

    await expect(service.signAndSubmit(tx)).rejects.toThrow(
      'Transaction signing security failure',
    );

    // Verify trace attributes marked as error
    expect(mockSpan.status).toBe('error');
    expect(mockSpan.attributes['error.message']).toBe(
      'Horizon rate limit exceeded',
    );
    expect(mockSpan.attributes['error.type']).toBe('Error');

    // Verify metrics tracked failure
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      {
        contract_id: 'unknown',
        function: 'unknown',
        error_type: 'submission_error',
      },
    );
  });
});

describe('StellarSubmissionService.approveSubmission (Soroban contract call)', () => {
  let service: StellarSubmissionService;
  let metrics: { incrementCounter: jest.Mock; observeHistogram: jest.Mock };
  let mockHorizon: any;
  let mockRpc: any;
  let mockStellarService: any;

  // Real test keypair so we can drive both the source account and the
  // secret-key lookup through the same secret string.
  const adminKeypair = StellarSdk.Keypair.random();

  const APPROVE_CONTRACT_ID = StellarSdk.StrKey.encodeContract(
    Buffer.alloc(32),
  );
  const QUEST_ID = 'quest-1';
  const SUBMITTER = StellarSdk.Keypair.random().publicKey();
  const VERIFIER = StellarSdk.Keypair.random().publicKey();

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'STELLAR_ADMIN_SECRET') return adminKeypair.secret();
      if (key === 'SOROBAN_SECRET_KEY') return null;
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'STELLAR_HORIZON_URL')
        return 'https://horizon-testnet.stellar.org';
      if (key === 'SOROBAN_RPC_URL')
        return 'https://soroban-testnet.stellar.org';
      if (key === 'CONTRACT_ID') return APPROVE_CONTRACT_ID;
      return defaultValue ?? null;
    }),
  };

  const mockSpan = {
    attributes: {} as Record<string, any>,
    status: 'ok',
  };
  const mockTracing = {
    trace: jest.fn().mockImplementation(async (_name, fn, attrs) => {
      mockSpan.attributes = { ...(attrs ?? {}) };
      mockSpan.status = 'ok';
      return fn(mockSpan);
    }),
  };
  const mockMetricsFactory = () => ({
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  });

  beforeEach(async () => {
    metrics = mockMetricsFactory();
    mockHorizon = {
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
    };
    mockRpc = {
      simulateTransaction: jest.fn(),
    };
    mockStellarService = {
      getHorizon: jest.fn().mockReturnValue(mockHorizon),
      getRpc: jest.fn().mockReturnValue(mockRpc),
      getNetworkPassphrase: jest
        .fn()
        .mockReturnValue(StellarSdk.Networks.TESTNET),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarSubmissionService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: metrics },
        { provide: StellarService, useValue: mockStellarService },
      ],
    }).compile();

    service = module.get<StellarSubmissionService>(StellarSubmissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds, simulates, signs, and submits a Soroban approve_submission call', async () => {
    mockHorizon.loadAccount.mockResolvedValue({ sequence: '1' } as any);
    mockRpc.simulateTransaction.mockResolvedValue({
      result: { retval: {} },
    } as any);
    mockHorizon.submitTransaction.mockResolvedValue({
      hash: 'txhash-001',
      ledger: 999,
    } as any);

    const result = await service.approveSubmission(
      QUEST_ID,
      SUBMITTER,
      VERIFIER,
    );

    expect(result).toEqual({
      transactionHash: expect.any(String),
      ledger: 999,
      success: true,
    });

    // RPC simulation was called exactly once.
    expect(mockRpc.simulateTransaction).toHaveBeenCalledTimes(1);

    // Submit was called exactly once.
    expect(mockHorizon.submitTransaction).toHaveBeenCalledTimes(1);

    // The submitted transaction has exactly one invokeContractFunction op.
    const submittedTx = mockHorizon.submitTransaction.mock.calls[0][0];
    expect(submittedTx.operations.length).toBe(1);
    expect(submittedTx.operations[0].type).toBe('invokeHostFunction');

    // Tracing + metrics were emitted by the inner _signAndSubmitContract
    // helper with the explicit contract id + function name.
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocations_total',
      expect.objectContaining({
        contract_id: APPROVE_CONTRACT_ID,
        function: 'approve_submission',
      }),
    );
    expect(metrics.observeHistogram).toHaveBeenCalledWith(
      'stellar_contract_invocation_duration_ms',
      expect.any(Number),
      expect.objectContaining({
        contract_id: APPROVE_CONTRACT_ID,
        function: 'approve_submission',
        status: 'success',
      }),
    );

    // The outer approveSubmission does NOT increment the same counter,
    // so we count the exact number of invocations: exactly one.
    const invocationsCalls = metrics.incrementCounter.mock.calls.filter(
      ([name]: [string]) => name === 'stellar_contract_invocations_total',
    );
    expect(invocationsCalls.length).toBe(1);
  });

  it('throws BadRequestException when the contract simulation rejects the call', async () => {
    mockHorizon.loadAccount.mockResolvedValue({ sequence: '1' } as any);
    mockRpc.simulateTransaction.mockResolvedValue({
      error: 'QuestNotFound',
    } as any);

    await expect(
      service.approveSubmission(QUEST_ID, SUBMITTER, VERIFIER),
    ).rejects.toThrow(BadRequestException);

    // Submit was never called — we abort before payment.
    expect(mockHorizon.submitTransaction).not.toHaveBeenCalled();

    // Failure metric was recorded with simulation_error tag.
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      expect.objectContaining({
        contract_id: APPROVE_CONTRACT_ID,
        function: 'approve_submission',
        error_type: 'simulation_error',
      }),
    );
  });

  it('throws ServiceUnavailableException when STELLAR_ADMIN_SECRET is missing', async () => {
    mockConfig.get.mockImplementation((key: string, def?: any) => {
      if (key === 'STELLAR_ADMIN_SECRET') return null;
      if (key === 'SOROBAN_SECRET_KEY') return null;
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'CONTRACT_ID') return APPROVE_CONTRACT_ID;
      if (key === 'HORIZON_URL') return 'https://horizon-testnet.stellar.org';
      if (key === 'SOROBAN_RPC_URL')
        return 'https://soroban-testnet.stellar.org';
      return def ?? null;
    });

    await expect(
      service.approveSubmission(QUEST_ID, SUBMITTER, VERIFIER),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      expect.objectContaining({
        contract_id: APPROVE_CONTRACT_ID,
        function: 'approve_submission',
        error_type: 'missing_secret',
      }),
    );
  });

  it('throws BadRequestException for missing argument values', async () => {
    await expect(
      service.approveSubmission('', SUBMITTER, VERIFIER),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.approveSubmission(QUEST_ID, '', VERIFIER),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.approveSubmission(QUEST_ID, SUBMITTER, ''),
    ).rejects.toThrow(BadRequestException);
  });
});
