import { JobsService } from './jobs.service';

describe('JobsService queue health', () => {
  let service: JobsService;

  beforeEach(() => {
    service = new JobsService({} as any, {} as any);
  });

  it('returns ok after Redis ping succeeds for every initialized queue', async () => {
    const ping = jest.fn().mockResolvedValue('PONG');
    const queues = {
      notifications: {
        waitUntilReady: jest.fn().mockResolvedValue({ ping }),
      },
      payouts: {
        waitUntilReady: jest.fn().mockResolvedValue({ ping }),
      },
    };
    (service as any).queues = queues;

    const result = await service.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.error).toBeUndefined();
    expect(queues.notifications.waitUntilReady).toHaveBeenCalledTimes(1);
    expect(queues.payouts.waitUntilReady).toHaveBeenCalledTimes(1);
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('returns down when a queue cannot connect to Redis', async () => {
    const queues = {
      notifications: {
        waitUntilReady: jest
          .fn()
          .mockRejectedValue(new Error('Redis connection refused')),
      },
    };
    (service as any).queues = queues;

    const result = await service.checkHealth();

    expect(result.status).toBe('down');
    expect(result.error).toBe('Redis connection refused');
  });

  it('returns down when no queues have been initialized', async () => {
    const result = await service.checkHealth();

    expect(result.status).toBe('down');
    expect(result.error).toBe('No BullMQ queues are initialized');
  });
});
