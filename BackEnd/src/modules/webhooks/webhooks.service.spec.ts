import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { BulkheadService } from '../../common/services/bulkhead.service';
import { generateWebhookSignature } from './utils/signature';
import {
  FailedWebhookEvent,
  FailedWebhookStatus,
} from './entities/failed-webhook-event.entity';

/**
 * Unit tests for WebhooksService.
 *
 * Covers:
 *  - Signature verification (positive and negative cases, for both GitHub
 *    and API providers, plus malformed signature formats)
 *  - Malformed payload handling
 *  - Generic handler source allowlist behavior
 *  - Persisting failed webhooks (retryable vs. non-retryable)
 *  - Retry lifecycle: success, exhaustion/dead-letter, continued failure
 */
describe('WebhooksService', () => {
  let service: WebhooksService;
  let githubHandler: GithubHandler;
  let apiHandler: ApiHandler;
  let repo: jest.Mocked<Repository<FailedWebhookEvent>>;

  const GITHUB_SECRET = 'github-test-secret-value';
  const API_SECRET = 'api-test-secret-value';

  const buildRecord = (
    overrides: Partial<FailedWebhookEvent> = {},
  ): FailedWebhookEvent =>
    ({
      id: 'record-uuid-1',
      eventId: 'evt-1',
      type: 'push',
      source: 'github',
      payload: { repository: { full_name: 'org/repo' } },
      signature: null,
      failureReason: 'Failed to process webhook: downstream failure',
      errorHistory: [],
      attempts: 1,
      maxAttempts: 5,
      status: FailedWebhookStatus.PENDING,
      nextRetryAt: new Date(Date.now() - 1000),
      lastAttemptAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      canRetry: FailedWebhookEvent.prototype.canRetry,
      ...overrides,
    }) as FailedWebhookEvent;

  beforeEach(async () => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    };

    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<FailedWebhookEvent>) => data),
      save: jest.fn((data: FailedWebhookEvent) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        GithubHandler,
        ApiHandler,
        BulkheadService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(FailedWebhookEvent), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(WebhooksService);
    githubHandler = module.get(GithubHandler);
    apiHandler = module.get(ApiHandler);
    repo = module.get(getRepositoryToken(FailedWebhookEvent));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildEvent = (overrides: Partial<WebhookEvent> = {}): WebhookEvent => ({
    id: 'evt-1',
    type: 'push',
    payload: {
      repository: { full_name: 'org/repo' },
      ref: 'refs/heads/main',
      commits: [],
    },
    timestamp: new Date(),
    source: 'github',
    ...overrides,
  });

  describe('Signature Verification', () => {
    it('should process the webhook when the GitHub signature is valid', async () => {
      const event = buildEvent({ secret: GITHUB_SECRET });
      event.signature = generateWebhookSignature(
        event.payload,
        GITHUB_SECRET,
        'github',
      );
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(true);
      expect(handleEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject the webhook when the GitHub signature is invalid', async () => {
      const event = buildEvent({
        secret: GITHUB_SECRET,
        signature: `sha256=${'0'.repeat(64)}`, // well-formed, but does not match payload
      });
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
      expect(handleEventSpy).not.toHaveBeenCalled();
    });

    it('should reject a GitHub signature with an unrecognized format', async () => {
      const event = buildEvent({
        secret: GITHUB_SECRET,
        signature: 'not-a-valid-signature-format',
      });

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
    });

    it('should process the webhook when the API signature is valid', async () => {
      const event = buildEvent({
        source: 'api',
        type: 'submission_verify',
        payload: { submissionId: 's-1', userId: 'u-1' },
        secret: API_SECRET,
      });
      event.signature = generateWebhookSignature(
        event.payload,
        API_SECRET,
        'api',
      );
      const handleEventSpy = jest.spyOn(apiHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(true);
      expect(handleEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject the webhook when the API signature is invalid', async () => {
      const event = buildEvent({
        source: 'api',
        type: 'submission_verify',
        payload: { submissionId: 's-1' },
        secret: API_SECRET,
        signature: `hmac-sha256=${'0'.repeat(64)}`,
      });
      const handleEventSpy = jest.spyOn(apiHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
      expect(handleEventSpy).not.toHaveBeenCalled();
    });

    it('should reject an API signature missing the hmac-sha256 prefix', async () => {
      const event = buildEvent({
        source: 'api',
        type: 'submission_verify',
        secret: API_SECRET,
        signature: 'sha256=deadbeef',
      });

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
    });

    it('should skip verification when no signature/secret pair is provided', async () => {
      const event = buildEvent(); // no signature, no secret
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(true);
      expect(handleEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should skip verification when a secret is configured but no signature is sent', async () => {
      const event = buildEvent({ secret: GITHUB_SECRET }); // signature omitted
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(true);
      expect(handleEventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Malformed Payloads', () => {
    it('should return a failure response when the payload cannot be parsed as JSON', async () => {
      const event = buildEvent({ payload: '{not-valid-json' });

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to process webhook');
    });

    it('should return a failure response when a handler rejects unexpectedly', async () => {
      const event = buildEvent();
      jest
        .spyOn(githubHandler, 'handleEvent')
        .mockRejectedValueOnce(new Error('downstream failure'));

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Failed to process webhook: downstream failure',
      );
    });

    it('should still report a traceId on failure', async () => {
      const event = buildEvent({ payload: '{not-valid-json' });

      const result = await service.processWebhook(event);

      expect(result).toHaveProperty('traceId');
      expect(result.eventId).toBe(event.id);
    });
  });

  describe('Generic Handler Source Allowlist', () => {
    it('should list github and api as the only supported sources', () => {
      expect(service.getSupportedSources()).toEqual(['github', 'api']);
    });

    it('should reject an event whose source is outside the allowlist, without invoking any handler', async () => {
      const event = buildEvent({ source: 'totally-unknown-service' });
      const githubSpy = jest.spyOn(githubHandler, 'handleEvent');
      const apiSpy = jest.spyOn(apiHandler, 'handleEvent');

      const result = await service.processWebhook(event);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Unsupported webhook source: totally-unknown-service',
      );
      expect(githubSpy).not.toHaveBeenCalled();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('should match allowlisted sources case-insensitively', async () => {
      const event = buildEvent({ source: 'GitHub' });

      const result = await service.processWebhook(event);

      expect(result.success).toBe(true);
    });
  });

  describe('Persisting failed webhooks', () => {
    it('should persist a retryable failure as PENDING with a scheduled retry', async () => {
      const event = buildEvent();
      jest
        .spyOn(githubHandler, 'handleEvent')
        .mockRejectedValueOnce(new Error('downstream failure'));

      await service.processWebhook(event);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'evt-1',
          source: 'github',
          status: FailedWebhookStatus.PENDING,
          attempts: 1,
          maxAttempts: 5,
        }),
      );
      const saved = repo.save.mock.calls[0][0] as FailedWebhookEvent;
      expect(saved.nextRetryAt).not.toBeNull();
    });

    it('should persist a non-retryable failure (invalid signature) directly as DEAD_LETTER', async () => {
      const event = buildEvent({
        secret: GITHUB_SECRET,
        signature: `sha256=${'0'.repeat(64)}`,
      });

      await service.processWebhook(event);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: FailedWebhookStatus.DEAD_LETTER,
          attempts: 0,
          nextRetryAt: null,
        }),
      );
    });

    it('should persist an unsupported-source failure directly as DEAD_LETTER', async () => {
      const event = buildEvent({ source: 'unknown-service' });

      await service.processWebhook(event);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FailedWebhookStatus.DEAD_LETTER }),
      );
    });

    it('should never persist the webhook secret on the failure record', async () => {
      const event = buildEvent({ secret: GITHUB_SECRET });
      jest
        .spyOn(githubHandler, 'handleEvent')
        .mockRejectedValueOnce(new Error('downstream failure'));

      await service.processWebhook(event);

      const saved = repo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(saved).not.toHaveProperty('secret');
    });

    it('should not persist anything on success', async () => {
      const event = buildEvent();

      await service.processWebhook(event);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should resolve a previously tracked failure once the same event succeeds', async () => {
      const existing = buildRecord({ status: FailedWebhookStatus.PENDING });
      repo.findOne.mockResolvedValueOnce(existing);

      const event = buildEvent();
      await service.processWebhook(event);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: FailedWebhookStatus.SUCCEEDED,
          nextRetryAt: null,
        }),
      );
    });
  });

  describe('Retry lifecycle', () => {
    it('should return false when no failed record exists for the event', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.retryFailedWebhook('unknown-evt')).resolves.toBe(
        false,
      );
    });

    it('should return true immediately for an already-resolved event', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRecord({ status: FailedWebhookStatus.SUCCEEDED }),
      );

      await expect(service.retryFailedWebhook('evt-1')).resolves.toBe(true);
    });

    it('should succeed and mark the record SUCCEEDED when reprocessing works', async () => {
      const record = buildRecord({ attempts: 1, maxAttempts: 5 });
      repo.findOne.mockResolvedValueOnce(record);
      jest.spyOn(githubHandler, 'handleEvent').mockResolvedValueOnce({});

      const result = await service.retryFailedWebhook('evt-1');

      expect(result).toBe(true);
      const finalSave = repo.save.mock.calls.at(-1)?.[0] as FailedWebhookEvent;
      expect(finalSave.status).toBe(FailedWebhookStatus.SUCCEEDED);
      expect(finalSave.attempts).toBe(2);
      expect(finalSave.resolvedAt).not.toBeNull();
    });

    it('should resolve the secret fresh from environment config for the retry, not from storage', async () => {
      const original = process.env.GITHUB_WEBHOOK_SECRET;
      process.env.GITHUB_WEBHOOK_SECRET = GITHUB_SECRET;

      try {
        const record = buildRecord({ attempts: 1, maxAttempts: 5 });
        repo.findOne.mockResolvedValueOnce(record);
        const handleEventSpy = jest
          .spyOn(githubHandler, 'handleEvent')
          .mockResolvedValueOnce({});

        await service.retryFailedWebhook('evt-1');

        expect(handleEventSpy).toHaveBeenCalledTimes(1);
        expect(handleEventSpy.mock.calls[0][0].secret).toBe(GITHUB_SECRET);
      } finally {
        process.env.GITHUB_WEBHOOK_SECRET = original;
      }
    });

    it('should move to DEAD_LETTER without dispatching once attempts reach maxAttempts', async () => {
      const record = buildRecord({ attempts: 5, maxAttempts: 5 });
      repo.findOne.mockResolvedValueOnce(record);
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.retryFailedWebhook('evt-1', 5);

      expect(result).toBe(false);
      expect(handleEventSpy).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: FailedWebhookStatus.DEAD_LETTER,
          nextRetryAt: null,
        }),
      );
    });

    it('should refuse to retry a record already in DEAD_LETTER', async () => {
      const record = buildRecord({ status: FailedWebhookStatus.DEAD_LETTER });
      repo.findOne.mockResolvedValueOnce(record);
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      await expect(service.retryFailedWebhook('evt-1')).resolves.toBe(false);
      expect(handleEventSpy).not.toHaveBeenCalled();
    });

    it('should stay PENDING with a new backoff window when a retry attempt fails again but attempts remain', async () => {
      const record = buildRecord({ attempts: 1, maxAttempts: 5 });
      repo.findOne.mockResolvedValueOnce(record);
      jest
        .spyOn(githubHandler, 'handleEvent')
        .mockRejectedValueOnce(new Error('still failing'));

      const result = await service.retryFailedWebhook('evt-1');

      expect(result).toBe(false);
      const finalSave = repo.save.mock.calls.at(-1)?.[0] as FailedWebhookEvent;
      expect(finalSave.status).toBe(FailedWebhookStatus.PENDING);
      expect(finalSave.attempts).toBe(2);
      expect(finalSave.nextRetryAt).not.toBeNull();
    });

    it('should dead-letter on the final allowed attempt even if it fails with a retryable error', async () => {
      const record = buildRecord({ attempts: 4, maxAttempts: 5 });
      repo.findOne.mockResolvedValueOnce(record);
      jest
        .spyOn(githubHandler, 'handleEvent')
        .mockRejectedValueOnce(new Error('still failing'));

      const result = await service.retryFailedWebhook('evt-1');

      expect(result).toBe(false);
      const finalSave = repo.save.mock.calls.at(-1)?.[0] as FailedWebhookEvent;
      expect(finalSave.status).toBe(FailedWebhookStatus.DEAD_LETTER);
      expect(finalSave.attempts).toBe(5);
    });

    it('should honor a custom maxRetries override for this retry call', async () => {
      const record = buildRecord({ attempts: 2, maxAttempts: 5 });
      repo.findOne.mockResolvedValueOnce(record);
      const handleEventSpy = jest.spyOn(githubHandler, 'handleEvent');

      const result = await service.retryFailedWebhook('evt-1', 2);

      expect(result).toBe(false);
      expect(handleEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Listing and inspecting failed webhooks', () => {
    it('should list failed webhooks via the repository', async () => {
      const records = [buildRecord()];
      repo.find.mockResolvedValueOnce(records);

      const result = await service.listFailedWebhooks();

      expect(result).toBe(records);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should filter by status when listing failed webhooks', async () => {
      repo.find.mockResolvedValueOnce([]);

      await service.listFailedWebhooks(FailedWebhookStatus.DEAD_LETTER);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: FailedWebhookStatus.DEAD_LETTER },
        }),
      );
    });

    it('should fetch a single failed webhook by event ID', async () => {
      const record = buildRecord();
      repo.findOne.mockResolvedValueOnce(record);

      await expect(service.getFailedWebhook('evt-1')).resolves.toBe(record);
    });
  });
});
