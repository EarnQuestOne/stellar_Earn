import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import { decryptSecret, encryptSecret } from './utils/signature.util';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repo: {
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  const encryptionKey = Buffer.alloc(32, 3).toString('base64');

  beforeEach(async () => {
    repo = {
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(WebhookSubscription), useValue: repo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(encryptionKey) },
        },
      ],
    }).compile();

    service = moduleRef.get(SubscriptionsService);
  });

  it('create() stores the secret encrypted and returns it exactly once', async () => {
    repo.save.mockImplementation(async (row: any) => ({
      ...row,
      id: 'sub-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const view = await service.create({
      label: 'Acme watcher',
      targetUrl: 'https://acme.example/hooks',
      eventTypes: ['payout.processed', 'quest.created'],
    });

    // Plaintext secret present on create…
    expect(view.secret).toMatch(/^[\w-]{40,}$/);
    expect(view.secretHint).toBe(view.secret!.slice(-4));

    // …and the stored ciphertext decrypts back to it with the configured key.
    const stored = repo.save.mock.calls[0][0];
    expect(stored.secretCiphertext.startsWith('v1.')).toBe(true);
    expect(stored.secretCiphertext).not.toContain(view.secret!);
    expect(decryptSecret(stored.secretCiphertext, encryptionKey)).toBe(
      view.secret,
    );
  });

  it('list() never exposes ciphertexts or secrets', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'sub-1',
        label: 'Acme',
        targetUrl: 'https://acme.example/hooks',
        eventTypes: ['payout.processed'],
        secretCiphertext: 'v1.leak.attempt',
        secretHint: 'abcd',
        state: WebhookSubscriptionState.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const rows = await service.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('secretCiphertext');
    expect(rows[0]).not.toHaveProperty('secret');
    expect(JSON.stringify(rows[0])).not.toContain('v1.leak.attempt');
  });

  it('rotateSecret() replaces the ciphertext and returns the new secret once', async () => {
    const oldSecret = 'whsec_old_secret_value_1234567890';
    repo.findOne.mockResolvedValue({
      id: 'sub-1',
      label: 'Acme',
      targetUrl: 'https://acme.example/hooks',
      eventTypes: ['payout.processed'],
      secretCiphertext: encryptSecret(oldSecret, encryptionKey),
      secretHint: oldSecret.slice(-4),
      state: WebhookSubscriptionState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repo.save.mockImplementation(async (row: any) => ({
      ...row,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const view = await service.rotateSecret('sub-1');

    expect(view.secret).toBeDefined();
    expect(view.secret).not.toBe(oldSecret);
    // The persisted ciphertext (captured from save) decrypts to the new secret.
    const savedRow = repo.save.mock.calls[0][0];
    expect(decryptSecret(savedRow.secretCiphertext, encryptionKey)).toBe(
      view.secret,
    );
  });

  it('update() maps state strings onto the enum', async () => {
    repo.findOne.mockResolvedValue({
      id: 'sub-1',
      label: 'Acme',
      targetUrl: 'https://acme.example/hooks',
      eventTypes: ['payout.processed'],
      secretCiphertext: 'v1.x.y.z',
      secretHint: 'abcd',
      state: WebhookSubscriptionState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repo.save.mockImplementation(async (row: any) => row);

    const view = await service.update('sub-1', { state: 'paused' });
    expect(view.state).toBe(WebhookSubscriptionState.PAUSED);
  });

  it('remove() deletes the row', async () => {
    repo.findOne.mockResolvedValue({ id: 'sub-1' });
    const result = await service.remove('sub-1');
    expect(repo.remove).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'sub-1', deleted: true });
  });

  it('throws for unknown ids', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow('not found');
    await expect(service.remove('nope')).rejects.toThrow('not found');
  });
});
