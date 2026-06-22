import { JobsService } from '#src/modules/jobs/jobs.service';

describe('JobsService (unit)', () => {
  let service: JobsService;

  beforeEach(() => {
    service = new JobsService();
  });

  it('should expose getQueue and return undefined for unknown before init', () => {
    expect(service.getQueue('nonexistent')).toBeUndefined();
  });

  it('addJob should throw when queue not found', async () => {
    await expect(service.addJob('nope', {})).rejects.toThrow();
  });

  describe('onModuleDestroy', () => {
    it('should pause workers, close workers, and then close queues sequentially', async () => {
      const callOrder: string[] = [];
      const mockWorker = {
        name: 'test-worker',
        pause: jest.fn().mockImplementation(async () => {
          callOrder.push('worker.pause');
        }),
        close: jest.fn().mockImplementation(async () => {
          callOrder.push('worker.close');
        }),
      };
      const mockQueue = {
        close: jest.fn().mockImplementation(async () => {
          callOrder.push('queue.close');
        }),
      };

      service['workers'] = [mockWorker as any];
      service['queues'] = { 'test-queue': mockQueue as any };

      await service.onModuleDestroy();

      expect(mockWorker.pause).toHaveBeenCalledWith(true);
      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
      expect(callOrder).toEqual([
        'worker.pause',
        'worker.close',
        'queue.close',
      ]);
    });

    it('should force close worker on drain timeout', async () => {
      process.env.WORKER_SHUTDOWN_TIMEOUT_MS = '10';
      let timer: NodeJS.Timeout | undefined = undefined;
      const mockWorker = {
        name: 'slow-worker',
        pause: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              timer = setTimeout(resolve, 50);
            }),
        ),
      };

      service['workers'] = [mockWorker as any];
      service['queues'] = {};

      await service.onModuleDestroy();

      // Should have been force closed (i.e. called close with true)
      expect(mockWorker.close).toHaveBeenCalledWith(true);
      clearTimeout(timer);
      delete process.env.WORKER_SHUTDOWN_TIMEOUT_MS;
    });
  });
});
