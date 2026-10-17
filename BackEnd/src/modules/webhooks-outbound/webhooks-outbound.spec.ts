import { Repository } from 'typeorm';
import {
  computeSignature,
  decryptSecret,
  encryptSecret,
  generateSecret,
} from './webhook-crypto';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
} from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';

describe('webhook-crypto', () => {
  it('round-trips an encrypted secret', () => {
    const secret = generateSecret();
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('produces a deterministic signature that changes with timestamp or body', () => {
    const secret = 'test-secret-value';
    const a = computeSignature(secret, 1000, '{"x":1}');
    const b = computeSignature(secret, 1000, '{"x":1}');
    const c = computeSignature(secret, 1001, '{"x":1}');
    const d = computeSignature(secret, 1000, '{"x":2}');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});

describe('WebhookDispatcherService', () => {
  function sub(
    id: string,
    eventTypes: string[],
    status = WebhookSubscriptionStatus.ACTIVE,
  ): WebhookSubscription {
    return { id, eventTypes, status } as WebhookSubscription;
  }

  it('delivers only to active subscriptions that selected the event type', async () => {
    const subscriptions = [
      sub('a', ['quest.created', 'payout.completed']),
      sub('b', ['submission.approved']),
      sub('c', ['quest.created'], WebhookSubscriptionStatus.PAUSED),
    ];

    const subRepo = {
      // dispatchEvent already filters to ACTIVE via the where clause.
      find: jest
        .fn()
        .mockResolvedValue(subscriptions.filter((s) => s.status === 'ACTIVE')),
    } as unknown as Repository<WebhookSubscription>;

    const deliveryRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => ({ id: `del-${d.subscriptionId}`, ...d })),
    } as unknown as Repository<WebhookDelivery>;

    const processor = {
      deliver: jest.fn().mockResolvedValue(undefined),
    } as unknown as WebhookDeliveryProcessor;

    const dispatcher = new WebhookDispatcherService(
      subRepo,
      deliveryRepo,
      processor,
    );
    await dispatcher.dispatchEvent('quest.created', { questId: 'q1' });

    // Only subscription 'a' is active and subscribed to quest.created.
    expect(deliveryRepo.save).toHaveBeenCalledTimes(1);
    expect(processor.deliver).toHaveBeenCalledWith('del-a');
  });
});
