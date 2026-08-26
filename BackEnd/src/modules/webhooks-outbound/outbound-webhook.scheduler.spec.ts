import { Test, TestingModule } from '@nestjs/testing';
import { OutboundWebhookScheduler } from './outbound-webhook.scheduler';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

describe('OutboundWebhookScheduler', () => {
  let scheduler: OutboundWebhookScheduler;
  let dispatcher: { claimDueDeliveries: jest.Mock };

  beforeEach(async () => {
    dispatcher = { claimDueDeliveries: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundWebhookScheduler,
        { provide: WebhookDispatcherService, useValue: dispatcher },
      ],
    }).compile();

    scheduler = moduleRef.get(OutboundWebhookScheduler);
  });

  it('is defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('claims due deliveries on tick', async () => {
    dispatcher.claimDueDeliveries.mockResolvedValue([
      { id: 'del-1' },
      { id: 'del-2' },
    ]);
    await scheduler.processDueDeliveries();
    expect(dispatcher.claimDueDeliveries).toHaveBeenCalledTimes(1);
  });

  it('swallows dispatcher errors (a bad tick must not kill the cron)', async () => {
    dispatcher.claimDueDeliveries.mockRejectedValue(new Error('db down'));
    await expect(scheduler.processDueDeliveries()).resolves.toBeUndefined();
  });
});
