import { Test, TestingModule } from '@nestjs/testing';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { Queue } from 'bullmq';

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      getJobs: jest.fn().mockResolvedValue([]),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('DeadLetterQueueService', () => {
  let service: DeadLetterQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeadLetterQueueService],
    }).compile();

    service = module.get<DeadLetterQueueService>(DeadLetterQueueService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return zero metrics when DLQ queue is unavailable', async () => {
      // Force getDlqQueue to return null by making Queue throw
      (Queue as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const metrics = await service.getMetrics();

      expect(metrics.total).toBe(0);
      expect(metrics.bySourceQueue).toEqual({});
      expect(metrics.oldestJobAge).toBeNull();
    });
  });

  describe('listDeadJobs', () => {
    it('should return empty list when DLQ queue is unavailable', async () => {
      (Queue as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.listDeadJobs();

      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('replayJob', () => {
    it('should fail gracefully when DLQ queue is unavailable', async () => {
      (Queue as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.replayJob('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('unavailable');
    });
  });

  describe('replayAll', () => {
    it('should return zero counts when DLQ queue is unavailable', async () => {
      (Queue as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.replayAll();

      expect(result.replayed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('purge', () => {
    it('should return zero purged when DLQ queue is unavailable', async () => {
      (Queue as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.purge();

      expect(result.purged).toBe(0);
    });
  });
});
