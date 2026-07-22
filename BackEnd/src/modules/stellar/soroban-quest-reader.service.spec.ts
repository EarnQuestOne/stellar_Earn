import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import * as StellarSdk from '@stellar/stellar-sdk';

const mockScValToNative = jest.fn();

// Mock only scValToNative, leaving other StellarSdk functions intact
jest.mock('@stellar/stellar-sdk', () => {
  const original = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...original,
    scValToNative: (val: any) => mockScValToNative(val),
  };
});

describe('SorobanQuestReaderService', () => {
  let service: SorobanQuestReaderService;
  let tracingService: TracingService;
  let metricsService: MetricsService;
  let mockRpcServer: any;

  // Generate a valid 56-character contract ID starting with 'C' using StrKey.encodeContract
  const validContractId = StellarSdk.StrKey.encodeContract(Buffer.alloc(32));

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'SOROBAN_RPC_URL')
        return 'https://soroban-testnet.stellar.org';
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanQuestReaderService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TracingService, useValue: mockTracing },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<SorobanQuestReaderService>(SorobanQuestReaderService);
    tracingService = module.get<TracingService>(TracingService);
    metricsService = module.get<MetricsService>(MetricsService);

    // Inject mock method onto RPC server instance
    mockRpcServer = (service as any).rpcServer;
    mockRpcServer.simulateTransaction = jest.fn();

    jest.clearAllMocks();
  });

  it('should fetch quest successfully and record success telemetry', async () => {
    const mockRetval = {
      _type: 'struct',
    };

    mockRpcServer.simulateTransaction.mockResolvedValue({
      result: {
        retval: mockRetval,
      },
    });

    // Mock simulateTransaction results
    const originalIsSimulationError = StellarSdk.rpc.Api.isSimulationError;
    const originalIsSimulationSuccess = StellarSdk.rpc.Api.isSimulationSuccess;
    StellarSdk.rpc.Api.isSimulationError = jest.fn().mockReturnValue(false);
    StellarSdk.rpc.Api.isSimulationSuccess = jest.fn().mockReturnValue(true);

    const mockQuestData = {
      id: 'quest_1',
      creator: 'GABC',
      reward_asset: 'XLM',
      reward_amount: 1000n,
      verifier: 'GVERIFIER',
      deadline: 123456n,
      status: 'Active',
      total_claims: 2,
    };
    mockScValToNative.mockReturnValue(mockQuestData);

    const result = await service.getQuest(validContractId, 'quest_1');

    expect(result).toEqual({
      id: 'quest_1',
      creator: 'GABC',
      reward_asset: 'XLM',
      reward_amount: 1000n,
      verifier: 'GVERIFIER',
      deadline: 123456n,
      status: 'Active',
      total_claims: 2,
    });

    // Verify tracing call
    expect(tracingService.trace).toHaveBeenCalledWith(
      'stellar.contract.get_quest',
      expect.any(Function),
      expect.objectContaining({
        'stellar.contract.id': validContractId,
        'stellar.contract.function': 'get_quest',
        'stellar.contract.quest_id': 'quest_1',
      }),
    );

    // Verify tracing span attributes updated
    expect(mockSpan.attributes['stellar.contract.result']).toBe('success');

    // Verify metrics calls
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocations_total',
      { contract_id: validContractId, function: 'get_quest' },
    );

    expect(metricsService.observeHistogram).toHaveBeenCalledWith(
      'stellar_contract_invocation_duration_ms',
      expect.any(Number),
      {
        contract_id: validContractId,
        function: 'get_quest',
        status: 'success',
      },
    );

    // Restore original helpers
    StellarSdk.rpc.Api.isSimulationError = originalIsSimulationError;
    StellarSdk.rpc.Api.isSimulationSuccess = originalIsSimulationSuccess;
  });

  it('should handle simulation errors and record failure telemetry', async () => {
    mockRpcServer.simulateTransaction.mockResolvedValue({
      error: 'Quest not found',
    });

    const originalIsSimulationError = StellarSdk.rpc.Api.isSimulationError;
    StellarSdk.rpc.Api.isSimulationError = jest.fn().mockReturnValue(true);

    const result = await service.getQuest(validContractId, 'quest_1');

    expect(result).toBeNull();

    // Verify trace marked as error
    expect(mockSpan.status).toBe('error');
    expect(mockSpan.attributes['error.message']).toBe('Quest not found');
    expect(mockSpan.attributes['error.type']).toBe('SimulationError');

    // Verify metrics tracked failure
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      {
        contract_id: validContractId,
        function: 'get_quest',
        error_type: 'simulation_error',
      },
    );

    StellarSdk.rpc.Api.isSimulationError = originalIsSimulationError;
  });

  it('should handle unexpected simulation failure states', async () => {
    mockRpcServer.simulateTransaction.mockResolvedValue({});

    const originalIsSimulationError = StellarSdk.rpc.Api.isSimulationError;
    const originalIsSimulationSuccess = StellarSdk.rpc.Api.isSimulationSuccess;
    StellarSdk.rpc.Api.isSimulationError = jest.fn().mockReturnValue(false);
    StellarSdk.rpc.Api.isSimulationSuccess = jest.fn().mockReturnValue(false);

    const result = await service.getQuest(validContractId, 'quest_1');

    expect(result).toBeNull();

    // Verify trace marked as error
    expect(mockSpan.status).toBe('error');
    expect(mockSpan.attributes['error.message']).toBe(
      'Unexpected simulation response',
    );
    expect(mockSpan.attributes['error.type']).toBe('SimulationFailure');

    // Verify metrics tracked failure
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      {
        contract_id: validContractId,
        function: 'get_quest',
        error_type: 'simulation_failure',
      },
    );

    StellarSdk.rpc.Api.isSimulationError = originalIsSimulationError;
    StellarSdk.rpc.Api.isSimulationSuccess = originalIsSimulationSuccess;
  });

  it('should handle general exceptions and record failure telemetry', async () => {
    const error = new Error('Network timeout');
    mockRpcServer.simulateTransaction.mockRejectedValue(error);

    await expect(service.getQuest(validContractId, 'quest_1')).rejects.toThrow(
      'Network timeout',
    );

    // Verify trace marked as error
    expect(mockSpan.status).toBe('error');
    expect(mockSpan.attributes['error.message']).toBe('Network timeout');
    expect(mockSpan.attributes['error.type']).toBe('Error');

    // Verify metrics tracked failure
    expect(metricsService.incrementCounter).toHaveBeenCalledWith(
      'stellar_contract_invocation_failures_total',
      {
        contract_id: validContractId,
        function: 'get_quest',
        error_type: 'exception',
      },
    );

    expect(metricsService.observeHistogram).toHaveBeenCalledWith(
      'stellar_contract_invocation_duration_ms',
      expect.any(Number),
      {
        contract_id: validContractId,
        function: 'get_quest',
        status: 'failure',
      },
    );
  });
});
