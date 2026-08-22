import { Test, TestingModule } from '@nestjs/testing';
import { JobIdempotencyService } from 'src/modules/jobs/services/job-idempotency.service';
import { IdempotencyService } from 'src/modules/payouts/services/idempotency.service';
import { JobType } from 'src/modules/jobs/job.types';

describe('JobIdempotencyService', () => {
  let service: JobIdempotencyService;
  let idempotencyService: jest.Mocked<IdempotencyService>;

  beforeEach(async () => {
    const mockIdempotencyService: jest.Mocked<
      Pick<
        IdempotencyService,
        | 'findByKey'
        | 'computeFingerprint'
        | 'tryAcquire'
        | 'complete'
        | 'remove'
      >
    > = {
      findByKey: jest.fn(),
      computeFingerprint: jest.fn().mockReturnValue('fingerprint-abc'),
      tryAcquire: jest.fn(),
      complete: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobIdempotencyService,
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
      ],
    }).compile();

    service = module.get<JobIdempotencyService>(JobIdempotencyService);
    idempotencyService = module.get(IdempotencyService);
  });

  // ── buildPayoutJobKey ────────────────────────────────────────────────────

  describe('buildPayoutJobKey', () => {
    it('should build the canonical key for a payout job', () => {
      const key = service.buildPayoutJobKey(
        'payout-uuid-123',
        JobType.PAYOUT_PROCESS,
      );
      expect(key).toBe('payout-job:payout-uuid-123:payout:process');
    });

    it('should build different keys for different job types', () => {
      const processKey = service.buildPayoutJobKey(
        'id',
        JobType.PAYOUT_PROCESS,
      );
      const settleKey = service.buildPayoutJobKey('id', JobType.PAYOUT_SETTLE);
      expect(processKey).not.toEqual(settleKey);
    });

    it('should build different keys for different payoutIds', () => {
      const key1 = service.buildPayoutJobKey(
        'payout-1',
        JobType.PAYOUT_PROCESS,
      );
      const key2 = service.buildPayoutJobKey(
        'payout-2',
        JobType.PAYOUT_PROCESS,
      );
      expect(key1).not.toEqual(key2);
    });
  });

  // ── checkAndLock — fresh job ──────────────────────────────────────────────

  describe('checkAndLock — fresh job', () => {
    it('should acquire lock and return alreadyProcessed=false, locked=false when no record exists', async () => {
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({ acquired: true });

      const result = await service.checkAndLock('some-key');

      expect(result.alreadyProcessed).toBe(false);
      expect(result.locked).toBe(false);
      expect(idempotencyService.tryAcquire).toHaveBeenCalledWith(
        'some-key',
        'fingerprint-abc',
        'JOB',
        'some-key',
        '',
      );
    });
  });

  // ── checkAndLock — already completed ────────────────────────────────────

  describe('checkAndLock — already completed', () => {
    it('should return alreadyProcessed=true with cached result when record has completedAt', async () => {
      const cachedResult = {
        success: true,
        data: { transactionHash: 'tx_abc' },
      };
      idempotencyService.findByKey.mockResolvedValue({
        id: 'rec-1',
        key: 'some-key',
        completedAt: new Date(),
        locked: false,
        responseBody: cachedResult,
      } as any);

      const result = await service.checkAndLock('some-key');

      expect(result.alreadyProcessed).toBe(true);
      expect(result.locked).toBe(false);
      expect(result.result).toEqual(cachedResult);
      // Should not attempt to acquire the lock
      expect(idempotencyService.tryAcquire).not.toHaveBeenCalled();
    });
  });

  // ── checkAndLock — in-flight (locked) ───────────────────────────────────

  describe('checkAndLock — in-flight (locked)', () => {
    it('should return locked=true when existing record is locked and has no completedAt', async () => {
      idempotencyService.findByKey.mockResolvedValue({
        id: 'rec-2',
        key: 'some-key',
        completedAt: null,
        locked: true,
        responseBody: null,
      } as any);

      const result = await service.checkAndLock('some-key');

      expect(result.alreadyProcessed).toBe(false);
      expect(result.locked).toBe(true);
      expect(idempotencyService.tryAcquire).not.toHaveBeenCalled();
    });
  });

  // ── checkAndLock — race condition (tryAcquire fails) ─────────────────────

  describe('checkAndLock — race condition', () => {
    it('should return locked=true when tryAcquire is not acquired and existing record is locked', async () => {
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({
        acquired: false,
        existing: {
          key: 'some-key',
          fingerprint: 'fp',
          locked: true,
          completedAt: null,
          responseBody: null,
          responseStatusCode: null,
        },
      });

      const result = await service.checkAndLock('some-key');

      expect(result.alreadyProcessed).toBe(false);
      expect(result.locked).toBe(true);
    });

    it('should return alreadyProcessed=true when tryAcquire fails and existing record is completed', async () => {
      const cachedResult = { success: true };
      idempotencyService.findByKey.mockResolvedValue(null);
      idempotencyService.tryAcquire.mockResolvedValue({
        acquired: false,
        existing: {
          key: 'some-key',
          fingerprint: 'fp',
          locked: false,
          completedAt: new Date(),
          responseBody: cachedResult,
          responseStatusCode: 200,
        },
      });

      const result = await service.checkAndLock('some-key');

      expect(result.alreadyProcessed).toBe(true);
      expect(result.result).toEqual(cachedResult);
    });
  });

  // ── complete ────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('should call idempotencyService.complete with status 200 and the result', async () => {
      idempotencyService.complete.mockResolvedValue(undefined);
      const result = { success: true, data: { payoutId: 'p-1' } };

      await service.complete('some-key', result as any);

      expect(idempotencyService.complete).toHaveBeenCalledWith(
        'some-key',
        200,
        result,
      );
    });
  });

  // ── release ────────────────────────────────────────────────────────────

  describe('release', () => {
    it('should call idempotencyService.remove with the key', async () => {
      idempotencyService.remove.mockResolvedValue(undefined);

      await service.release('some-key');

      expect(idempotencyService.remove).toHaveBeenCalledWith('some-key');
    });
  });
});
