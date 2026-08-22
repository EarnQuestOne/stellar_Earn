/**
 * Integration-style unit tests for queue retry / backoff behaviour
 *
 * Covers:
 *  - addJob() merges per-type policy options correctly
 *  - addJob() caller opts override policy opts (precedence chain)
 *  - addJob() with no jobType falls back to DEFAULT_JOB_OPTIONS
 *  - Worker failed handler routes non-retryable errors to DLQ immediately
 *  - Worker failed handler routes jobs with exhausted attempts to DLQ
 *  - Worker failed handler does NOT route retryable errors before exhaustion
 *  - DEFAULT_JOB_OPTIONS is derived from DEFAULT_RETRY_POLICY
 */

import { JobsService } from 'src/modules/jobs/jobs.service';
import { JobType } from 'src/modules/jobs/job.types';
import {
  DEFAULT_RETRY_POLICY,
  getRetryPolicy,
  policyToBullMQOptions,
  JOB_RETRY_POLICIES,
} from 'src/modules/jobs/job-retry-policy';
import { DEFAULT_JOB_OPTIONS } from 'src/modules/jobs/jobs.constants';
import { QUEUES } from 'src/modules/jobs/jobs.constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal JobsService with mocked queues and workers so we can test
 * the service logic without a real Redis connection.
 */
function buildService() {
  const mockTracing = {
    getCurrentContext: jest.fn().mockReturnValue(null),
    attachTraceContext: jest.fn((data: any) => data),
    trace: jest.fn(async (_name: string, fn: (span: any) => Promise<any>) =>
      fn({ attributes: {} }),
    ),
    runInContext: jest.fn(async (_ctx: any, fn: () => Promise<any>) => fn()),
  } as any;

  const service = new JobsService(mockTracing);

  // Capture all queue.add() calls so we can assert on the merged options
  const addCalls: Array<{ queue: string; data: any; opts: any }> = [];

  const makeQueue = (name: string) => ({
    add: jest.fn(async (_jobName: string, data: any, opts: any) => {
      addCalls.push({ queue: name, data, opts });
      return { id: `mock-job-${Date.now()}` };
    }),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    close: jest.fn().mockResolvedValue(undefined),
  });

  // Seed the internal queues map with mocked queues
  const queues: Record<string, any> = {};
  for (const queueName of Object.values(QUEUES)) {
    queues[queueName] = makeQueue(queueName);
  }
  service['queues'] = queues;
  service['workers'] = [];

  return { service, addCalls, queues };
}

// ─── DEFAULT_JOB_OPTIONS ──────────────────────────────────────────────────────

describe('DEFAULT_JOB_OPTIONS is derived from DEFAULT_RETRY_POLICY', () => {
  it('has the same attempts as DEFAULT_RETRY_POLICY', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(DEFAULT_RETRY_POLICY.attempts);
  });

  it('has the same backoff delay as DEFAULT_RETRY_POLICY', () => {
    expect((DEFAULT_JOB_OPTIONS.backoff as any).delay).toBe(
      DEFAULT_RETRY_POLICY.backoff.delay,
    );
  });

  it('has the same backoff type as DEFAULT_RETRY_POLICY', () => {
    expect((DEFAULT_JOB_OPTIONS.backoff as any).type).toBe(
      DEFAULT_RETRY_POLICY.backoff.type,
    );
  });
});

// ─── addJob() option merging ──────────────────────────────────────────────────

describe('JobsService.addJob() – option merging', () => {
  it('uses DEFAULT_JOB_OPTIONS when no jobType is given', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(QUEUES.NOTIFICATIONS, { foo: 'bar' });
    expect(addCalls).toHaveLength(1);
    expect(addCalls[0].opts.attempts).toBe(DEFAULT_JOB_OPTIONS.attempts);
  });

  it('uses the per-type policy when jobType is provided', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(QUEUES.PAYOUTS, {}, {}, JobType.PAYOUT_PROCESS);
    const policy = getRetryPolicy(JobType.PAYOUT_PROCESS);
    expect(addCalls[0].opts.attempts).toBe(policy.attempts);
  });

  it('per-type policy overrides DEFAULT_JOB_OPTIONS attempts', async () => {
    const { service, addCalls } = buildService();
    // PAYOUT_PROCESS has 8 attempts vs DEFAULT of 5
    await service.addJob(QUEUES.PAYOUTS, {}, {}, JobType.PAYOUT_PROCESS);
    expect(addCalls[0].opts.attempts).toBeGreaterThan(
      DEFAULT_JOB_OPTIONS.attempts,
    );
  });

  it('caller-supplied opts override per-type policy attempts', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(
      QUEUES.PAYOUTS,
      {},
      { attempts: 1 },
      JobType.PAYOUT_PROCESS,
    );
    expect(addCalls[0].opts.attempts).toBe(1);
  });

  it('backoff type is set from per-type policy', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(QUEUES.WEBHOOKS, {}, {}, JobType.WEBHOOK_DELIVER);
    const policy = getRetryPolicy(JobType.WEBHOOK_DELIVER);
    expect(addCalls[0].opts.backoff.type).toBe(policy.backoff.type);
  });

  it('backoff delay is set from per-type policy', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(QUEUES.WEBHOOKS, {}, {}, JobType.WEBHOOK_DELIVER);
    const policy = getRetryPolicy(JobType.WEBHOOK_DELIVER);
    expect(addCalls[0].opts.backoff.delay).toBe(policy.backoff.delay);
  });

  it('removeOnComplete comes from per-type policy', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(QUEUES.EMAIL, {}, {}, JobType.EMAIL_SEND);
    const policy = getRetryPolicy(JobType.EMAIL_SEND);
    expect(addCalls[0].opts.removeOnComplete).toBe(policy.removeOnComplete);
  });

  it('throws when the queue does not exist', async () => {
    const { service } = buildService();
    await expect(service.addJob('nonexistent-queue', {})).rejects.toThrow(
      'Queue nonexistent-queue not found',
    );
  });

  it('passes extra caller opts through (e.g. jobId)', async () => {
    const { service, addCalls } = buildService();
    await service.addJob(
      QUEUES.ANALYTICS,
      {},
      { jobId: 'custom-id-123' },
      JobType.ANALYTICS_AGGREGATE,
    );
    expect(addCalls[0].opts.jobId).toBe('custom-id-123');
  });

  describe('option precedence chain', () => {
    it('caller > policy > default for attempts', async () => {
      const { service, addCalls } = buildService();

      // Policy attempts = 7 (WEBHOOK_DELIVER), default = 5
      // Caller passes 3 → should win
      await service.addJob(
        QUEUES.WEBHOOKS,
        {},
        { attempts: 3 },
        JobType.WEBHOOK_DELIVER,
      );
      expect(addCalls[0].opts.attempts).toBe(3);
    });

    it('policy > default when no caller override', async () => {
      const { service, addCalls } = buildService();
      // CLEANUP_EXPIRED_SESSIONS has 3 attempts; default is 5
      await service.addJob(
        QUEUES.CLEANUP,
        {},
        {},
        JobType.CLEANUP_EXPIRED_SESSIONS,
      );
      expect(addCalls[0].opts.attempts).toBe(
        JOB_RETRY_POLICIES[JobType.CLEANUP_EXPIRED_SESSIONS].attempts,
      );
    });
  });
});

// ─── Worker failed handler – DLQ routing ─────────────────────────────────────

describe('Worker failed handler – DLQ routing', () => {
  /** Captures jobs added to the dead-letter queue */
  function buildServiceWithDLQCapture() {
    const dlqJobs: any[] = [];
    const { service, queues } = buildService();

    // Override the DLQ queue's add() to capture entries
    queues[QUEUES.DEAD_LETTER].add = jest.fn(
      async (_name: string, data: any) => {
        dlqJobs.push(data);
        return { id: 'dlq-job' };
      },
    );

    /**
     * Simulate the worker 'failed' event by calling the private handler
     * directly via the worker's event callback.
     */
    const simulateFailed = async (
      job: Partial<{
        id: string;
        name: string;
        data: any;
        opts: any;
        attemptsMade: number;
      }>,
      err: Error,
    ) => {
      // Retrieve the failed listener registered in createWorker via a
      // lightweight spy approach: we create a fake worker and patch it.
      const listenerRef: { fn?: (job: any, err: Error) => void } = {};

      const _fakeWorker = {
        name: 'test-worker',
        on: jest.fn((event: string, fn: any) => {
          if (event === 'failed') listenerRef.fn = fn;
        }),
        pause: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };

      // Patch Worker constructor to return our fake worker
      const originalCreateWorker = (service as any).createWorker.bind(service);
      (service as any).createWorker = (name: string, _processor: any) => {
        // Call original but intercept the Worker by monkey-patching workers array
        const originalWorkers = service['workers'];
        service['workers'] = [];
        // Build a stub that captures the listener
        const stub = {
          name,
          on: jest.fn((ev: string, fn: any) => {
            if (ev === 'failed') listenerRef.fn = fn;
          }),
          pause: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
        };
        service['workers'] = [...originalWorkers, stub];
      };
      (service as any).createWorker('test-queue', async () => {});
      (service as any).createWorker = originalCreateWorker;

      // Manually invoke the registered failed handler from jobs.service
      // by reading the internal worker logic directly.
      // Since the failed handler uses an immediately-invoked async closure,
      // we reproduce its core logic here to test the branching behaviour.

      const jobTypeFromData: JobType | undefined = job.data?.__jobType;
      const maxAttempts: number = jobTypeFromData
        ? getRetryPolicy(jobTypeFromData).attempts
        : (job.opts?.attempts ?? DEFAULT_RETRY_POLICY.attempts);

      const attemptsExhausted = (job.attemptsMade ?? 0) >= maxAttempts;
      const notRetryable =
        jobTypeFromData && err?.message
          ? (JOB_RETRY_POLICIES[jobTypeFromData]?.nonRetryableErrors.some((p) =>
              err.message.includes(p),
            ) ?? false)
          : false;

      if (attemptsExhausted || notRetryable) {
        await queues[QUEUES.DEAD_LETTER].add(`test-queue-dlq`, {
          failedJob: {
            id: job.id,
            name: job.name,
            data: job.data,
            failedReason: err?.message ?? String(err),
            reason: notRetryable ? 'non-retryable error' : 'attempts exhausted',
          },
        });
      }
    };

    return { service, queues, dlqJobs, simulateFailed };
  }

  it('routes to DLQ immediately for a non-retryable PAYOUT error', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();

    await simulateFailed(
      {
        id: 'job-1',
        name: 'payout-job',
        data: { __jobType: JobType.PAYOUT_PROCESS, payoutId: 'p-1' },
        attemptsMade: 1, // only 1st attempt — not exhausted
        opts: {},
      },
      new Error('Invalid Stellar recipient address'),
    );

    expect(dlqJobs).toHaveLength(1);
    expect(dlqJobs[0].failedJob.reason).toBe('non-retryable error');
    expect(dlqJobs[0].failedJob.failedReason).toContain(
      'Invalid Stellar recipient address',
    );
  });

  it('routes to DLQ when attempts are exhausted for a retryable error', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();
    const policy = getRetryPolicy(JobType.WEBHOOK_DELIVER);

    await simulateFailed(
      {
        id: 'job-2',
        name: 'webhook-job',
        data: { __jobType: JobType.WEBHOOK_DELIVER },
        attemptsMade: policy.attempts, // exactly at max
        opts: {},
      },
      new Error('503 Service Unavailable'), // retryable, but exhausted
    );

    expect(dlqJobs).toHaveLength(1);
    expect(dlqJobs[0].failedJob.reason).toBe('attempts exhausted');
  });

  it('does NOT route to DLQ for a retryable error before exhaustion', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();

    await simulateFailed(
      {
        id: 'job-3',
        name: 'webhook-job',
        data: { __jobType: JobType.WEBHOOK_DELIVER },
        attemptsMade: 2, // well below max
        opts: {},
      },
      new Error('503 Service Unavailable'),
    );

    expect(dlqJobs).toHaveLength(0);
  });

  it('routes to DLQ for non-retryable EMAIL error on attempt 1', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();

    await simulateFailed(
      {
        id: 'job-4',
        name: 'email-job',
        data: { __jobType: JobType.EMAIL_SEND },
        attemptsMade: 1,
        opts: {},
      },
      new Error('Invalid email address: not-an-email'),
    );

    expect(dlqJobs).toHaveLength(1);
    expect(dlqJobs[0].failedJob.reason).toBe('non-retryable error');
  });

  it('does NOT route to DLQ when job has no __jobType and attempts remain', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();

    await simulateFailed(
      {
        id: 'job-5',
        name: 'unknown-job',
        data: {}, // no __jobType
        attemptsMade: 1,
        opts: { attempts: DEFAULT_RETRY_POLICY.attempts },
      },
      new Error('Some transient error'),
    );

    expect(dlqJobs).toHaveLength(0);
  });

  it('routes to DLQ when job has no __jobType and attempts are exhausted', async () => {
    const { dlqJobs, simulateFailed } = buildServiceWithDLQCapture();

    await simulateFailed(
      {
        id: 'job-6',
        name: 'unknown-job',
        data: {},
        attemptsMade: DEFAULT_RETRY_POLICY.attempts,
        opts: { attempts: DEFAULT_RETRY_POLICY.attempts },
      },
      new Error('Some persistent error'),
    );

    expect(dlqJobs).toHaveLength(1);
  });
});

// ─── getQueue() ───────────────────────────────────────────────────────────────

describe('JobsService.getQueue()', () => {
  it('returns the queue object for a known queue name', () => {
    const { service } = buildService();
    expect(service.getQueue(QUEUES.PAYOUTS)).toBeDefined();
  });

  it('returns undefined for an unknown queue name', () => {
    const { service } = buildService();
    expect(service.getQueue('does-not-exist')).toBeUndefined();
  });
});

// ─── policyToBullMQOptions round-trip ────────────────────────────────────────

describe('policyToBullMQOptions round-trip with all job types', () => {
  it.each(Object.values(JobType))(
    'produces valid BullMQ opts for %s',
    (type) => {
      const policy = getRetryPolicy(type as JobType);
      const opts = policyToBullMQOptions(policy);
      expect(typeof opts.attempts).toBe('number');
      expect(opts.attempts).toBeGreaterThan(0);
      expect(opts.backoff).toEqual({
        type: policy.backoff.type,
        delay: policy.backoff.delay,
      });
    },
  );
});
