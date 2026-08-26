import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../../common/services/metrics.service';
import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';
import { StellarFeeService } from './stellar-fee.service';

describe('StellarFeeService', () => {
  let service: StellarFeeService;
  let mockHorizon: { feeStats: jest.Mock };
  let mockMetrics: {
    registerGauge: jest.Mock;
    registerCounter: jest.Mock;
    setGauge: jest.Mock;
    incrementCounter: jest.Mock;
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'STELLAR_FEE_CACHE_TTL_MS') return '30000';
      if (key === 'STELLAR_BASE_FEE') return '100';
      return null;
    }),
  };

  const mockClientPool = {
    getHorizonServer: jest.fn(),
  };

  beforeEach(async () => {
    mockHorizon = { feeStats: jest.fn() };
    mockClientPool.getHorizonServer.mockReturnValue(mockHorizon);
    mockMetrics = {
      registerGauge: jest.fn(),
      registerCounter: jest.fn(),
      setGauge: jest.fn(),
      incrementCounter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarFeeService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: SorobanRpcClientPoolService, useValue: mockClientPool },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<StellarFeeService>(StellarFeeService);
  });

  /** Lets a background (non-awaited) refresh settle. */
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('should warm the cache from fee stats on module init', async () => {
    mockHorizon.feeStats.mockResolvedValue({ last_ledger_base_fee: '150' });

    service.onModuleInit();
    await flush();

    expect(mockHorizon.feeStats).toHaveBeenCalledTimes(1);
    await expect(service.getBaseFeeInStroops()).resolves.toBe(150);
  });

  it('should serve the cached fee without hitting the network again', async () => {
    mockHorizon.feeStats.mockResolvedValue({ last_ledger_base_fee: '150' });
    service.onModuleInit();
    await flush();

    await service.getBaseFeeInStroops();
    await service.getBaseFeeInStroops();
    await service.getBaseFeeInStroops();

    expect(mockHorizon.feeStats).toHaveBeenCalledTimes(1);
    expect(mockMetrics.incrementCounter).toHaveBeenCalledWith(
      'stellar_fee_cache_hits_total',
    );
  });

  it('should fall back to the configured base fee when the network fetch fails', async () => {
    mockHorizon.feeStats.mockRejectedValue(new Error('network down'));
    service.onModuleInit();
    await flush();

    await expect(service.getBaseFeeInStroops()).resolves.toBe(100);
    expect(mockMetrics.incrementCounter).toHaveBeenCalledWith(
      'stellar_fee_fetch_failures_total',
    );
  });

  it('should keep serving the last known fee when a refresh fails', async () => {
    mockHorizon.feeStats
      .mockResolvedValueOnce({ last_ledger_base_fee: '150' })
      .mockRejectedValueOnce(new Error('network down'));
    service.onModuleInit();
    await flush();

    // Force the cached value to be stale so the next read refreshes.
    (service as any).lastFetchedAt = Date.now() - 60_000;
    await service.getBaseFeeInStroops();
    await flush();

    await expect(service.getBaseFeeInStroops()).resolves.toBe(150);
  });

  it('should serve a stale value immediately while refreshing in the background', async () => {
    mockHorizon.feeStats.mockResolvedValue({ last_ledger_base_fee: '150' });
    service.onModuleInit();
    await flush();

    (service as any).lastFetchedAt = Date.now() - 60_000;
    mockHorizon.feeStats.mockClear();

    await expect(service.getBaseFeeInStroops()).resolves.toBe(150);
    expect(mockHorizon.feeStats).toHaveBeenCalledTimes(1);
  });

  it('should single-flight concurrent refreshes', async () => {
    mockHorizon.feeStats.mockResolvedValue({ last_ledger_base_fee: '150' });

    const first = service.refreshFeeEstimate();
    const second = service.refreshFeeEstimate();
    await Promise.all([first, second]);

    expect(mockHorizon.feeStats).toHaveBeenCalledTimes(1);
  });

  it('should expose the estimated fee via the metrics gauge', async () => {
    mockHorizon.feeStats.mockResolvedValue({ last_ledger_base_fee: '250' });
    service.onModuleInit();
    await flush();

    expect(mockMetrics.setGauge).toHaveBeenCalledWith(
      'stellar_fee_estimate_stroops',
      250,
    );
  });
});
