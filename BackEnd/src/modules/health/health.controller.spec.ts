import { HealthController } from './health.controller';
import { HealthCheckResult } from './types/health.types';

describe('HealthController queue health', () => {
  const okResult: HealthCheckResult = { status: 'ok', latency: 10 };
  const dependencies = {
    dbHealth: { check: jest.fn().mockResolvedValue(okResult) },
    cacheHealth: { check: jest.fn().mockResolvedValue(okResult) },
    externalHealth: {
      check: jest.fn().mockResolvedValue(okResult),
      checkStellar: jest.fn(),
    },
    metricsService: { getPrometheusOutput: jest.fn() },
    healthCache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
    jobsService: { checkHealth: jest.fn().mockResolvedValue(okResult) },
  };

  const createController = () =>
    new HealthController(
      dependencies.dbHealth as any,
      dependencies.cacheHealth as any,
      dependencies.externalHealth as any,
      dependencies.metricsService as any,
      dependencies.healthCache as any,
      dependencies.jobsService as any,
    );

  const response = () => ({ status: jest.fn() }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    dependencies.dbHealth.check.mockResolvedValue(okResult);
    dependencies.cacheHealth.check.mockResolvedValue(okResult);
    dependencies.externalHealth.check.mockResolvedValue(okResult);
    dependencies.jobsService.checkHealth.mockResolvedValue(okResult);
  });

  it('includes BullMQ health in the deep response', async () => {
    const res = response();
    const result = await createController().deep(res);

    expect(result.services.jobs).toEqual(okResult);
    expect(dependencies.jobsService.checkHealth).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 503 when BullMQ health is down', async () => {
    const res = response();
    const downResult: HealthCheckResult = {
      status: 'down',
      latency: 3000,
      error: 'Redis connection refused',
    };
    dependencies.jobsService.checkHealth.mockResolvedValue(downResult);

    const result = await createController().deep(res);

    expect(result.status).toBe('down');
    expect(result.services.jobs).toEqual(downResult);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('includes BullMQ health in the legacy response', async () => {
    const res = response();
    const result = await createController().root(res);

    expect(result.services.jobs).toEqual(okResult);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
