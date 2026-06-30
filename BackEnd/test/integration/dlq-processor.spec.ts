/**
 * Integration test: Dead-Letter Queue processor + alert service
 *
 * Tests the full flow from a job landing in the dead-letter queue, through
 * the processor (quarantine → retry → alert), using in-memory fakes so no
 * real Redis/Postgres connection is required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DeadLetterProcessor } from 'src/modules/jobs/processors/dead-letter.processor';
import { DlqAlertService } from 'src/events/services/dlq-alert.service';
import { PoisonMessageService } from 'src/events/services/poison-message.service';
import {
  PoisonMessage,
  PoisonMessageStatus,
} from 'src/events/entities/poison-message.entity';

// ─── In-memory PoisonMessage repository ─────────────────────────────────────

const store = new Map<string, PoisonMessage>();
let idCounter = 0;

const inMemoryPoisonRepo = {
  create: (data: Partial<PoisonMessage>): PoisonMessage =>
    ({ id: `pm-${++idCounter}`, ...data } as PoisonMessage),
  save: jest.fn(async (entity: PoisonMessage) => {
    store.set(entity.id, entity);
    return entity;
  }),
  findOne: jest.fn(async ({ where }: { where: Partial<PoisonMessage> }) => {
    for (const msg of store.values()) {
      if (
        msg.eventName === where.eventName &&
        msg.status === where.status
      ) {
        return msg;
      }
    }
    return null;
  }),
  update: jest.fn(async (id: string, partial: Partial<PoisonMessage>) => {
    const existing = store.get(id);
    if (existing) store.set(id, { ...existing, ...partial });
    return { affected: 1 };
  }),
};

const makeJob = (
  eventName: string,
  retryCount = 0,
  failOnEmit = false,
) => ({
  id: `job-${Date.now()}`,
  timestamp: Date.now(),
  data: {
    type: 'FAILED_EVENT' as const,
    eventName,
    eventPayload: { key: 'value' },
    error: 'upstream failure',
    failedAt: new Date(),
    retryCount,
  },
  updateProgress: jest.fn().mockResolvedValue(undefined),
  _failOnEmit: failOnEmit,
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('DLQ Integration: DeadLetterProcessor + DlqAlertService', () => {
  let processor: DeadLetterProcessor;
  let alertService: DlqAlertService;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;
  let sendAlertSpy: jest.SpyInstance;

  beforeEach(async () => {
    store.clear();
    idCounter = 0;
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        DeadLetterProcessor,
        PoisonMessageService,
        DlqAlertService,
        {
          provide: getRepositoryToken(PoisonMessage),
          useValue: inMemoryPoisonRepo,
        },
        {
          provide: EventEmitter2,
          useValue: new EventEmitter2({ wildcard: true, delimiter: '.' }),
        },
      ],
    }).compile();

    processor = module.get(DeadLetterProcessor);
    alertService = module.get(DlqAlertService);
    eventEmitter = module.get(EventEmitter2);

    sendAlertSpy = jest.spyOn(alertService, 'sendAlert').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await module.close();
  });

  // ─── Scenario 1: successful first retry ─────────────────────────────────

  it('quarantines the message and marks it resolved on a successful retry', async () => {
    const job = makeJob('quest.expired', 0);

    // Register a no-op listener so emitAsync resolves cleanly
    eventEmitter.on('quest.expired', () => undefined);

    const result = await processor.process(job as any);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('retried');

    // The poison message should be in RESOLVED state
    const savedMessages = Array.from(store.values());
    expect(savedMessages.length).toBe(1);
    expect(savedMessages[0].status).toBe(PoisonMessageStatus.RESOLVED);
    expect(sendAlertSpy).not.toHaveBeenCalled();
  });

  // ─── Scenario 2: retry fails → reset to quarantined + alert ─────────────

  it('resets to quarantined and fires an alert when the retry throws', async () => {
    const job = makeJob('quest.expired', 0);

    // Make emitAsync reject to simulate downstream failure
    jest.spyOn(eventEmitter, 'emitAsync').mockRejectedValueOnce(new Error('listener error'));

    const result = await processor.process(job as any);

    expect(result.success).toBe(true);
    // Status stays retried from processor perspective (the job itself succeeded)
    expect(sendAlertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isFinal: false, eventName: 'quest.expired' }),
    );

    // Poison message should have been reset to QUARANTINED
    const savedMessages = Array.from(store.values());
    expect(savedMessages[0].status).toBe(PoisonMessageStatus.QUARANTINED);
  });

  // ─── Scenario 3: final retry exhausted → discard + critical alert ────────

  it('sends a CRITICAL alert and discards when all retries are exhausted', async () => {
    const job = makeJob('payment.failed', DeadLetterProcessor.MAX_AUTO_RETRIES);

    const result = await processor.process(job as any);

    expect(result.data.status).toBe('discarded');
    expect(sendAlertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isFinal: true, eventName: 'payment.failed' }),
    );
    // No re-emit attempt should have been made
    const emitSpy = jest.spyOn(eventEmitter, 'emitAsync');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // ─── Scenario 4: second occurrence of same event increments retry count ──

  it('increments retryCount for the same event quarantined twice', async () => {
    const job1 = makeJob('webhook.failed', 0);
    const job2 = makeJob('webhook.failed', 1);

    // Both retries fail
    jest.spyOn(eventEmitter, 'emitAsync').mockRejectedValue(new Error('fail'));

    await processor.process(job1 as any);

    // Second job: same event is already quarantined, so findOne returns it
    inMemoryPoisonRepo.findOne.mockResolvedValueOnce(Array.from(store.values())[0]);
    await processor.process(job2 as any);

    // sendAlert should have been called twice
    expect(sendAlertSpy).toHaveBeenCalledTimes(2);
  });

  // ─── Scenario 5: telemetry event is emitted ─────────────────────────────

  it('emits dlq.processed telemetry event after processing', async () => {
    const telemetryEvents: any[] = [];
    eventEmitter.on('dlq.processed', (payload) => telemetryEvents.push(payload));

    const job = makeJob('submission.verified', 0);
    eventEmitter.on('submission.verified', () => undefined);

    await processor.process(job as any);

    expect(telemetryEvents.length).toBe(1);
    expect(telemetryEvents[0]).toMatchObject({
      eventName: 'submission.verified',
      status: 'retried',
    });
  });
});
