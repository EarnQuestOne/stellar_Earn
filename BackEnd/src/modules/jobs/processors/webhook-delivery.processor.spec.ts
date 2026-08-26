import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from '../../webhooks-outbound/entities/webhook-delivery.entity';
import { WebhookSubscription } from '../../webhooks-outbound/entities/webhook-subscription.entity';
import { MetricsService } from '../../../common/services/metrics.service';
import { PooledHttpClientService } from '../../../common/http-client/http-client.service';
import { encryptSecret } from '../../webhooks-outbound/utils/secret-encryption';

// Needed by encryptSecret() at module scope (fixture construction).
process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = 'a'.repeat(64);

describe('WebhookDeliveryProcessor', () => {
  let processor: WebhookDeliveryProcessor;
  let post: jest.Mock;
  const deliveries = { findOne: jest.fn(), save: jest.fn() };
  const subscriptions = { findOne: jest.fn() };
  const metrics = {
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
    registerCounter: jest.fn(),
    registerHistogram: jest.fn(),
  };

  const subscription = {
    id: 'sub-1',
    isActive: true,
    secretEncrypted: encryptSecret('test-webhook-secret-12345'),
  };

  const delivery = (overrides: Partial<WebhookDelivery> = {}) =>
    ({
      id: 'delivery-1',
      subscriptionId: 'sub-1',
      eventType: 'quest.created',
      eventId: 'quest.created:123',
      payload: { type: 'quest.created', data: { questId: 'q1' } },
      status: WebhookDeliveryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 5,
      ...overrides,
    }) as WebhookDelivery;

  const payload = {
    deliveryId: 'delivery-1',
    subscriptionId: 'sub-1',
    eventType: 'quest.created',
    eventId: 'quest.created:123',
    payload: { type: 'quest.created', data: { questId: 'q1' } },
    targetUrl: 'https://consumer.example.com/hooks',
    secretEncrypted: encryptSecret('test-webhook-secret-12345'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    post = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryProcessor,
        { provide: getRepositoryToken(WebhookDelivery), useValue: deliveries },
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptions,
        },
        { provide: MetricsService, useValue: metrics },
        {
          provide: PooledHttpClientService,
          useValue: { create: () => ({ post }) },
        },
      ],
    }).compile();

    processor = module.get(WebhookDeliveryProcessor);
  });

  afterAll(() => {
    delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  });

  it('marks the delivery delivered on a 2xx response', async () => {
    deliveries.findOne.mockResolvedValue(delivery());
    subscriptions.findOne.mockResolvedValue(subscription);
    post.mockResolvedValue({ status: 200, data: { ok: true } });

    const result = await processor.process({
      data: payload,
      attemptsMade: 0,
    } as any);

    expect(result.success).toBe(true);
    expect(deliveries.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-1',
        status: WebhookDeliveryStatus.DELIVERED,
        attemptCount: 1,
        responseCode: 200,
      }),
    );
    expect(metrics.observeHistogram).toHaveBeenCalled();
  });

  it('short-circuits and cancels when the subscription is inactive', async () => {
    deliveries.findOne.mockResolvedValue(delivery());
    subscriptions.findOne.mockResolvedValue({
      ...subscription,
      isActive: false,
    });

    const result = await processor.process({ data: payload } as any);

    expect(result.success).toBe(true);
    expect(deliveries.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: WebhookDeliveryStatus.CANCELLED }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('records failure with a retry time when attempts remain, then rethrows', async () => {
    deliveries.findOne.mockResolvedValue(delivery());
    subscriptions.findOne.mockResolvedValue(subscription);
    post.mockRejectedValue(new Error('connection refused'));

    await expect(
      processor.process({ data: payload, attemptsMade: 0 } as any),
    ).rejects.toThrow('connection refused');

    const saved = deliveries.save.mock.calls[0][0];
    expect(saved.status).toBe(WebhookDeliveryStatus.FAILED);
    expect(saved.attemptCount).toBe(1);
    expect(saved.nextRetryAt).toBeInstanceOf(Date);
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'outbound_webhook_retries_total',
      expect.anything(),
    );
  });

  it('dead-letters when the final attempt fails', async () => {
    deliveries.findOne.mockResolvedValue(delivery({ maxAttempts: 2 }));
    subscriptions.findOne.mockResolvedValue(subscription);
    post.mockRejectedValue(new Error('5xx from consumer'));

    await expect(
      processor.process({ data: payload, attemptsMade: 1 } as any),
    ).rejects.toThrow('5xx from consumer');

    const saved = deliveries.save.mock.calls[0][0];
    expect(saved.status).toBe(WebhookDeliveryStatus.DEAD_LETTERED);
    expect(saved.deadLetteredAt).toBeInstanceOf(Date);
    expect(saved.nextRetryAt).toBeNull();
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'outbound_webhook_dead_lettered_total',
      expect.anything(),
    );
  });
});
