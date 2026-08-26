import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  WebhookDelivery,
  WebhookDeliveryStatusEnum,
} from './entities/webhook-delivery.entity';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import { JobsService } from '../jobs/jobs.service';
import { MetricsService } from '../../common/services/metrics.service';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let deliveryRepo: {
    save: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let subscriptionRepo: { find: jest.Mock };
  let jobsService: { addJob: jest.Mock; getQueue: jest.Mock };
  let metrics: Record<string, jest.Mock>;
  let eventEmitter: { onAny: jest.Mock; offAny: jest.Mock };

  const buildSubscription = (
    overrides: Partial<WebhookSubscription> = {},
  ): WebhookSubscription =>
    ({
      id: 'sub-1',
      label: 'Acme watcher',
      targetUrl: 'https://acme.example/hooks',
      eventTypes: ['payout.processed'],
      secretCiphertext: 'v1.aaa.bbb.ccc',
      secretHint: 'abcd',
      state: WebhookSubscriptionState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as WebhookSubscription;

  beforeEach(async () => {
    deliveryRepo = {
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    };
    subscriptionRepo = { find: jest.fn().mockResolvedValue([]) };
    jobsService = {
      addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getQueue: jest.fn().mockReturnValue(undefined),
    };
    metrics = {
      registerCounter: jest.fn(),
      registerHistogram: jest.fn(),
      incrementCounter: jest.fn(),
      observeHistogram: jest.fn(),
    };
    eventEmitter = { onAny: jest.fn(), offAny: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDispatcherService,
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: deliveryRepo,
        },
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptionRepo,
        },
        { provide: JobsService, useValue: jobsService },
        { provide: MetricsService, useValue: metrics },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(WebhookDispatcherService);
    await moduleRef.init();
  });

  describe('event-bus attachment', () => {
    it('subscribes on init and unsubscribes on destroy', () => {
      expect(eventEmitter.onAny).toHaveBeenCalledTimes(1);
      service.onModuleDestroy();
      expect(eventEmitter.offAny).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispatchDomainEvent', () => {
    it('creates one delivery per matching active subscription and enqueues it', async () => {
      subscriptionRepo.find.mockResolvedValue([
        buildSubscription(),
        buildSubscription({
          id: 'sub-2',
          eventTypes: ['*'],
        }),
        buildSubscription({
          id: 'sub-3',
          eventTypes: ['quest.created'],
        }),
        buildSubscription({
          id: 'sub-4',
          state: WebhookSubscriptionState.PAUSED,
          eventTypes: ['*'],
        }),
      ]);
      deliveryRepo.save.mockImplementation(async (row: any) => ({
        ...row,
        id: `delivery-${Math.random().toString(36).slice(2, 8)}`,
      }));

      const result = await service.dispatchDomainEvent('payout.processed', {
        payoutId: 'p-1',
      });

      // sub-1 explicit match, sub-2 wildcard, sub-3 no match, sub-4 paused.
      expect(deliveryRepo.save).toHaveBeenCalledTimes(2);
      expect(jobsService.addJob).toHaveBeenCalledTimes(2);
      expect(result.deliveryIds).toHaveLength(2);

      const saved = deliveryRepo.save.mock.calls[0][0];
      expect(saved.eventType).toBe('payout.processed');
      expect(saved.payload.eventType).toBe('payout.processed');
      expect(saved.payload.id).toBeDefined();
      expect(saved.payload.createdAt).toBeDefined();
      expect(saved.payload.data).toEqual({ payoutId: 'p-1' });
    });

    it('ignores events outside the public catalog', async () => {
      await service.dispatchDomainEvent('event.persisted', { x: 1 });
      await service.dispatchDomainEvent('internal.machinery', { x: 1 });
      expect(subscriptionRepo.find).not.toHaveBeenCalled();
      expect(deliveryRepo.save).not.toHaveBeenCalled();
    });

    it('enqueues with a deterministic jobId per (delivery, attempt)', async () => {
      subscriptionRepo.find.mockResolvedValue([buildSubscription()]);
      deliveryRepo.save.mockResolvedValue({ id: 'del-1' });

      await service.dispatchDomainEvent('payout.processed', {});

      const args = jobsService.addJob.mock.calls[0];
      expect(args[0]).toBe('webhooks');
      expect(args[1]).toEqual({ deliveryId: 'del-1' });
      expect(args[2].jobId).toBe('wh-out-del-1-a1');
      expect(args[2].attempts).toBe(1);
    });

    it('survives an enqueue failure (scheduler will re-drive)', async () => {
      subscriptionRepo.find.mockResolvedValue([buildSubscription()]);
      deliveryRepo.save.mockResolvedValue({ id: 'del-1' });
      jobsService.addJob.mockRejectedValue(new Error('redis down'));

      const result = await service.dispatchDomainEvent('payout.processed', {});
      expect(result.deliveryIds).toHaveLength(1);
      expect(deliveryRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleRetry', () => {
    const delivery = {
      id: 'del-1',
      attempts: 0,
      maxAttempts: 5,
      eventType: 'payout.processed',
    } as unknown as WebhookDelivery;

    it('schedules a retry with backoff while budget remains', async () => {
      const outcome = await service.scheduleRetry(delivery, 500, 'HTTP 500');
      expect(outcome).toBe('retrying');
      expect(deliveryRepo.update).toHaveBeenCalledWith(
        'del-1',
        expect.objectContaining({
          status: WebhookDeliveryStatusEnum.RETRYING,
          attempts: 1,
          nextRetryAt: expect.any(Date),
        }),
      );
    });

    it('dead-letters when the budget is exhausted', async () => {
      const exhausted = {
        ...delivery,
        attempts: 4,
      } as unknown as WebhookDelivery;
      const outcome = await service.scheduleRetry(exhausted, 500, 'HTTP 500');
      expect(outcome).toBe('dead_lettered');
      expect(deliveryRepo.update).toHaveBeenCalledWith(
        'del-1',
        expect.objectContaining({
          status: WebhookDeliveryStatusEnum.DEAD_LETTERED,
          attempts: 5,
          deadLetteredAt: expect.any(Date),
          nextRetryAt: null,
        }),
      );
    });

    it('truncates long error text', async () => {
      await service.scheduleRetry(delivery, null, 'x'.repeat(2000));
      const saved = deliveryRepo.update.mock.calls[0][1];
      expect(saved.lastError.length).toBeLessThanOrEqual(512);
    });
  });

  describe('skipDeliveriesForSubscription', () => {
    it('marks pending and retrying rows skipped', async () => {
      deliveryRepo.update.mockResolvedValue({ affected: 3 });
      const result = await service.skipDeliveriesForSubscription('sub-1');
      expect(deliveryRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionId: 'sub-1' }),
        expect.objectContaining({
          status: WebhookDeliveryStatusEnum.SKIPPED,
        }),
      );
      expect(result.affected).toBe(3);
    });
  });

  describe('claimDueDeliveries', () => {
    it('enqueues due rows and crash-recovers stuck delivering rows', async () => {
      deliveryRepo.find.mockResolvedValue([
        { id: 'del-due', attempts: 1, status: 'retrying' },
      ]);
      const due = await service.claimDueDeliveries();
      expect(due).toHaveLength(1);
      expect(jobsService.addJob).toHaveBeenCalledWith(
        'webhooks',
        { deliveryId: 'del-due' },
        expect.objectContaining({ jobId: 'wh-out-del-due-a2' }),
      );
    });
  });
});
