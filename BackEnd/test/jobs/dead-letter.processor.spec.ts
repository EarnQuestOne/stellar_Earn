import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeadLetterProcessor, DeadLetterJobData } from 'src/modules/jobs/processors/dead-letter.processor';
import { PoisonMessageService } from 'src/events/services/poison-message.service';
import { DlqAlertService } from 'src/events/services/dlq-alert.service';
import { PoisonMessageStatus } from 'src/events/entities/poison-message.entity';
import { Job } from 'bullmq';

const makePoisonMessage = (overrides: Partial<any> = {}) => ({
  id: 'pm-123',
  eventName: 'test.event',
  payload: {},
  metadata: null,
  lastError: 'some error',
  retryCount: 0,
  maxRetries: 3,
  status: PoisonMessageStatus.QUARANTINED,
  errorHistory: [],
  resolvedAt: undefined,
  quarantinedAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeJob = (data: Partial<DeadLetterJobData> = {}): Partial<Job<DeadLetterJobData>> => ({
  id: 'job-001',
  timestamp: Date.now(),
  data: {
    type: 'FAILED_EVENT',
    eventName: 'test.event',
    eventPayload: { foo: 'bar' },
    error: 'original error',
    failedAt: new Date(),
    retryCount: 0,
    ...data,
  } as DeadLetterJobData,
  updateProgress: jest.fn().mockResolvedValue(undefined),
});

describe('DeadLetterProcessor', () => {
  let processor: DeadLetterProcessor;
  let poisonMessageService: jest.Mocked<PoisonMessageService>;
  let dlqAlertService: jest.Mocked<DlqAlertService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadLetterProcessor,
        {
          provide: PoisonMessageService,
          useValue: {
            quarantine: jest.fn().mockResolvedValue(makePoisonMessage()),
            markRetrying: jest.fn().mockResolvedValue(undefined),
            markResolved: jest.fn().mockResolvedValue(undefined),
            resetToQuarantined: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DlqAlertService,
          useValue: {
            sendAlert: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emitAsync: jest.fn().mockResolvedValue([]),
            emit: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    processor = module.get<DeadLetterProcessor>(DeadLetterProcessor);
    poisonMessageService = module.get(PoisonMessageService);
    dlqAlertService = module.get(DlqAlertService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('process()', () => {
    it('should quarantine the message on every call', async () => {
      const job = makeJob();
      await processor.process(job as Job<DeadLetterJobData>);
      expect(poisonMessageService.quarantine).toHaveBeenCalledWith(
        'test.event',
        { foo: 'bar' },
        'original error',
        expect.objectContaining({ dlqJobId: 'job-001' }),
        DeadLetterProcessor.MAX_AUTO_RETRIES,
      );
    });

    it('should re-emit the event and mark resolved when retries remain', async () => {
      const job = makeJob({ retryCount: 0 });
      const result = await processor.process(job as Job<DeadLetterJobData>);

      expect(poisonMessageService.markRetrying).toHaveBeenCalledWith('pm-123');
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'test.event',
        expect.objectContaining({
          foo: 'bar',
          _dlq: expect.objectContaining({ retryCount: 1 }),
        }),
      );
      expect(poisonMessageService.markResolved).toHaveBeenCalledWith('pm-123');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('retried');
    });

    it('should NOT re-emit when retry count equals MAX_AUTO_RETRIES', async () => {
      const job = makeJob({ retryCount: DeadLetterProcessor.MAX_AUTO_RETRIES });
      const result = await processor.process(job as Job<DeadLetterJobData>);

      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(dlqAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({ isFinal: true }),
      );
      expect(result.data.status).toBe('discarded');
    });

    it('should send a final alert when retry fails and it is the last attempt', async () => {
      eventEmitter.emitAsync.mockRejectedValueOnce(new Error('downstream fail'));
      const job = makeJob({ retryCount: DeadLetterProcessor.MAX_AUTO_RETRIES - 1 });

      await processor.process(job as Job<DeadLetterJobData>);

      expect(poisonMessageService.resetToQuarantined).toHaveBeenCalledWith('pm-123');
      expect(dlqAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({ isFinal: true }),
      );
    });

    it('should send a non-final alert on intermediate retry failures', async () => {
      eventEmitter.emitAsync.mockRejectedValueOnce(new Error('transient fail'));
      const job = makeJob({ retryCount: 0 });

      await processor.process(job as Job<DeadLetterJobData>);

      expect(dlqAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({ isFinal: false }),
      );
    });

    it('should emit dlq.processed telemetry event', async () => {
      const job = makeJob();
      await processor.process(job as Job<DeadLetterJobData>);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dlq.processed',
        expect.objectContaining({ eventName: 'test.event' }),
      );
    });

    it('should handle job with failedJob data structure', async () => {
      // Build a job where the error originates solely from failedJob.failedReason
      // (no top-level `error` field) so the processor falls back correctly.
      const rawJob: Partial<Job<DeadLetterJobData>> = {
        id: 'job-001',
        timestamp: Date.now(),
        data: {
          type: 'FAILED_JOB',
          failedAt: new Date(),
          retryCount: 0,
          failedJob: {
            id: 'original-job-99',
            name: 'payout:process',
            data: { payoutId: 'p-1' },
            failedReason: 'timeout',
          },
        } as unknown as DeadLetterJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      };

      await processor.process(rawJob as Job<DeadLetterJobData>);

      expect(poisonMessageService.quarantine).toHaveBeenCalledWith(
        'payout:process',
        { payoutId: 'p-1' },
        'timeout',
        expect.any(Object),
        DeadLetterProcessor.MAX_AUTO_RETRIES,
      );
    });

    it('should update progress through lifecycle', async () => {
      const job = makeJob();
      await processor.process(job as Job<DeadLetterJobData>);

      const progressCalls = (job.updateProgress as jest.Mock).mock.calls.map(
        ([p]: [number]) => p,
      );
      expect(progressCalls).toContain(10);
      expect(progressCalls).toContain(100);
    });
  });
});
