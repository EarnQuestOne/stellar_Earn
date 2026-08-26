import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  const subscriptions = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };
  const deliveries = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = 'a'.repeat(64);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptions,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: deliveries,
        },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  });

  it('creates a subscription with an encrypted generated secret', async () => {
    subscriptions.create.mockImplementation((input) => input);
    subscriptions.save.mockImplementation((input) =>
      Promise.resolve({ id: 'sub-1', ...input }),
    );

    const result = await service.create({
      eventType: 'quest.created',
      targetUrl: 'https://consumer.example.com/hooks',
    });

    expect(result.id).toBe('sub-1');
    expect(result.secretEncrypted).toMatch(/^v1:/);
    expect(result.secretEncrypted).not.toContain('random');
    expect(subscriptions.save).toHaveBeenCalled();
  });

  it('encrypts a caller-supplied secret', async () => {
    subscriptions.create.mockImplementation((input) => input);
    subscriptions.save.mockImplementation((input) =>
      Promise.resolve({ id: 'sub-2', ...input }),
    );

    const result = await service.create({
      eventType: 'quest.created',
      targetUrl: 'https://consumer.example.com/hooks',
      secret: 'caller-provided-secret-123',
    });

    expect(result.secretEncrypted).toMatch(/^v1:/);
  });

  it('throws NotFoundException for a missing subscription', async () => {
    subscriptions.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('rotates the secret on update when a new secret is provided', async () => {
    subscriptions.findOne.mockResolvedValue({
      id: 'sub-3',
      secretEncrypted: 'old-encrypted',
    });
    subscriptions.save.mockImplementation((input) => Promise.resolve(input));

    await service.update('sub-3', { secret: 'new-rotated-secret-123' });

    const saved = subscriptions.save.mock.calls[0][0];
    expect(saved.secretEncrypted).toMatch(/^v1:/);
  });

  it('cancels pending deliveries when a subscription is deleted', async () => {
    subscriptions.findOne.mockResolvedValue({ id: 'sub-4' });
    subscriptions.remove.mockResolvedValue(undefined);
    deliveries.update.mockResolvedValue(undefined);

    await service.remove('sub-4');

    expect(deliveries.update).toHaveBeenCalledWith(
      { subscriptionId: 'sub-4', status: WebhookDeliveryStatus.PENDING },
      { status: WebhookDeliveryStatus.CANCELLED },
    );
    expect(subscriptions.remove).toHaveBeenCalled();
  });

  it('creates a pending delivery for a test event', async () => {
    subscriptions.findOne.mockResolvedValue({
      id: 'sub-5',
      eventType: 'quest.created',
    });
    deliveries.create.mockImplementation((input) => input);
    deliveries.save.mockImplementation((input) =>
      Promise.resolve({ id: 'delivery-1', ...input }),
    );

    const result = await service.sendTestEvent('sub-5');

    expect(result.status).toBe(WebhookDeliveryStatus.PENDING);
    expect(result.payload).toMatchObject({ type: 'webhook.test' });
  });
});
