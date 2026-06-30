import { ServiceUnavailableException } from '@nestjs/common';
import { BulkheadService } from './bulkhead.service';

describe('BulkheadService', () => {
  it('queues work when the concurrency limit is reached', async () => {
    const service = new BulkheadService();
    let active = 0;
    let maxActive = 0;

    const first = service.runWithBulkhead('payouts', async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 25));
      active -= 1;
      return 'first';
    }, { maxConcurrent: 1, maxQueueSize: 5 });

    const second = service.runWithBulkhead('payouts', async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      active -= 1;
      return 'second';
    }, { maxConcurrent: 1, maxQueueSize: 5 });

    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
    expect(maxActive).toBe(1);
  });

  it('rejects work when the queue is full', async () => {
    const service = new BulkheadService();
    let release!: () => void;

    const first = service.runWithBulkhead('webhooks', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return 'first';
    }, { maxConcurrent: 1, maxQueueSize: 1 });

    const blocked = service.runWithBulkhead('webhooks', async () => 'blocked', {
      maxConcurrent: 1,
      maxQueueSize: 1,
    });

    const rejected = service.runWithBulkhead('webhooks', async () => 'rejected', {
      maxConcurrent: 1,
      maxQueueSize: 1,
    });

    release();

    await expect(first).resolves.toBe('first');
    await expect(blocked).resolves.toBe('blocked');
    await expect(rejected).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
