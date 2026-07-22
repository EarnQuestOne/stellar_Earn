import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService, WebhookResponse } from './webhooks.service';
import { TraceService } from '../trace/trace.service';
import { FailedWebhookStatus } from './entities/failed-webhook-event.entity';

/**
 * Unit tests for WebhooksController.
 *
 * Covers:
 *  - Route guards: required-header validation on each webhook endpoint,
 *    rejecting malformed requests before the service layer is invoked
 *  - Generic webhook handler's source allowlist behavior, as surfaced
 *    through the controller (unsupported sources are rejected with 401)
 *  - Successful processing paths for GitHub, API, and generic webhooks
 */
describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;
  let traceService: jest.Mocked<TraceService>;

  const successResponse = (
    overrides: Partial<WebhookResponse> = {},
  ): WebhookResponse => ({
    success: true,
    eventId: 'evt-1',
    message: 'Webhook processed successfully',
    processedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockWebhooksService: Partial<jest.Mocked<WebhooksService>> = {
      processWebhook: jest.fn(),
      listFailedWebhooks: jest.fn(),
      getFailedWebhook: jest.fn(),
      retryFailedWebhook: jest.fn(),
    };

    const mockTraceService: Partial<jest.Mocked<TraceService>> = {
      createTrace: jest.fn().mockResolvedValue(undefined),
      appendEvent: jest.fn().mockResolvedValue(undefined),
      linkOnchain: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: TraceService, useValue: mockTraceService },
      ],
    }).compile();

    controller = module.get(WebhooksController);
    webhooksService = module.get(WebhooksService);
    traceService = module.get(TraceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /webhooks/github ──────────────────────────────────────────────

  describe('POST /webhooks/github — route guards', () => {
    it('should reject a request missing the X-GitHub-Event header', async () => {
      await expect(
        controller.handleGithubWebhook(
          {},
          undefined as unknown as string,
          'delivery-1',
          undefined as unknown as string,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.handleGithubWebhook(
          {},
          undefined as unknown as string,
          'delivery-1',
          undefined as unknown as string,
        ),
      ).rejects.toThrow('Missing X-GitHub-Event header');

      expect(webhooksService.processWebhook).not.toHaveBeenCalled();
    });

    it('should reject a request missing the X-GitHub-Delivery header', async () => {
      await expect(
        controller.handleGithubWebhook(
          {},
          'push',
          undefined as unknown as string,
          undefined as unknown as string,
        ),
      ).rejects.toThrow('Missing X-GitHub-Delivery header');

      expect(webhooksService.processWebhook).not.toHaveBeenCalled();
    });

    it('should process a well-formed GitHub webhook and link the trace', async () => {
      webhooksService.processWebhook.mockResolvedValue(
        successResponse({ txHash: '0xabc' }),
      );

      const result = await controller.handleGithubWebhook(
        { questId: 'q-1', submitterAddress: 'GABC' },
        'push',
        'delivery-1',
        'sha256=deadbeef',
      );

      expect(result.success).toBe(true);
      expect(traceService.createTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookEventId: 'delivery-1',
          questId: 'q-1',
        }),
      );
      expect(traceService.linkOnchain).toHaveBeenCalledWith(
        expect.objectContaining({ txHash: '0xabc' }),
      );
      expect(traceService.appendEvent).not.toHaveBeenCalled();
    });

    it('should append a CONFIRMED event when no on-chain tx hash is returned', async () => {
      webhooksService.processWebhook.mockResolvedValue(successResponse());

      await controller.handleGithubWebhook({}, 'push', 'delivery-1', 'sig');

      expect(traceService.linkOnchain).not.toHaveBeenCalled();
      expect(traceService.appendEvent).toHaveBeenCalledWith(
        expect.any(String),
        'CONFIRMED',
        expect.any(String),
      );
    });

    it('should throw UnauthorizedException and log a FAILED trace event when the service rejects the webhook', async () => {
      webhooksService.processWebhook.mockResolvedValue(
        successResponse({
          success: false,
          message: 'Invalid webhook signature',
        }),
      );

      await expect(
        controller.handleGithubWebhook({}, 'push', 'delivery-1', 'bad-sig'),
      ).rejects.toThrow(UnauthorizedException);

      expect(traceService.appendEvent).toHaveBeenCalledWith(
        expect.any(String),
        'FAILED',
        'Invalid webhook signature',
      );
    });
  });

  // ─── POST /webhooks/api-verify ──────────────────────────────────────────

  describe('POST /webhooks/api-verify — route guards', () => {
    it('should reject a request missing the X-Event-Type header', async () => {
      await expect(
        controller.handleApiVerificationWebhook(
          {},
          undefined as unknown as string,
          'webhook-1',
          undefined as unknown as string,
        ),
      ).rejects.toThrow('Missing X-Event-Type header');

      expect(webhooksService.processWebhook).not.toHaveBeenCalled();
    });

    it('should reject a request missing the X-Webhook-ID header', async () => {
      await expect(
        controller.handleApiVerificationWebhook(
          {},
          'submission_verify',
          undefined as unknown as string,
          undefined as unknown as string,
        ),
      ).rejects.toThrow('Missing X-Webhook-ID header');

      expect(webhooksService.processWebhook).not.toHaveBeenCalled();
    });

    it('should extract the bearer token as the signature and process the webhook', async () => {
      webhooksService.processWebhook.mockResolvedValue(successResponse());

      await controller.handleApiVerificationWebhook(
        { submissionId: 's-1' },
        'submission_verify',
        'webhook-1',
        'Bearer some-token-value',
      );

      expect(webhooksService.processWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          signature: 'some-token-value',
          source: 'api',
        }),
      );
    });

    it('should leave signature undefined when the authorization header is not a Bearer token', async () => {
      webhooksService.processWebhook.mockResolvedValue(successResponse());

      await controller.handleApiVerificationWebhook(
        {},
        'submission_verify',
        'webhook-1',
        'Basic abc123',
      );

      expect(webhooksService.processWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ signature: undefined }),
      );
    });

    it('should throw UnauthorizedException when the service rejects the webhook', async () => {
      webhooksService.processWebhook.mockResolvedValue(
        successResponse({
          success: false,
          message: 'Invalid webhook signature',
        }),
      );

      await expect(
        controller.handleApiVerificationWebhook(
          {},
          'submission_verify',
          'webhook-1',
          undefined as unknown as string,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── POST /webhooks/generic/:service ────────────────────────────────────

  describe('POST /webhooks/generic/:service — allowlist behavior', () => {
    it('should forward the :service param as the event source to the service layer', async () => {
      webhooksService.processWebhook.mockResolvedValue(successResponse());

      await controller.handleGenericWebhook(
        {},
        {},
        'sig',
        'custom_event',
        'someUnregisteredVendor',
      );

      expect(webhooksService.processWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'someUnregisteredVendor',
          type: 'custom_event',
        }),
      );
    });

    it('should throw UnauthorizedException when the service rejects a source outside its allowlist', async () => {
      webhooksService.processWebhook.mockResolvedValue(
        successResponse({
          success: false,
          message: 'Unsupported webhook source: someUnregisteredVendor',
        }),
      );

      await expect(
        controller.handleGenericWebhook(
          {},
          {},
          'sig',
          'custom_event',
          'someUnregisteredVendor',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(traceService.appendEvent).toHaveBeenCalledWith(
        expect.any(String),
        'FAILED',
        'Unsupported webhook source: someUnregisteredVendor',
      );
    });

    it('should succeed and link on-chain when the service accepts an allowlisted source', async () => {
      webhooksService.processWebhook.mockResolvedValue(
        successResponse({ txHash: '0xdef' }),
      );

      const result = await controller.handleGenericWebhook(
        {},
        {},
        'sig',
        'custom_event',
        'github',
      );

      expect(result.success).toBe(true);
      expect(traceService.linkOnchain).toHaveBeenCalledWith(
        expect.objectContaining({ txHash: '0xdef' }),
      );
    });

    it('should default the event type to "unknown" when no X-Event-Type header is sent', async () => {
      webhooksService.processWebhook.mockResolvedValue(successResponse());

      await controller.handleGenericWebhook(
        {},
        {},
        'sig',
        undefined as unknown as string,
        'github',
      );

      expect(webhooksService.processWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'unknown' }),
      );
    });
  });

  // ─── Admin: failed webhook inspection & retry ───────────────────────────

  describe('GET /webhooks/admin/failed', () => {
    it('should list failed webhooks without a status filter', async () => {
      webhooksService.listFailedWebhooks.mockResolvedValue([]);

      await controller.listFailedWebhooks();

      expect(webhooksService.listFailedWebhooks).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should forward a status filter to the service', async () => {
      webhooksService.listFailedWebhooks.mockResolvedValue([]);

      await controller.listFailedWebhooks(FailedWebhookStatus.DEAD_LETTER);

      expect(webhooksService.listFailedWebhooks).toHaveBeenCalledWith(
        FailedWebhookStatus.DEAD_LETTER,
      );
    });
  });

  describe('GET /webhooks/admin/failed/:eventId', () => {
    it('should return the failed webhook record when found', async () => {
      const record = { id: 'r-1', eventId: 'evt-1' } as any;
      webhooksService.getFailedWebhook.mockResolvedValue(record);

      const result = await controller.getFailedWebhook('evt-1');

      expect(result).toBe(record);
    });

    it('should throw NotFoundException when no record exists for the event', async () => {
      webhooksService.getFailedWebhook.mockResolvedValue(null);

      await expect(controller.getFailedWebhook('missing-evt')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /webhooks/admin/failed/:eventId/retry', () => {
    it('should return success=true when the retry succeeds', async () => {
      webhooksService.retryFailedWebhook.mockResolvedValue(true);

      const result = await controller.retryFailedWebhook('evt-1');

      expect(result).toEqual({ success: true, eventId: 'evt-1' });
      expect(webhooksService.retryFailedWebhook).toHaveBeenCalledWith('evt-1');
    });

    it('should return success=false when the retry fails or is exhausted', async () => {
      webhooksService.retryFailedWebhook.mockResolvedValue(false);

      const result = await controller.retryFailedWebhook('evt-1');

      expect(result).toEqual({ success: false, eventId: 'evt-1' });
    });
  });

  // ─── POST /webhooks/health ───────────────────────────────────────────────

  describe('POST /webhooks/health', () => {
    it('should report ok status without touching the service layer', async () => {
      const result = await controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(webhooksService.processWebhook).not.toHaveBeenCalled();
    });
  });
});
