import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FailedWebhookRetryScheduler } from './failed-webhook-retry.scheduler';
import { WebhooksService } from './webhooks.service';
import {
  FailedWebhookEvent,
  FailedWebhookStatus,
} from './entities/failed-webhook-event.entity';

describe('FailedWebhookRetryScheduler', () => {
  let scheduler: FailedWebhookRetryScheduler;
  let repo: jest.Mocked<Repository<FailedWebhookEvent>>;
  let webhooksService: jest.Mocked<Pick<WebhooksService, 'retryFailedWebhook'>>;

  const buildRecord = (
    overrides: Partial<FailedWebhookEvent> = {},
  ): FailedWebhookEvent =>
    ({
      id: 'record-uuid-1',
      eventId: 'evt-1',
      type: 'push',
      source: 'github',
      payload: {},
      signature: null,
      failureReason: 'downstream failure',
      errorHistory: [],
      attempts: 1,
      maxAttempts: 5,
      status: FailedWebhookStatus.PENDING,
      nextRetryAt: new Date(Date.now() - 1000),
      lastAttemptAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as FailedWebhookEvent;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const mockWebhooksService = {
      retryFailedWebhook: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailedWebhookRetryScheduler,
        {
          provide: getRepositoryToken(FailedWebhookEvent),
          useValue: mockRepo,
        },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    scheduler = module.get(FailedWebhookRetryScheduler);
    repo = module.get(getRepositoryToken(FailedWebhookEvent));
    webhooksService = module.get(WebhooksService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should do nothing when no retries are due', async () => {
    repo.find.mockResolvedValueOnce([]);

    await scheduler.processDueRetries();

    expect(webhooksService.retryFailedWebhook).not.toHaveBeenCalled();
  });

  it('should only query for PENDING records with a due nextRetryAt', async () => {
    repo.find.mockResolvedValueOnce([]);

    await scheduler.processDueRetries();

    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: FailedWebhookStatus.PENDING }),
      }),
    );
  });

  it('should retry each due record using its own eventId and maxAttempts', async () => {
    const records = [
      buildRecord({ eventId: 'evt-1', maxAttempts: 5 }),
      buildRecord({ eventId: 'evt-2', maxAttempts: 3 }),
    ];
    repo.find.mockResolvedValueOnce(records);

    await scheduler.processDueRetries();

    expect(webhooksService.retryFailedWebhook).toHaveBeenCalledTimes(2);
    expect(webhooksService.retryFailedWebhook).toHaveBeenNthCalledWith(
      1,
      'evt-1',
      5,
    );
    expect(webhooksService.retryFailedWebhook).toHaveBeenNthCalledWith(
      2,
      'evt-2',
      3,
    );
  });

  it('should continue processing remaining records if one retry throws unexpectedly', async () => {
    const records = [
      buildRecord({ eventId: 'evt-1' }),
      buildRecord({ eventId: 'evt-2' }),
    ];
    repo.find.mockResolvedValueOnce(records);
    webhooksService.retryFailedWebhook
      .mockRejectedValueOnce(new Error('db connection lost'))
      .mockResolvedValueOnce(true);

    await expect(scheduler.processDueRetries()).resolves.toBeUndefined();

    expect(webhooksService.retryFailedWebhook).toHaveBeenCalledTimes(2);
  });
});
