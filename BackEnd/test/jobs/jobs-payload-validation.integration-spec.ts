/**
 * Integration tests: queue payload validation at the addJob() boundary
 *
 * These tests exercise the full pipeline from JobsService.addJob() through
 * JobPayloadValidatorService without an actual Redis connection.  The BullMQ
 * Queue is stubbed out so the tests run in CI without external services.
 *
 * What is verified:
 * - Valid payloads pass validation and reach queue.add()
 * - Invalid payloads are rejected with InvalidJobPayloadException BEFORE
 *   queue.add() is called
 * - Queues with no schema (e.g. notifications) enqueue any payload
 * - Unknown queues still throw "Queue not found" (unrelated to validation)
 * - Rejection details (queue name, error list) are present in the exception
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { JobPayloadValidatorService } from 'src/modules/jobs/validation/job-payload-validator.service';
import { DataExportProcessor } from 'src/modules/jobs/processors/export.processor';
import { InvalidJobPayloadException } from 'src/common/exceptions/app.exceptions';
import { TracingService } from 'src/common/tracing/tracing.service';

// ─── Stubs ────────────────────────────────────────────────────────────────

const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-id-1' });

const mockTracingService: Partial<TracingService> = {
  getCurrentContext: jest.fn().mockReturnValue(undefined),
  trace: jest.fn().mockImplementation(async (_name, fn) => fn({ attributes: {} })),
};

const mockDataExportProcessor: Partial<DataExportProcessor> = {
  processExport: jest.fn().mockResolvedValue({ ok: true }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Injects a stub queue into the service's private queues map. */
function injectQueue(service: JobsService, queueName: string) {
  (service as any).queues[queueName] = { add: mockQueueAdd };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('JobsService – payload validation integration', () => {
  let module: TestingModule;
  let jobsService: JobsService;
  let validatorService: JobPayloadValidatorService;

  beforeEach(async () => {
    mockQueueAdd.mockClear();

    module = await Test.createTestingModule({
      providers: [
        JobsService,
        JobPayloadValidatorService,
        { provide: TracingService, useValue: mockTracingService },
        { provide: DataExportProcessor, useValue: mockDataExportProcessor },
      ],
    }).compile();

    jobsService = module.get<JobsService>(JobsService);
    validatorService = module.get<JobPayloadValidatorService>(
      JobPayloadValidatorService,
    );

    // Inject stub queues – bypasses Redis entirely
    ['payouts', 'email', 'exports', 'cleanup', 'webhooks', 'analytics',
     'quests', 'maintenance', 'reports', 'notifications', 'scheduled',
     'dead_letter'].forEach((q) => injectQueue(jobsService, q));
  });

  afterEach(async () => {
    await module.close();
  });

  // ── Payouts ──────────────────────────────────────────────────────────────

  describe('payouts queue', () => {
    it('enqueues a valid PayoutProcess payload', async () => {
      await expect(
        jobsService.addJob('payouts', {
          payoutId: 'payout-1',
          organizationId: 'org-1',
          amount: 50,
          recipientAddress:
            'GDZST3XVCDTUJ76ZAV2HA72KYXM4ZCT5JBHNYX7UHZASDEFDZDCXACHL',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects a payout payload missing payoutId (fails both schemas)', async () => {
      // Neither PayoutProcessSchema (missing payoutId) nor PayoutSettleSchema
      // (also missing payoutId which is required) will accept this payload.
      await expect(
        jobsService.addJob('payouts', {
          organizationId: 'org-1',
          amount: -100,
          recipientAddress:
            'GDZST3XVCDTUJ76ZAV2HA72KYXM4ZCT5JBHNYX7UHZASDEFDZDCXACHL',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      // queue.add() must NOT have been called
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('rejects an empty payout payload', async () => {
      await expect(
        jobsService.addJob('payouts', {}),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Email ─────────────────────────────────────────────────────────────────

  describe('email queue', () => {
    it('enqueues a valid EmailSend payload', async () => {
      await expect(
        jobsService.addJob('email', {
          messageId: 'msg-1',
          recipientEmail: 'alice@example.com',
          templateId: 'welcome',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid recipient email address', async () => {
      await expect(
        jobsService.addJob('email', {
          messageId: 'msg-1',
          recipientEmail: 'not-an-email',
          templateId: 'welcome',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Exports ───────────────────────────────────────────────────────────────

  describe('exports queue', () => {
    it('enqueues a valid DataExport payload', async () => {
      await expect(
        jobsService.addJob('exports', {
          organizationId: 'org-1',
          exportType: 'quests',
          format: 'json',
          userId: 'user-1',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects an unsupported export format', async () => {
      await expect(
        jobsService.addJob('exports', {
          organizationId: 'org-1',
          exportType: 'quests',
          format: 'xml',
          userId: 'user-1',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('rejects an unsupported exportType', async () => {
      await expect(
        jobsService.addJob('exports', {
          organizationId: 'org-1',
          exportType: 'contracts',
          format: 'csv',
          userId: 'user-1',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────

  describe('cleanup queue', () => {
    it('enqueues a valid cleanup payload', async () => {
      await expect(
        jobsService.addJob('cleanup', { olderThanDays: 30 }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects a cleanup payload with zero olderThanDays', async () => {
      await expect(
        jobsService.addJob('cleanup', { olderThanDays: 0 }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Webhooks ──────────────────────────────────────────────────────────────

  describe('webhooks queue', () => {
    it('enqueues a valid webhook delivery payload', async () => {
      await expect(
        jobsService.addJob('webhooks', {
          webhookId: 'wh-1',
          event: 'payout.completed',
          payload: { id: 'p1' },
          url: 'https://example.com/hook',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects a webhook payload with an invalid URL', async () => {
      await expect(
        jobsService.addJob('webhooks', {
          webhookId: 'wh-1',
          event: 'payout.completed',
          payload: { id: 'p1' },
          url: 'not-a-url',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Analytics ─────────────────────────────────────────────────────────────

  describe('analytics queue', () => {
    it('enqueues a valid analytics aggregate payload', async () => {
      await expect(
        jobsService.addJob('analytics', {
          organizationId: 'org-1',
          aggregationType: 'hourly',
          metricsType: ['response_time'],
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects an analytics payload with an invalid aggregationType', async () => {
      await expect(
        jobsService.addJob('analytics', {
          organizationId: 'org-1',
          aggregationType: 'yearly',
          metricsType: ['errors'],
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Quests ────────────────────────────────────────────────────────────────

  describe('quests queue', () => {
    it('enqueues a valid quest deadline check payload', async () => {
      await expect(
        jobsService.addJob('quests', {
          questId: 'quest-1',
          organizationId: 'org-1',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('rejects a QuestDeadlineCheck missing required questId', async () => {
      // NOTE: The quests queue has a QuestStateReconcileSchema with all-optional
      // fields, so {organizationId: 'org-1'} is actually valid via that schema.
      // To get a full rejection, supply a value that violates every schema's
      // required fields (e.g. bad type on a numeric field is not applicable here).
      // Instead we test that an integer questId (wrong type) fails all schemas.
      await expect(
        jobsService.addJob('quests', {
          questId: 123 as any,   // number, not string → fails IsString on all
          organizationId: 'org-1',
        }),
      ).rejects.toThrow(InvalidJobPayloadException);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  // ── Notifications (passthrough) ───────────────────────────────────────────

  describe('notifications queue (no schema)', () => {
    it('enqueues any payload without validation', async () => {
      await expect(
        jobsService.addJob('notifications', {
          randomField: 42,
          anotherField: 'anything',
        }),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('enqueues an empty payload without error', async () => {
      await expect(
        jobsService.addJob('notifications', {}),
      ).resolves.toBeDefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });
  });

  // ── Unknown queue ─────────────────────────────────────────────────────────

  describe('unknown queue', () => {
    it('throws "Queue not found" for an unregistered queue name', async () => {
      await expect(
        jobsService.addJob('nonexistent-queue', { foo: 'bar' }),
      ).rejects.toThrow('Queue nonexistent-queue not found');
    });
  });

  // ── Exception shape ───────────────────────────────────────────────────────

  describe('InvalidJobPayloadException shape', () => {
    it('response body contains queue name and a non-empty errors array', async () => {
      let caught: InvalidJobPayloadException | null = null;
      try {
        await jobsService.addJob('payouts', {
          payoutId: '',          // empty – fails IsNotEmpty
          organizationId: 'o1',
          amount: -1,            // negative – fails IsPositive
          recipientAddress: 'GB',
        });
      } catch (err) {
        caught = err as InvalidJobPayloadException;
      }

      expect(caught).toBeInstanceOf(InvalidJobPayloadException);
      expect(caught!.getStatus()).toBe(422);

      const body = caught!.getResponse() as { message: string; errors: string[] };
      expect(body.message).toMatch(/payouts/);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });
  });

  // ── validator is truly the gate ───────────────────────────────────────────

  describe('validation happens BEFORE enqueueing', () => {
    it('queue.add() is never called when the payload is invalid', async () => {
      // Attempt to enqueue an invalid payload for every typed queue
      const invalidCases: Array<[string, object]> = [
        ['payouts', { organizationId: 'o1', amount: -5, recipientAddress: 'X' }],
        ['email', { messageId: 'm1', recipientEmail: 'bad', templateId: 't1' }],
        ['exports', { organizationId: 'o1', exportType: 'bad', format: 'csv', userId: 'u1' }],
        ['cleanup', { olderThanDays: 0 }],
        ['webhooks', { webhookId: 'w1', event: 'e1', payload: {}, url: 'bad-url' }],
        ['analytics', { organizationId: 'o1', aggregationType: 'bad', metricsType: ['m'] }],
        // quests: wrong type for questId → all schemas fail (QuestStateReconcile requires string)
        ['quests', { questId: 123 as any, userId: 456 as any, submissionId: 789 as any }],
      ];

      for (const [queue, payload] of invalidCases) {
        mockQueueAdd.mockClear();
        await expect(jobsService.addJob(queue, payload)).rejects.toThrow(
          InvalidJobPayloadException,
        );
        expect(mockQueueAdd).not.toHaveBeenCalled();
      }
    });
  });
});
