import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';
import { MetricsService } from '../../common/services/metrics.service';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  const subscriptions = { find: jest.fn() };
  const deliveries = { create: jest.fn(), save: jest.fn() };
  const jobsService = { addJob: jest.fn() };
  const metrics = {
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  };

  const activeSubscription = {
    id: 'sub-1',
    eventType: 'quest.created',
    targetUrl: 'https://consumer.example.com/hooks',
    secretEncrypted: 'v1:encrypted',
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDispatcherService,
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptions,
        },
        { provide: getRepositoryToken(WebhookDelivery), useValue: deliveries },
        { provide: JobsService, useValue: jobsService },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get(WebhookDispatcherService);
  });

  it('does nothing when no subscription matches the event type', async () => {
    subscriptions.find.mockResolvedValue([]);

    await service.dispatch('quest.created', { questId: 'q1' });

    expect(deliveries.save).not.toHaveBeenCalled();
    expect(jobsService.addJob).not.toHaveBeenCalled();
  });

  it('only matches active subscriptions for the event type', async () => {
    subscriptions.find.mockResolvedValue([activeSubscription]);

    await service.dispatch('quest.created', { questId: 'q1' });

    expect(subscriptions.find).toHaveBeenCalledWith({
      where: { eventType: 'quest.created', isActive: true },
    });
  });

  it('persists a delivery and enqueues one job per matching subscription', async () => {
    subscriptions.find.mockResolvedValue([activeSubscription]);
    deliveries.create.mockImplementation((input) => input);
    deliveries.save.mockImplementation((input) =>
      Promise.resolve({ id: 'delivery-1', ...input }),
    );
    jobsService.addJob.mockResolvedValue({ id: 'job-1' });

    const result = await service.dispatch('quest.created', { questId: 'q1' });

    expect(deliveries.save).toHaveBeenCalledTimes(1);
    expect(jobsService.addJob).toHaveBeenCalledTimes(1);
    expect(jobsService.addJob.mock.calls[0][0]).toBe(QUEUES.WEBHOOKS_OUTBOUND);
    const payload = jobsService.addJob.mock.calls[0][1];
    expect(payload).toMatchObject({
      deliveryId: 'delivery-1',
      subscriptionId: 'sub-1',
      eventType: 'quest.created',
      targetUrl: 'https://consumer.example.com/hooks',
      secretEncrypted: 'v1:encrypted',
    });
    expect(payload.payload).toMatchObject({
      type: 'quest.created',
      data: { questId: 'q1' },
    });
    expect(jobsService.addJob.mock.calls[0][2].attempts).toBeGreaterThan(0);
    expect(result).toHaveLength(1);
    expect(metrics.incrementCounter).toHaveBeenCalled();
  });

  it('enqueues one job per subscription when several match', async () => {
    subscriptions.find.mockResolvedValue([
      activeSubscription,
      { ...activeSubscription, id: 'sub-2' },
    ]);
    deliveries.create.mockImplementation((input) => input);
    deliveries.save.mockImplementation((input) =>
      Promise.resolve({ id: `delivery-${input.subscriptionId}`, ...input }),
    );
    jobsService.addJob.mockResolvedValue({ id: 'job-1' });

    const result = await service.dispatch('quest.created', { questId: 'q1' });

    expect(deliveries.save).toHaveBeenCalledTimes(2);
    expect(jobsService.addJob).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('delivery rows start pending', async () => {
    subscriptions.find.mockResolvedValue([activeSubscription]);
    deliveries.create.mockImplementation((input) => input);
    deliveries.save.mockImplementation((input) =>
      Promise.resolve({ id: 'delivery-1', ...input }),
    );
    jobsService.addJob.mockResolvedValue({ id: 'job-1' });

    await service.dispatch('quest.created', { questId: 'q1' });

    expect(deliveries.save.mock.calls[0][0].status).toBe(
      WebhookDeliveryStatus.PENDING,
    );
  });
});
