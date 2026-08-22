import { Test, TestingModule } from '@nestjs/testing';
import { VerificationDedupService } from './verification-dedup.service';
import { MetricsService } from './metrics.service';

const createMockMetrics = () => ({
  incrementCounter: jest.fn(),
  setGauge: jest.fn(),
  observeHistogram: jest.fn(),
  registerCounter: jest.fn(),
  registerGauge: jest.fn(),
  registerHistogram: jest.fn(),
  getPrometheusOutput: jest.fn(),
  getSnapshot: jest.fn(),
});

describe('VerificationDedupService', () => {
  let service: VerificationDedupService;
  let metrics: ReturnType<typeof createMockMetrics>;

  beforeEach(async () => {
    metrics = createMockMetrics();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationDedupService,
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get<VerificationDedupService>(VerificationDedupService);
  });

  afterEach(() => {
    service.clearAll();
  });

  it('executes the operation and caches the result on success', async () => {
    const operation = jest.fn().mockResolvedValue('result-1');

    const result = await service.executeWithDedup('key-1', operation, 5000);

    expect(result).toBe('result-1');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on subsequent calls within TTL', async () => {
    const operation = jest.fn().mockResolvedValue('cached-result');

    const first = await service.executeWithDedup('key-2', operation, 5000);
    const second = await service.executeWithDedup('key-2', operation, 5000);

    expect(first).toBe('cached-result');
    expect(second).toBe('cached-result');
    // Operation should only be called once — second call hits cache
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent in-flight requests for the same key', async () => {
    let resolveOp: (v: string) => void;
    const opPromise = new Promise<string>((resolve) => {
      resolveOp = resolve;
    });
    const operation = jest.fn().mockReturnValue(opPromise);

    const call1 = service.executeWithDedup('key-3', operation, 5000);
    const call2 = service.executeWithDedup('key-3', operation, 5000);

    resolveOp!('inflight-result');

    const [r1, r2] = await Promise.all([call1, call2]);

    expect(r1).toBe('inflight-result');
    expect(r2).toBe('inflight-result');
    // Operation should only be called once — second call hit in-flight map
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache results after TTL expires', async () => {
    const operation = jest.fn().mockResolvedValue('fresh');

    await service.executeWithDedup('key-4', operation, 10);
    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 20));
    await service.executeWithDedup('key-4', operation, 10);

    // After TTL expiry the operation runs again
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache failures', async () => {
    const failOp = jest.fn().mockRejectedValue(new Error('fail'));

    await expect(
      service.executeWithDedup('key-5', failOp, 5000),
    ).rejects.toThrow('fail');

    // After a failure, the cache should not be populated.
    // A subsequent call should re-invoke the operation.
    const successOp = jest.fn().mockResolvedValue('recovered');

    const result = await service.executeWithDedup('key-5', successOp, 5000);

    expect(result).toBe('recovered');
    expect(failOp).toHaveBeenCalledTimes(1);
    expect(successOp).toHaveBeenCalledTimes(1);
  });

  it('does NOT treat a previous in-flight entry as a cache hit for later calls', async () => {
    // Fill the cache with a successful entry
    const op1 = jest.fn().mockResolvedValue('done');
    await service.executeWithDedup('key-6', op1, 5000);

    // Now verify that a call that arrives after completion gets the cached
    // result without re-executing.
    const op2 = jest.fn().mockResolvedValue('should-not-be-called');
    const cached = await service.executeWithDedup('key-6', op2, 5000);
    expect(cached).toBe('done');
    expect(op2).not.toHaveBeenCalled();
  });

  it('tracks in-flight count and cache size', async () => {
    expect(service.inflightCount()).toBe(0);
    expect(service.cacheSize()).toBe(0);

    await service.executeWithDedup(
      'size-key',
      jest.fn().mockResolvedValue('val'),
      5000,
    );

    expect(service.cacheSize()).toBe(1);
    expect(service.inflightCount()).toBe(0);
  });

  it('clear() removes both in-flight and cached entries for a key', async () => {
    const op = jest.fn().mockResolvedValue('val');
    await service.executeWithDedup('clear-key', op, 5000);
    expect(service.cacheSize()).toBe(1);

    service.clear('clear-key');
    expect(service.cacheSize()).toBe(0);

    const op2 = jest.fn().mockResolvedValue('fresh');
    await service.executeWithDedup('clear-key', op2, 5000);
    expect(op2).toHaveBeenCalledTimes(1);
  });

  it('clearAll() wipes all state', async () => {
    await service.executeWithDedup('a', jest.fn().mockResolvedValue(1), 5000);
    await service.executeWithDedup('b', jest.fn().mockResolvedValue(2), 5000);
    expect(service.cacheSize()).toBe(2);

    service.clearAll();
    expect(service.cacheSize()).toBe(0);
    expect(service.inflightCount()).toBe(0);
  });

  it('clears in-flight entry when the operation rejects', async () => {
    const failOp = jest.fn().mockRejectedValue(new Error('nope'));

    await expect(
      service.executeWithDedup('inflight-cleanup', failOp, 5000),
    ).rejects.toThrow('nope');

    // After rejection, the in-flight entry should be gone
    expect(service.inflightCount()).toBe(0);

    // A subsequent call should succeed
    const successOp = jest.fn().mockResolvedValue('ok');
    const result = await service.executeWithDedup(
      'inflight-cleanup',
      successOp,
      5000,
    );
    expect(result).toBe('ok');
  });

  it('increments the cache-hit counter on cached responses', async () => {
    const op = jest.fn().mockResolvedValue('cached');
    await service.executeWithDedup('metrics-key', op, 5000);
    await service.executeWithDedup('metrics-key', op, 5000);

    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'submission_approval_cache_hits_total',
      { dedup_key: 'metrics-key' },
    );
  });

  it('increments the dedup-hit counter on in-flight reuse', async () => {
    let resolveOp: (v: string) => void;
    const slow = new Promise<string>((resolve) => {
      resolveOp = resolve;
    });
    const op = jest.fn().mockReturnValue(slow);

    const call1 = service.executeWithDedup('inflight-metrics', op, 5000);
    const call2 = service.executeWithDedup('inflight-metrics', op, 5000);

    resolveOp!('done');
    await Promise.all([call1, call2]);

    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'submission_approval_dedup_hits_total',
      { dedup_key: 'inflight-metrics' },
    );
  });
});
