import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import {
  WebhookDelivery,
  WebhookDeliveryStatusEnum,
} from './entities/webhook-delivery.entity';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { PooledHttpClientService } from '../../common/http-client/http-client.service';
import { MetricsService } from '../../common/services/metrics.service';
import {
  encryptSecret,
  signOutboundWebhookPayload,
} from './utils/signature.util';

describe('WebhookDeliveryProcessor', () => {
  let processor: WebhookDeliveryProcessor;
  let deliveryRepo: { findOne: jest.Mock; update: jest.Mock };
  let subscriptionRepo: { findOne: jest.Mock };
  let httpPost: jest.Mock;
  let dispatcher: { scheduleRetry: jest.Mock };
  let metrics: Record<string, jest.Mock>;

  const encryptionKey = Buffer.alloc(32, 9).toString('base64');
  const plaintextSecret = 'whsec_processor_test_secret_value';

  const buildDelivery = (
    overrides: Partial<WebhookDelivery> = {},
  ): WebhookDelivery =>
    ({
      id: 'del-1',
      subscriptionId: 'sub-1',
      eventType: 'payout.processed',
      payload: { id: 'evt-1', eventType: 'payout.processed', data: {} },
      status: WebhookDeliveryStatusEnum.PENDING,
      attempts: 0,
      maxAttempts: 5,
      responseStatusCode: null,
      lastError: null,
      nextRetryAt: null,
      deliveredAt: null,
      deadLetteredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as WebhookDelivery;

  const buildSubscription = (): WebhookSubscription =>
    ({
      id: 'sub-1',
      label: 'Acme',
      targetUrl: 'https://acme.example/hooks',
      eventTypes: ['payout.processed'],
      secretCiphertext: encryptSecret(plaintextSecret, encryptionKey),
      secretHint: 'abcd',
      state: WebhookSubscriptionState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as WebhookSubscription;

  const job = { id: 'job-1', data: { deliveryId: 'del-1' } } as any;

  beforeEach(async () => {
    deliveryRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    subscriptionRepo = { findOne: jest.fn() };
    httpPost = jest.fn();
    dispatcher = { scheduleRetry: jest.fn() };
    metrics = {
      incrementCounter: jest.fn(),
      observeHistogram: jest.fn(),
      registerCounter: jest.fn(),
      registerHistogram: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryProcessor,
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: deliveryRepo,
        },
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptionRepo,
        },
        {
          provide: PooledHttpClientService,
          useValue: { create: jest.fn(() => ({ post: httpPost })) },
        },
        { provide: WebhookDispatcherService, useValue: dispatcher },
        { provide: MetricsService, useValue: metrics },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(encryptionKey) },
        },
      ],
    }).compile();

    processor = moduleRef.get(WebhookDeliveryProcessor);
  });

  it('delivers on 2xx with a correct HMAC header over the raw body', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce(buildSubscription());
    httpPost.mockResolvedValue({ status: 200 });

    const result = await processor.process(job);

    expect(result.status).toBe(WebhookDeliveryStatusEnum.DELIVERED);
    expect(result.responseStatusCode).toBe(200);
    expect(deliveryRepo.update).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({
        status: WebhookDeliveryStatusEnum.DELIVERED,
        attempts: 1,
        deliveredAt: expect.any(Date),
      }),
    );

    // Signature contract: the header must verify against the exact body sent.
    const [url, rawBody, config] = httpPost.mock.calls[0];
    expect(url).toBe('https://acme.example/hooks');
    const header = config.headers['X-StellarEarn-Signature'];
    const timestamp = Number(header.match(/^t=(\d+),/)[1]);
    const expected = signOutboundWebhookPayload(
      rawBody,
      plaintextSecret,
      timestamp,
    );
    expect(header).toBe(expected.signature);
    expect(JSON.parse(rawBody).eventType).toBe('payout.processed');
  });

  it('schedules a retry on HTTP 500', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce(buildSubscription());
    httpPost.mockResolvedValue({ status: 500 });
    dispatcher.scheduleRetry.mockResolvedValue('retrying');

    const result = await processor.process(job);

    expect(result.status).toBe(WebhookDeliveryStatusEnum.RETRYING);
    expect(dispatcher.scheduleRetry).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'del-1' }),
      500,
      'HTTP 500',
    );
  });

  it('schedules a retry on network error', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce(buildSubscription());
    httpPost.mockRejectedValue(new Error('ECONNREFUSED'));
    dispatcher.scheduleRetry.mockResolvedValue('retrying');

    const result = await processor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.RETRYING);
    expect(dispatcher.scheduleRetry).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'ECONNREFUSED',
    );
  });

  it('skips when the subscription is paused', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce({
      ...buildSubscription(),
      state: WebhookSubscriptionState.PAUSED,
    });

    const result = await processor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.SKIPPED);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('skips when the subscription was deleted', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce(null);

    const result = await processor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.SKIPPED);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('is idempotent for terminal rows (duplicate enqueues)', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(
      buildDelivery({ status: WebhookDeliveryStatusEnum.DELIVERED }),
    );
    const result = await processor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.DELIVERED);
    expect(httpPost).not.toHaveBeenCalled();
    expect(deliveryRepo.update).not.toHaveBeenCalled();
  });

  it('discards jobs for unknown deliveries', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(null);
    const result = await processor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.SKIPPED);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('fails closed when the encryption key is missing', async () => {
    deliveryRepo.findOne.mockResolvedValueOnce(buildDelivery());
    subscriptionRepo.findOne.mockResolvedValueOnce(buildSubscription());
    // Rebuild processor with a missing key.
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookDeliveryProcessor,
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: deliveryRepo,
        },
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: subscriptionRepo,
        },
        {
          provide: PooledHttpClientService,
          useValue: { create: jest.fn(() => ({ post: httpPost })) },
        },
        { provide: WebhookDispatcherService, useValue: dispatcher },
        { provide: MetricsService, useValue: metrics },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();
    const brokenProcessor = moduleRef.get(WebhookDeliveryProcessor);
    dispatcher.scheduleRetry.mockResolvedValue('retrying');

    const result = await brokenProcessor.process(job);
    expect(result.status).toBe(WebhookDeliveryStatusEnum.RETRYING);
    expect(httpPost).not.toHaveBeenCalled();
    expect(dispatcher.scheduleRetry).toHaveBeenCalledWith(
      expect.anything(),
      null,
      expect.stringContaining('secret decryption failed'),
    );
  });
});
