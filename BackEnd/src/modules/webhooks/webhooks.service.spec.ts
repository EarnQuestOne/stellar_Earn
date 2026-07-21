import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { BulkheadService } from '../../common/services/bulkhead.service';
import { generateWebhookSignature } from './utils/signature';

/**
 * Unit tests for WebhooksService.
 *
 * Covers:
 *  - Signature verification (positive and negative cases, for both GitHub
 *    and API providers, plus malformed signature formats)
 *  - Malformed payload handling
 *  - Generic handler source allowlist behavior
 *  - Retry stub behavior
 */
describe('WebhooksService', () => {
  let service: WebhooksService;
  let githubHandler: GithubHandler;
  let apiHandler: ApiHandler;

  const GITHUB_SECRET = 'github-test-secret-value';
  const API_SECRET = 'api-test-secret-value';

  beforeEach(async () => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        GithubHandler,
        ApiHandler,
        BulkheadService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(WebhooksService);
    githubHandler = module.get(GithubHandler);
    apiHandler = module.get(ApiHandler);
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

  describe('Retry Stub Behavior', () => {
    it('should resolve true using the default retry count', async () => {
      await expect(service.retryFailedWebhook('evt-1')).resolves.toBe(true);
    });

    it('should resolve true regardless of a custom maxRetries override', async () => {
      await expect(service.retryFailedWebhook('evt-1', 5)).resolves.toBe(true);
    });
  });
});
